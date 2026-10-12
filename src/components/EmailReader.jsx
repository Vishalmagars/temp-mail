import React, { useState, useMemo } from 'react';
import { 
  X, 
  Trash2, 
  Download, 
  Copy, 
  Printer, 
  ShieldAlert, 
  ShieldCheck, 
  Paperclip, 
  Eye, 
  Code, 
  FileText, 
  ArrowLeft,
  Loader2,
  Clock,
  User,
  AlertCircle
} from 'lucide-react';
import { formatFullDateTime, formatBytes, sanitizeEmailHtml, downloadFile } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export default function EmailReader({
  message,
  isLoading,
  error,
  onClose,
  onDelete,
}) {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState('html'); // 'html' | 'text' | 'raw'
  const [allowRemoteImages, setAllowRemoteImages] = useState(true);

  // Sanitize HTML memoized
  const sanitizedHtml = useMemo(() => {
    if (!message?.html) return '';
    return sanitizeEmailHtml(message.html, allowRemoteImages);
  }, [message?.html, allowRemoteImages]);

  // Copy plain text content
  const handleCopyBody = async () => {
    const textToCopy = message?.text || (message?.html ? message.html.replace(/<[^>]+>/g, ' ') : '');
    try {
      await navigator.clipboard.writeText(textToCopy);
      addToast('Message content copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy message text.', 'error');
    }
  };

  // Download raw or .eml email file
  const handleDownloadEmail = () => {
    if (!message) return;
    const content = `From: ${message.from?.name || ''} <${message.from?.address || ''}>
To: ${(message.to || []).map(t => `${t.name || ''} <${t.address || ''}>`).join(', ')}
Date: ${message.createdAt}
Subject: ${message.subject}

${message.text || (message.html ? message.html.replace(/<[^>]+>/g, '') : '')}
`;
    downloadFile(`${message.subject || 'email'}.txt`, content, 'text/plain;charset=utf-8');
    addToast('Email downloaded as text file.', 'info');
  };

  // Print email
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/80 border border-slate-800 rounded-2xl h-full min-h-[420px] shadow-xl">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
        <span className="text-sm text-slate-300 font-medium">Fetching email content from provider...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 border border-slate-800 rounded-2xl h-full min-h-[420px] shadow-xl text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Failed to Load Message</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">{error}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-slate-800/60 rounded-2xl h-full min-h-[420px] text-center text-slate-500">
        <FileText className="w-10 h-10 mb-3 stroke-[1.5]" />
        <p className="text-sm font-medium">Select an email from the inbox list to read it.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to list</span>
          </button>

          <div className="flex items-center gap-1.5">
            {/* Download */}
            <button
              onClick={handleDownloadEmail}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Download email (.txt)"
              aria-label="Download message"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Copy Content */}
            <button
              onClick={handleCopyBody}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Copy message text"
              aria-label="Copy body text"
            >
              <Copy className="w-4 h-4" />
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Print message"
              aria-label="Print message"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(message.id)}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
              title="Delete email"
              aria-label="Delete message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subject Title */}
        <h2 className="text-lg sm:text-xl font-bold text-white mb-3 break-words">
          {message.subject || '(No Subject)'}
        </h2>

        {/* Sender & Metadata Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              {message.from?.name?.charAt(0) || message.from?.address?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-semibold text-slate-200">
                {message.from?.name || message.from?.address}
              </div>
              <div className="font-mono text-slate-400 text-[11px]">
                &lt;{message.from?.address}&gt;
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] self-end sm:self-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatFullDateTime(message.createdAt)}</span>
          </div>
        </div>

        {/* Attachments Bar if present */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <a
                key={att.id}
                href={att.downloadUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 hover:text-white border border-slate-700 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="font-medium truncate max-w-[140px]">{att.filename}</span>
                <span className="text-[10px] text-slate-400 font-mono">({formatBytes(att.size)})</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Reader Mode Bar & Privacy Controls */}
      <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('html')}
            disabled={!message.html}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'html'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
            }`}
          >
            Sanitized HTML
          </button>
          <button
            onClick={() => setViewMode('text')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'text'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Plain Text
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              viewMode === 'raw'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Headers
          </button>
        </div>

        {/* Remote images privacy toggle */}
        {viewMode === 'html' && message.html && (
          <div className="flex items-center gap-2">
            {!allowRemoteImages ? (
              <button
                onClick={() => {
                  setAllowRemoteImages(true);
                  addToast('Remote images enabled for this email.', 'info');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                title="Images may disclose your IP to sender"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Load Remote Images</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Images Loaded</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Email Content Viewer */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-950/40 text-slate-200 min-h-[300px]">
        {viewMode === 'html' && message.html ? (
          <div
            className="email-content-wrapper prose prose-invert max-w-none text-sm break-words overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : viewMode === 'text' || !message.html ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed font-normal">
            {message.text || 'No text content provided.'}
          </pre>
        ) : (
          <pre className="font-mono text-xs bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(
              {
                id: message.id,
                msgid: message.msgid,
                from: message.from,
                to: message.to,
                subject: message.subject,
                createdAt: message.createdAt,
                size: message.size,
                hasAttachments: message.hasAttachments,
              },
              null,
              2
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
