import React from 'react';
import { ShieldCheck, Flame, Lock, Clock, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative pt-6 pb-4 sm:pt-10 sm:pb-6 text-center max-w-3xl mx-auto px-4">
      {/* Background glow decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-40 bg-indigo-500/15 blur-3xl pointer-events-none rounded-full"></div>

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4 backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
        <span>Protect Your True Inbox from Spam & Data Brokers</span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
        Your Free Disposable <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
          Temporary Email Address
        </span>
      </h1>

      {/* Subtitle */}
      <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-6 leading-relaxed">
        Receive verification codes, test web apps, and bypass unwanted newsletters.
        Incoming emails appear below automatically in real-time.
      </p>

      {/* Quick Feature Chips */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Anti-Spam Shield</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>No Password Required</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-violet-400" />
          <span>Live Auto-Polling</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>100% Free Service</span>
        </div>
      </div>
    </div>
  );
}
