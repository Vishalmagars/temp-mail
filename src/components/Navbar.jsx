import React from 'react';
import { Mail, Shield, Moon, Sun, RefreshCw, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onRefreshAll, isRefreshing, providerStatus = 'online' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 dark:bg-slate-950/80 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
              <Mail className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">ITCareerPoint <span className="text-indigo-400">Mail</span></span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  DISPOSABLE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Instant Anonymous Temporary Email on itcareerpoint.in</p>
            </div>
          </div>

          {/* Right status & actions */}
          <div className="flex items-center gap-3">
            {/* Provider status badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className={`w-2 h-2 rounded-full ${providerStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>Network: <strong className="text-slate-200">itcareerpoint.in Active</strong></span>
            </div>

            {/* Quick Refresh All */}
            {onRefreshAll && (
              <button
                onClick={onRefreshAll}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700 disabled:opacity-50"
                title="Refresh mailbox"
                aria-label="Refresh mailbox"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            )}

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
