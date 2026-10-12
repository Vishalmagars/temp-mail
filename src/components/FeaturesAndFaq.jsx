import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  Zap, 
  Lock, 
  ChevronDown, 
  HelpCircle, 
  AlertTriangle,
  Globe,
  BellRing
} from 'lucide-react';

const FAQS = [
  {
    q: 'What is a disposable temporary email?',
    a: 'A temporary disposable email is a short-lived inbox that lets you receive emails without using your personal or work email address. It protects your real inbox from spam, data breaches, marketing mailing lists, and unwanted advertising trackers.',
  },
  {
    q: 'Can I receive verification codes and OTPs with DropMail?',
    a: 'Yes! DropMail is connected to Mail.tm with real MX records. Verification links, confirmation tokens, and OTP codes sent by websites, apps, and services will arrive directly in your inbox.',
  },
  {
    q: 'How long does my temporary email address remain valid?',
    a: 'Your inbox remains active for your current browser session and persists until you click "Delete Mailbox" or clear your browser data. Inactive mailboxes are naturally recycled by the upstream provider.',
  },
  {
    q: 'Is this temporary email private and secure?',
    a: 'DropMail generates cryptographically strong random credentials for each mailbox session. However, like all public disposable email services, temporary mail should NOT be used for sensitive banking, medical records, or confidential correspondence. Never use temporary email for accounts you intend to keep long-term.',
  },
  {
    q: 'Can I send emails from this address?',
    a: 'No. To prevent abuse, spamming, and blacklisting, disposable email services are strictly receive-only. Outgoing mail is prohibited to ensure high deliverability and service reputation.',
  },
  {
    q: 'Why are remote images blocked by default in the reader?',
    a: 'Many marketing and tracking emails contain "web beacons" or 1x1 pixel tracking images designed to detect when you opened the email and capture your IP address. DropMail blocks remote images by default to safeguard your privacy, while giving you the option to load them on demand.',
  },
];

export default function FeaturesAndFaq() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 border-t border-slate-800/80">
      {/* Feature Grid */}
      <div className="mb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Why Use DropMail Disposable Email?
          </h2>
          <p className="text-sm text-slate-400">
            A privacy-first disposable email service designed for speed, security, and developer productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Zero Spam In Your Real Inbox</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use temporary mail when downloading whitepapers, signing up for trial tools, or accessing gated content without getting bombarded by marketing newsletters.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Instant Real-Time Inbox</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No manual refresh needed. DropMail automatically polls for new messages with smart idle backoff, delivering incoming emails straight to your screen in seconds.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4 border border-violet-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Built-in Privacy & Sanitization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unsafe scripts, iframes, and malicious trackers are filtered out with DOMPurify. Remote tracking pixels are blocked by default to keep your IP protected.
            </p>
          </div>
        </div>
      </div>

      {/* Security Disclaimer Banner */}
      <div className="mb-14 p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-100 font-semibold block mb-0.5">Important Privacy & Security Notice:</strong>
          Temporary email inboxes are intended for transient, non-sensitive activities (e.g. testing web signups, verifying free tools, bypassing promotional spam). Do not use disposable email for banking, government services, or credentials you wish to recover later.
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl sm:text-2xl font-bold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-200">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-400 border-t border-slate-800/60 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
