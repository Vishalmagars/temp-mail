import DOMPurify from 'dompurify';

/**
 * Format timestamp into relative human-readable format
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format full date and time for reader header
 */
export function formatFullDateTime(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format byte count to human-readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sanitize email HTML with DOMPurify and optional remote image blocking
 */
export function sanitizeEmailHtml(rawHtml, allowRemoteImages = false) {
  if (!rawHtml) return '';

  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'colgroup',
      'dd', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'q', 's', 'small', 'span',
      'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
      'thead', 'tr', 'u', 'ul', 'center', 'font'
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'target', 'src', 'alt', 'width', 'height', 'style',
      'align', 'valign', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'color'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ADD_ATTR: ['target'],
  };

  let clean = DOMPurify.sanitize(rawHtml, config);

  // If remote images are blocked, replace external image src with placeholder
  if (!allowRemoteImages) {
    clean = clean.replace(/<img\s+([^>]*?)src=["'](https?:\/\/[^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
      return `<div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 my-1 text-xs font-mono rounded bg-slate-800 text-slate-400 border border-slate-700" title="${src}">
        <span class="w-2 h-2 rounded-full bg-amber-400"></span> [Remote Image Blocked]
      </div>`;
    });
  }

  // Force all links to open in a new tab with noopener noreferrer
  clean = clean.replace(/<a\s+(?!.*?target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');

  return clean;
}

/**
 * Trigger browser file download
 */
export function downloadFile(filename, textContent, mimeType = 'text/plain') {
  const blob = new Blob([textContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
