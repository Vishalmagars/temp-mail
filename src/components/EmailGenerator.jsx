import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  Trash2, 
  QrCode, 
  ChevronDown, 
  Sparkles, 
  Edit3, 
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function EmailGenerator({
  currentInbox,
  domains,
  isLoading,
  isGenerating,
  onGenerateNew,
  onCustomGenerate,
  onDeleteInbox,
  onDomainChange,
}) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customUser, setCustomUser] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(currentInbox?.domain || domains[0] || '');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Copy email to clipboard
  const handleCopy = async () => {
    if (!currentInbox?.address) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentInbox.address);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentInbox.address;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      addToast('Email address copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      addToast('Failed to copy email address.', 'error');
    }
  };

  // Handle custom address submission
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const cleanUser = customUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cleanUser) {
      addToast('Please enter a valid username prefix.', 'error');
      return;
    }
    if (cleanUser.length < 3) {
      addToast('Username must be at least 3 characters.', 'error');
      return;
    }
    const domain = selectedDomain || domains[0];
    onCustomGenerate(cleanUser, domain);
    setShowCustomModal(false);
    setCustomUser('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col gap-4">
          {/* Top Label & Domain Select */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Disposable Address
              </span>
              {currentInbox && (
                <span className="text-[11px] font-mono text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded">
                  Provider: Mail.tm
                </span>
              )}
            </div>

            {/* Domain Selector */}
            {domains && domains.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Domain:</span>
                <select
                  value={currentInbox?.domain || domains[0]}
                  onChange={(e) => onDomainChange && onDomainChange(e.target.value)}
                  disabled={isLoading || isGenerating}
                  className="bg-slate-950 border border-slate-700/80 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                >
                  {domains.map((dom) => (
                    <option key={dom} value={dom}>
                      @{dom}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Central Email Address Display Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5">
            <div className="relative flex-1 flex items-center min-w-0 px-3 py-2 sm:py-0">
              {isLoading || isGenerating ? (
                <div className="flex items-center gap-2 text-slate-400 animate-pulse text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Provisioning fresh mailbox from provider...</span>
                </div>
              ) : currentInbox ? (
                <div className="w-full flex items-center justify-between gap-2 overflow-hidden">
                  <span className="font-mono text-base sm:text-xl font-semibold tracking-wide text-white truncate selection:bg-indigo-500">
                    {currentInbox.address}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-500">No active mailbox generated.</span>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                disabled={isLoading || isGenerating || !currentInbox}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 active:scale-95'
                } disabled:opacity-50 disabled:pointer-events-none`}
                title="Copy email to clipboard"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {/* Generate New Random Address */}
              <button
                onClick={() => onGenerateNew()}
                disabled={isLoading || isGenerating}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg font-medium text-sm bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all active:scale-95 disabled:opacity-50"
                title="Generate a completely new random address"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">New Random</span>
              </button>

              {/* Customize Address */}
              <button
                onClick={() => {
                  setSelectedDomain(currentInbox?.domain || domains[0] || '');
                  setShowCustomModal(true);
                }}
                disabled={isLoading || isGenerating}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all hover:text-white"
                title="Create custom email username"
                aria-label="Customize email username"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {/* QR Code */}
              <button
                onClick={() => setShowQrModal(true)}
                disabled={!currentInbox}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all hover:text-white"
                title="View address QR code for mobile scanning"
                aria-label="View QR code"
              >
                <QrCode className="w-4 h-4" />
              </button>

              {/* Delete Mailbox */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || isGenerating || !currentInbox}
                className="p-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                title="Delete this temporary mailbox"
                aria-label="Delete mailbox"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtext info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-1.5 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              All messages sent to this address will instantly appear in the inbox below.
            </span>
            <span className="text-slate-500 font-mono">
              Session stored locally in browser
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Customize Email Address */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Create Custom Address</h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Pick your preferred prefix. The address will be generated against the verified provider domain.
            </p>

            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username Prefix</label>
                <input
                  type="text"
                  value={customUser}
                  onChange={(e) => setCustomUser(e.target.value)}
                  placeholder="e.g. testing.user99"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Provider Domain</label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {domains.map((dom) => (
                    <option key={dom} value={dom}>
                      @{dom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-400">
                Preview:{' '}
                <span className="text-indigo-400 font-semibold">
                  {customUser ? customUser.toLowerCase().replace(/[^a-z0-9._-]/g, '') : 'username'}@{selectedDomain || domains[0]}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customUser.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
                >
                  Create Mailbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code */}
      {showQrModal && currentInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Scan Email Address</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block mb-3 shadow-inner">
              {/* Standard QR representation using Google Charts API or quick SVG */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `mailto:${currentInbox.address}`
                )}`}
                alt="QR Code for temporary email"
                className="w-44 h-44 mx-auto"
                loading="lazy"
              />
            </div>

            <p className="font-mono text-xs text-indigo-400 break-all mb-4 px-2">
              {currentInbox.address}
            </p>

            <p className="text-xs text-slate-400 mb-4">
              Scan with your mobile camera to quickly compose or copy this email address on your mobile device.
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Mailbox */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Active Mailbox?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will permanently delete the mailbox <strong className="text-white font-mono">{currentInbox?.address}</strong> and all received messages. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Keep Mailbox
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteInbox();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
