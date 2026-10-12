import React from 'react';
import { 
  Inbox, 
  RefreshCw, 
  Clock, 
  Mail, 
  Trash2, 
  Paperclip, 
  ArrowRight, 
  Pause, 
  Play, 
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { formatRelativeTime } from '../utils/formatters';

export default function InboxList({
  messages,
  totalMessages,
  currentPage,
  onPageChange,
  selectedMessageId,
  onSelectMessage,
  onDeleteMessage,
  isRefreshing,
  onManualRefresh,
  autoPollEnabled,
  onToggleAutoPoll,
  secondsUntilNextPoll,
  currentAddress,
}) {
  const totalPages = Math.ceil((totalMessages || 0) / 30) || 1;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
      {/* Inbox Header Bar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Inbox</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {totalMessages || 0}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {autoPollEnabled ? (
                <span>Auto-refreshing in <strong className="text-indigo-400">{secondsUntilNextPoll}s</strong></span>
              ) : (
                <span className="text-amber-400">Auto-refresh paused</span>
              )}
            </p>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2">
          {/* Toggle Auto Polling */}
          <button
            onClick={onToggleAutoPoll}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoPollEnabled
                ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
            title={autoPollEnabled ? 'Pause auto-polling' : 'Resume auto-polling'}
          >
            {autoPollEnabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden sm:inline">{autoPollEnabled ? 'Pause' : 'Resume'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-600/20"
            title="Check for new emails now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 min-h-[380px] max-h-[600px]">
        {messages && messages.length > 0 ? (
          messages.map((msg) => {
            const isSelected = selectedMessageId === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => onSelectMessage(msg.id)}
                className={`group relative p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                    : msg.seen
                    ? 'hover:bg-slate-800/40 bg-transparent'
                    : 'bg-slate-850/40 hover:bg-slate-800/60 font-semibold'
                }`}
              >
                {/* Sender Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold uppercase transition-transform group-hover:scale-105 ${
                  msg.seen 
                    ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                    : 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20'
                }`}>
                  {msg.from?.name?.charAt(0) || msg.from?.address?.charAt(0) || 'M'}
                </div>

                {/* Content Summary */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs truncate ${msg.seen ? 'text-slate-300' : 'text-white font-bold'}`}>
                      {msg.from?.name || msg.from?.address}
                    </span>
                    <span className="text-[11px] text-slate-500 shrink-0 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    {!msg.seen && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" title="Unread email"></span>
                    )}
                    <h3 className={`text-xs truncate ${msg.seen ? 'text-slate-300' : 'text-indigo-200 font-semibold'}`}>
                      {msg.subject || '(No Subject)'}
                    </h3>
                    {msg.hasAttachments && (
                      <Paperclip className="w-3 h-3 text-slate-400 shrink-0" title="Has attachments" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {msg.intro || 'Click to view email body...'}
                  </p>
                </div>

                {/* Delete button (hover only or mobile touch) */}
                <div className="shrink-0 flex items-center gap-1 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMessage(msg.id);
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                    title="Delete email"
                    aria-label="Delete email"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors hidden sm:block" />
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Mail className="w-10 h-10 animate-bounce duration-1000" />
              </div>
              <div className="absolute -inset-2 rounded-2xl border border-indigo-500/20 animate-ping opacity-40 pointer-events-none"></div>
            </div>

            <h3 className="text-base font-bold text-white mb-2">Your inbox is empty & waiting</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
              Send an email to <span className="text-indigo-400 font-mono font-medium break-all">{currentAddress}</span>. Incoming messages will automatically appear here within seconds.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live polling active — no need to refresh manually</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Footer (if multiple pages exist) */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
