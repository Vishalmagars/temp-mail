// Netlify Serverless Function for Temporary Email Provider Gateway
// Acts as a secure, rate-limited proxy layer to Mail.tm API

const MAILTM_BASE_URL = process.env.MAILTM_BASE_URL || 'https://api.mail.tm';

// Simple in-memory rate limiter per IP (resets on lambda cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per IP

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

// Clean up stale rate limit entries periodically
if (rateLimitMap.size > 1000) {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) rateLimitMap.delete(ip);
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  // Rate limiting check
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'anonymous';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: {
        ...CORS_HEADERS,
        'Retry-After': '60',
      },
      body: JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait a moment before sending more requests.',
      }),
    };
  }

  try {
    // Determine target sub-path
    // When called via redirect /api/* -> /.netlify/functions/api/:splat
    // event.path might be "/.netlify/functions/api/domains" or "/api/domains"
    let subPath = event.path;
    subPath = subPath.replace(/^\/\.netlify\/functions\/api/, '');
    subPath = subPath.replace(/^\/api/, '');
    if (!subPath || subPath === '') subPath = '/';

    // Handle health check
    if (subPath === '/health') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'healthy',
          provider: 'mail.tm',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Build target URL
    const queryString = event.queryStringParameters
      ? '?' + new URLSearchParams(event.queryStringParameters).toString()
      : '';
    const targetUrl = `${MAILTM_BASE_URL}${subPath}${queryString}`;

    // Prepare headers to forward
    const forwardHeaders = {
      'Accept': 'application/json',
    };
    
    // Normalize incoming headers
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

    let responseData;
    if (contentType.includes('application/json') || contentType.includes('application/ld+json')) {
      responseData = await response.text();
    } else {
      responseData = await response.text();
    }

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
