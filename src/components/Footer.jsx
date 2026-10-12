import React from 'react';
import { Mail, Heart, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-10 px-4 mt-auto text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Attribution */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200">DropMail</span>
          </div>
          <span className="hidden sm:inline text-slate-700">|</span>
          <p>
            Powered by legitimate disposable email backend powered by{' '}
            <a
              href="https://mail.tm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              Mail.tm
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Center / Netlify Badge */}
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Deployable on Netlify Free Tier &middot; Zero Private Key Exposure</span>
        </div>

        {/* Right Links & Legal */}
        <div className="flex items-center gap-4 text-slate-400">
          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault();
              alert('Terms of Service: This service provides temporary, ephemeral mailboxes solely for testing and anti-spam protection. Abuse, harassment, illegal content, or unsolicited commercial messaging is strictly prohibited.');
            }}
            className="hover:text-slate-200 transition-colors"
          >
            Terms of Use
          </a>
          <span>&middot;</span>
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              alert('Privacy Policy: DropMail does not retain permanent logs or link temporary mailboxes to personal user identities. Messages expire automatically in accordance with provider retention schedules.');
            }}
            className="hover:text-slate-200 transition-colors"
          >
            Privacy Notice
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-slate-900 text-center text-slate-600 text-[11px]">
        &copy; {new Date().getFullYear()} DropMail. Built for developers, testers, and privacy-conscious users worldwide.
      </div>
    </footer>
  );
}
