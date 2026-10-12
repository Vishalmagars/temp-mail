// Email Provider Service Layer
// Standardized client interface with dual-engine support (Mail.tm + Custom Domain Ingestion)

const API_BASE = '/api';
const CUSTOM_DOMAIN = 'itcareerpoint.in';

/**
 * Helper for API requests with timeout and error extraction
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 12000);

  try {
    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.['hydra:description'] || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Network timeout: Provider took too long to respond.');
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw err;
  }
}

/**
 * Generate a random, human-friendly username
 */
export function generateRandomUsername() {
  const adjectives = ['swift', 'amber', 'neon', 'frost', 'silent', 'cosmic', 'orbit', 'echo', 'shadow', 'pulse', 'vivid', 'solar', 'mystic', 'hyper'];
  const nouns = ['wave', 'spark', 'hawk', 'cloud', 'nexus', 'drift', 'vault', 'byte', 'core', 'signal', 'flux', 'node', 'beacon', 'atlas'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${randomAdj}.${randomNoun}${randomDigits}`;
}

export function generateSecurePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let pass = '';
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint32Array(16);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < 16; i++) {
      pass += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return pass;
}

const STORAGE_KEY = 'dropmail_active_inbox_v2';

export const emailService = {
  /**
   * Fetch available domains (including custom domain itcareerpoint.in)
   */
  async getDomains() {
    try {
      const data = await apiRequest('/domains');
      const members = Array.isArray(data) ? data : (data?.['hydra:member'] || []);
      const domainList = members
        .filter((d) => d && d.isActive !== false)
        .map((d) => d.domain);

      // Ensure provider domain with live MX records is first by default
      if (!domainList.includes(CUSTOM_DOMAIN)) {
        domainList.push(CUSTOM_DOMAIN);
      }
      return domainList;
    } catch {
      return ['maxxspace.com', CUSTOM_DOMAIN];
    }
  },

  /**
   * Create a new temporary inbox (supports both Custom Domain and Mail.tm)
   */
  async createInbox(customUsername = null, selectedDomain = null) {
    const domains = await this.getDomains();
    const domain = selectedDomain && domains.includes(selectedDomain) ? selectedDomain : domains[0];
    const username = (customUsername && customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')) || generateRandomUsername();
    const address = `${username}@${domain}`;

    // Handle Custom Domain: itcareerpoint.in
    if (domain === CUSTOM_DOMAIN) {
      const inboxData = {
        id: 'custom_' + Date.now(),
        address,
        username,
        domain,
        isCustomDomain: true,
        token: 'token_custom_' + Math.random().toString(36).substring(2, 10),
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      this.saveStoredInbox(inboxData);
      return inboxData;
    }

    // Handle Mail.tm upstream domain
    const password = generateSecurePassword();

    const accountRes = await apiRequest('/accounts', {
      method: 'POST',
      body: { address, password },
    });

    const accountId = accountRes.id || accountRes['@id']?.split('/').pop();

    const tokenRes = await apiRequest('/token', {
      method: 'POST',
      body: { address, password },
    });

    const inboxData = {
      id: accountId,
      address,
      username,
      domain,
      password,
      isCustomDomain: false,
      token: tokenRes.token,
      createdAt: accountRes.createdAt || new Date().toISOString(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    this.saveStoredInbox(inboxData);
    return inboxData;
  },

  getStoredInbox() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.address) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  saveStoredInbox(inbox) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inbox));
    } catch (e) {
      console.warn('Failed to persist inbox state', e);
    }
  },

  clearStoredInbox() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear inbox state', e);
    }
  },

  /**
   * Fetch inbox messages list (dual-engine router)
   */
  async getMessages(token, page = 1, address = null) {
    const isCustom = address && address.endsWith(`@${CUSTOM_DOMAIN}`);

    if (isCustom) {
      const data = await apiRequest(`/custom/messages?address=${encodeURIComponent(address)}`);
      return {
        messages: (data?.messages || []).map((m) => ({
          ...m,
          seen: Boolean(m.seen),
          hasAttachments: Boolean(m.hasAttachments),
        })),
        total: data?.total || 0,
        page: 1,
      };
    }

    if (!token) throw new Error('Authentication token required.');

    const data = await apiRequest(`/messages?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const total = data?.['hydra:totalItems'] ?? (Array.isArray(data) ? data.length : 0);
    const rawList = data?.['hydra:member'] || (Array.isArray(data) ? data : []);

    const messages = rawList.map((m) => ({
      id: m.id,
      accountId: m.accountId,
      msgid: m.msgid,
      from: {
        address: m.from?.address || 'Unknown Sender',
        name: m.from?.name || m.from?.address?.split('@')[0] || 'Unknown',
      },
      to: m.to || [],
      subject: m.subject || '(No Subject)',
      intro: m.intro || '',
      seen: Boolean(m.seen),
      isDeleted: Boolean(m.isDeleted),
      hasAttachments: Boolean(m.hasAttachments),
      size: m.size || 0,
      createdAt: m.createdAt || new Date().toISOString(),
    }));

    return {
      messages,
      total,
      page,
    };
  },

  /**
   * Fetch single message details (dual-engine router)
   */
  async getMessage(token, messageId, address = null) {
    const isCustom = address && address.endsWith(`@${CUSTOM_DOMAIN}`);

    if (isCustom) {
      const data = await apiRequest(`/custom/message/${messageId}?address=${encodeURIComponent(address)}`);
      return {
        ...data,
        seen: true,
      };
    }

    if (!token) throw new Error('Authentication token required.');
    if (!messageId) throw new Error('Message ID required.');

    const data = await apiRequest(`/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      id: data.id,
      msgid: data.msgid,
      from: {
        address: data.from?.address || 'Unknown',
        name: data.from?.name || data.from?.address?.split('@')[0] || 'Unknown',
      },
      to: data.to || [],
      subject: data.subject || '(No Subject)',
      intro: data.intro || '',
      seen: Boolean(data.seen),
      hasAttachments: Boolean(data.hasAttachments),
      size: data.size || 0,
      downloadUrl: data.downloadUrl || null,
      createdAt: data.createdAt || new Date().toISOString(),
      text: data.text || '',
      html: Array.isArray(data.html) ? data.html.join('') : (data.html || ''),
      attachments: (data.attachments || []).map((att) => ({
        id: att.id,
        filename: att.filename || 'attachment',
        contentType: att.contentType || 'application/octet-stream',
        disposition: att.disposition || 'attachment',
        size: att.size || 0,
        downloadUrl: att.downloadUrl,
      })),
    };
  },

  /**
   * Delete single message
   */
  async deleteMessage(token, messageId, address = null) {
    const isCustom = address && address.endsWith(`@${CUSTOM_DOMAIN}`);
    if (isCustom) {
      return await apiRequest(`/custom/message/${messageId}?address=${encodeURIComponent(address)}`, {
        method: 'DELETE',
      });
    }

    if (!token || !messageId) return;
    return await apiRequest(`/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Delete account permanently
   */
  async deleteAccount(token, accountId, address = null) {
    const isCustom = address && address.endsWith(`@${CUSTOM_DOMAIN}`);
    if (isCustom) {
      this.clearStoredInbox();
      return;
    }

    if (!token || !accountId) return;
    try {
      await apiRequest(`/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('Account deletion returned:', err.message);
    } finally {
      this.clearStoredInbox();
    }
  },
};
