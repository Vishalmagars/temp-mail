// Email Provider Service Layer
// Standardized client interface with modular architecture and error handling

const API_BASE = '/api';

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

    // Some endpoints return 204 No Content (e.g. DELETE)
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

/**
 * Generate a cryptographically secure random password
 */
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

/**
 * Storage keys
 */
const STORAGE_KEY = 'dropmail_active_inbox_v1';

export const emailService = {
  /**
   * Fetch available domains from provider
   */
  async getDomains() {
    const data = await apiRequest('/domains');
    const members = Array.isArray(data) ? data : (data?.['hydra:member'] || []);
    return members
      .filter((d) => d && d.isActive !== false)
      .map((d) => d.domain);
  },

  /**
   * Create a new temporary inbox
   */
  async createInbox(customUsername = null, selectedDomain = null) {
    const domains = await this.getDomains();
    if (!domains || domains.length === 0) {
      throw new Error('No active domains currently available from the temporary email provider.');
    }

    const domain = selectedDomain && domains.includes(selectedDomain) ? selectedDomain : domains[0];
    const username = (customUsername && customUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')) || generateRandomUsername();
    const address = `${username}@${domain}`;
    const password = generateSecurePassword();

    // 1. Register account
    const accountRes = await apiRequest('/accounts', {
      method: 'POST',
      body: { address, password },
    });

    const accountId = accountRes.id || accountRes['@id']?.split('/').pop();

    // 2. Obtain JWT Bearer Token
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
      token: tokenRes.token,
      createdAt: accountRes.createdAt || new Date().toISOString(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours theoretical session
    };

    // Store in browser session
    this.saveStoredInbox(inboxData);

    return inboxData;
  },

  /**
   * Retrieve active inbox from sessionStorage
   */
  getStoredInbox() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.address && parsed.token) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Save active inbox to sessionStorage
   */
  saveStoredInbox(inbox) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(inbox));
    } catch (e) {
      console.warn('Failed to persist inbox state to sessionStorage', e);
    }
  },

  /**
   * Clear active inbox from sessionStorage
   */
  clearStoredInbox() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear inbox state', e);
    }
  },

  /**
   * Fetch inbox messages list
   */
  async getMessages(token, page = 1) {
    if (!token) throw new Error('Authentication token required to fetch messages.');

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
   * Fetch single message details (including full text and HTML body)
   */
  async getMessage(token, messageId) {
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
        transferEncoding: att.transferEncoding,
        related: Boolean(att.related),
        size: att.size || 0,
        downloadUrl: att.downloadUrl,
      })),
    };
  },

  /**
   * Delete single message
   */
  async deleteMessage(token, messageId) {
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
  async deleteAccount(token, accountId) {
    if (!token || !accountId) return;
    try {
      await apiRequest(`/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn('Account deletion request returned:', err.message);
    } finally {
      this.clearStoredInbox();
    }
  },
};
