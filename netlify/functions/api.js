// Netlify Serverless Function for Temporary Email Provider Gateway & Custom Domain Ingestion
import { getStore } from '@netlify/blobs';
import PostalMime from 'postal-mime';

const MAILTM_BASE_URL = process.env.MAILTM_BASE_URL || 'https://api.mail.tm';
const CUSTOM_DOMAIN = 'itcareerpoint.in';

// In-memory fallback message cache (used if Netlify Blobs is not configured in local dev)
const inMemoryStore = new Map();

// Helper to get or fallback to in-memory store
function getEmailStore() {
  try {
    return getStore('temp_emails');
  } catch (e) {
    return null;
  }
}

// Simple in-memory rate limiter per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function isRateLimited(clientIp) {
  if (!clientIp) return false;
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(clientIp, entry);
    return false;
  }

  entry.count += 1;
  rateLimitMap.set(clientIp, entry);
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-token',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  let subPath = event.path;
  subPath = subPath.replace(/^\/\.netlify\/functions\/api/, '');
  subPath = subPath.replace(/^\/api/, '');
  if (!subPath || subPath === '') subPath = '/';

  // 1. Health check
  if (subPath === '/health') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        status: 'healthy',
        provider: 'mail.tm + custom-domain',
        customDomain: CUSTOM_DOMAIN,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  // 2. Incoming Email Webhook (triggered by Cloudflare Email Worker, ImprovMX, or ForwardEmail)
  if (subPath === '/webhook/email' && event.httpMethod === 'POST') {
    try {
      let emailData = {};

      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

      if (contentType.includes('application/json')) {
        emailData = JSON.parse(event.body || '{}');
      } else {
        // Parse raw RFC822 MIME stream
        const parser = new PostalMime();
        const parsed = await parser.parse(event.body || '');
        emailData = {
          to: parsed.to?.[0]?.address || '',
          from: {
            address: parsed.from?.address || 'unknown@sender.com',
            name: parsed.from?.name || parsed.from?.address?.split('@')[0] || 'Sender',
          },
          subject: parsed.subject || '(No Subject)',
          text: parsed.text || '',
          html: parsed.html || '',
          attachments: (parsed.attachments || []).map((att) => ({
            id: Math.random().toString(36).substring(2, 9),
            filename: att.filename || 'attachment',
            contentType: att.mimeType || 'application/octet-stream',
            size: att.content ? att.content.byteLength : 0,
          })),
        };
      }

      const toAddress = (emailData.to || '').toLowerCase().trim();
      if (!toAddress) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Missing recipient "to" address.' }),
        };
      }

      let cleanText = emailData.text || '';
      let cleanHtml = emailData.html || '';
      let cleanSubject = emailData.subject || '(No Subject)';
      let cleanFrom = typeof emailData.from === 'object' ? emailData.from : { address: emailData.from || 'sender@example.com', name: 'Sender' };

      // If text contains raw MIME / RFC822 headers, parse with PostalMime to extract clean body
      if (cleanText.includes('Received:') || cleanText.includes('ARC-') || cleanText.includes('Content-Type:')) {
        try {
          const parser = new PostalMime();
          const parsed = await parser.parse(cleanText);
          cleanText = parsed.text || cleanText;
          cleanHtml = parsed.html || cleanHtml;
          if (parsed.subject && parsed.subject.trim()) {
            cleanSubject = parsed.subject.trim();
          }
          if (parsed.from && parsed.from.address) {
            cleanFrom = {
              address: parsed.from.address,
              name: parsed.from.name || parsed.from.address.split('@')[0],
            };
          }
        } catch (parseErr) {
          console.warn('PostalMime webhook fallback parse error:', parseErr);
        }
      }

      if (!cleanSubject || cleanSubject === '-' || cleanSubject.startsWith('To:')) {
        cleanSubject = '(No Subject)';
      }

      const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const newMsg = {
        id: messageId,
        msgid: messageId,
        to: [{ address: toAddress }],
        from: cleanFrom,
        subject: cleanSubject,
        intro: (cleanText || '').replace(/\s+/g, ' ').trim().substring(0, 100) || '(No preview)',
        text: cleanText,
        html: cleanHtml,
        seen: false,
        hasAttachments: Boolean(emailData.attachments && emailData.attachments.length > 0),
        attachments: emailData.attachments || [],
        createdAt: new Date().toISOString(),
      };

      // Store message in Netlify Blobs or fallback to in-memory map
      const blobStore = getEmailStore();
      const storeKey = `inbox:${toAddress}`;

      let currentMessages = [];
      if (blobStore) {
        try {
          currentMessages = (await blobStore.get(storeKey, { type: 'json' })) || [];
        } catch {
          currentMessages = [];
        }
      } else {
        currentMessages = inMemoryStore.get(storeKey) || [];
      }

      // Prepend newest message (keep up to 30)
      currentMessages = [newMsg, ...currentMessages].slice(0, 30);

      if (blobStore) {
        try {
          await blobStore.setJSON(storeKey, currentMessages);
        } catch (e) {
          console.warn('Failed to set in blobStore, using inMemoryStore', e);
          inMemoryStore.set(storeKey, currentMessages);
        }
      } else {
        inMemoryStore.set(storeKey, currentMessages);
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          messageId,
          receivedFor: toAddress,
        }),
      };
    } catch (err) {
      console.error('Webhook ingestion error:', err);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Webhook processing failed', details: err.message }),
      };
    }
  }

  // 3. Custom Domain Message Polling endpoint
  if (subPath.startsWith('/custom/messages') && event.httpMethod === 'GET') {
    const address = (event.queryStringParameters?.address || '').toLowerCase().trim();
    if (!address) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'address query parameter required.' }),
      };
    }

    const storeKey = `inbox:${address}`;
    let list = [];
    const blobStore = getEmailStore();

    if (blobStore) {
      try {
        list = (await blobStore.get(storeKey, { type: 'json' })) || [];
      } catch {
        list = inMemoryStore.get(storeKey) || [];
      }
    } else {
      list = inMemoryStore.get(storeKey) || [];
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        messages: list,
        total: list.length,
      }),
    };
  }

  // 4. Custom Domain Message Detail
  if (subPath.startsWith('/custom/message/') && event.httpMethod === 'GET') {
    const msgId = subPath.replace('/custom/message/', '');
    const address = (event.queryStringParameters?.address || '').toLowerCase().trim();
    const storeKey = `inbox:${address}`;

    let list = [];
    const blobStore = getEmailStore();
    if (blobStore) {
      try {
        list = (await blobStore.get(storeKey, { type: 'json' })) || [];
      } catch {
        list = inMemoryStore.get(storeKey) || [];
      }
    } else {
      list = inMemoryStore.get(storeKey) || [];
    }

    const found = list.find((m) => m.id === msgId);
    if (!found) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Message not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(found),
    };
  }

  // 5. Custom Domain Message Delete
  if (subPath.startsWith('/custom/message/') && event.httpMethod === 'DELETE') {
    const msgId = subPath.replace('/custom/message/', '');
    const address = (event.queryStringParameters?.address || '').toLowerCase().trim();
    const storeKey = `inbox:${address}`;

    let list = [];
    const blobStore = getEmailStore();
    if (blobStore) {
      try {
        list = (await blobStore.get(storeKey, { type: 'json' })) || [];
      } catch {
        list = inMemoryStore.get(storeKey) || [];
      }
    } else {
      list = inMemoryStore.get(storeKey) || [];
    }

    const updated = list.filter((m) => m.id !== msgId);
    if (blobStore) {
      try {
        await blobStore.setJSON(storeKey, updated);
      } catch {
        inMemoryStore.set(storeKey, updated);
      }
    } else {
      inMemoryStore.set(storeKey, updated);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  }

  // 6. Domain List: Always include custom domain itcareerpoint.in
  if (subPath === '/domains' && event.httpMethod === 'GET') {
    try {
      const response = await fetch(`${MAILTM_BASE_URL}/domains`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      const rawList = Array.isArray(data) ? data : (data?.['hydra:member'] || []);
      
      // Prepend custom domain
      const allDomains = [
        {
          id: 'custom_domain_itcareerpoint',
          domain: CUSTOM_DOMAIN,
          isActive: true,
          isPrivate: false,
          isCustom: true,
        },
        ...rawList,
      ];

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(allDomains),
      };
    } catch (err) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify([
          { id: 'custom_domain_itcareerpoint', domain: CUSTOM_DOMAIN, isActive: true, isCustom: true }
        ]),
      };
    }
  }

  // Rate limiting check for external provider proxy
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'anonymous';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: { ...CORS_HEADERS, 'Retry-After': '60' },
      body: JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait a moment before sending more requests.',
      }),
    };
  }

  // 7. Proxy to Mail.tm for standard mailboxes
  try {
    const queryString = event.queryStringParameters
      ? '?' + new URLSearchParams(event.queryStringParameters).toString()
      : '';
    const targetUrl = `${MAILTM_BASE_URL}${subPath}${queryString}`;

    const forwardHeaders = {
      'Accept': 'application/json',
    };

    for (const [key, val] of Object.entries(event.headers || {})) {
      const lower = key.toLowerCase();
      if (lower === 'authorization') {
        forwardHeaders['Authorization'] = val;
      } else if (lower === 'content-type') {
        forwardHeaders['Content-Type'] = val;
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(event.httpMethod) && !forwardHeaders['Content-Type']) {
      forwardHeaders['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
      method: event.httpMethod,
      headers: forwardHeaders,
    };

    if (['POST', 'PUT', 'PATCH'].includes(event.httpMethod) && event.body) {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    const responseData = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType || 'application/json',
      },
      body: responseData,
    };
  } catch (error) {
    console.error('Netlify function error proxying to Mail.tm:', error);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Bad Gateway',
        message: 'Failed to communicate with temporary email upstream provider.',
        details: error.message,
      }),
    };
  }
}
