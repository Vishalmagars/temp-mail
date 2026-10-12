import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import EmailGenerator from './components/EmailGenerator';
import InboxList from './components/InboxList';
import EmailReader from './components/EmailReader';
import FeaturesAndFaq from './components/FeaturesAndFaq';
import Footer from './components/Footer';
import { emailService } from './services/emailService';
import { useToast } from './context/ToastContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DEFAULT_POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_SECONDS || '10', 10);

/**
 * Play a gentle synth chime using Web Audio API
 */
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context may be restricted by browser autoplay policy until user gesture
  }
}

export default function App() {
  const { addToast } = useToast();

  // Core State
  const [currentInbox, setCurrentInbox] = useState(null);
  const [domains, setDomains] = useState([]);
  const [messages, setMessages] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState(null);
  const [providerStatus, setProviderStatus] = useState('online');
  const [globalError, setGlobalError] = useState(null);

  // Polling State
  const [autoPollEnabled, setAutoPollEnabled] = useState(true);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState(DEFAULT_POLL_INTERVAL);

  const prevMessageIdsRef = useRef(new Set());
  const pollTimerRef = useRef(null);

  /**
   * Fetch latest messages for active inbox
   */
  const fetchMessagesForInbox = useCallback(
    async (token, page = 1, isManual = false) => {
      if (!token) return;
      if (isManual) setIsRefreshing(true);

      try {
        const result = await emailService.getMessages(token, page);
        setProviderStatus('online');

        // Check if any new messages arrived
        const currentIds = new Set(result.messages.map((m) => m.id));
        let hasNew = false;
        let newestSubject = '';

        for (const msg of result.messages) {
          if (!prevMessageIdsRef.current.has(msg.id)) {
            hasNew = true;
            newestSubject = msg.subject;
            break;
          }
        }

        // Trigger notification if new message received
        if (hasNew && prevMessageIdsRef.current.size > 0) {
          playNotificationChime();
          addToast(`New email received: "${newestSubject || 'New Message'}"`, 'info', 5000);
        }

        prevMessageIdsRef.current = currentIds;
        setMessages(result.messages);
        setTotalMessages(result.total);
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (err.status === 401 || err.status === 404) {
          // Token expired or inbox purged by provider
          addToast('Your temporary inbox session has expired. Generating a fresh one.', 'error');
          handleGenerateNewInbox();
        } else {
          setProviderStatus('error');
        }
      } finally {
        if (isManual) setIsRefreshing(false);
      }
    },
    [addToast]
  );

  /**
   * Initialize App: Load domains & active or new inbox
   */
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setIsLoading(true);
      setGlobalError(null);

      try {
        // 1. Get available domains
        const availableDomains = await emailService.getDomains();
        if (!isMounted) return;
        setDomains(availableDomains);

        // 2. Check for existing stored inbox
        const stored = emailService.getStoredInbox();
        if (stored && stored.token && stored.address) {
          setCurrentInbox(stored);
          await fetchMessagesForInbox(stored.token, 1);
        } else {
          // 3. Create fresh inbox
          const newInbox = await emailService.createInbox(null, availableDomains[0]);
          if (!isMounted) return;
          setCurrentInbox(newInbox);
          prevMessageIdsRef.current = new Set();
          await fetchMessagesForInbox(newInbox.token, 1);
          addToast(`Ready! Temporary address generated.`, 'success');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setGlobalError(
            err.message || 'Unable to connect to disposable email provider. Please try again.'
          );
          setProviderStatus('error');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Auto-polling Countdown & Trigger Effect
   */
  useEffect(() => {
    if (!autoPollEnabled || !currentInbox?.token || isLoading || isGenerating) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsUntilNextPoll((prev) => {
        if (prev <= 1) {
          // Trigger poll only if tab is currently visible
          if (!document.hidden) {
            fetchMessagesForInbox(currentInbox.token, currentPage, false);
          }
          return DEFAULT_POLL_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoPollEnabled, currentInbox, currentPage, isLoading, isGenerating, fetchMessagesForInbox]);

  /**
   * Generate a completely new random inbox
   */
  const handleGenerateNewInbox = async () => {
    setIsGenerating(true);
    try {
      const newInbox = await emailService.createInbox(null, domains[0]);
      setCurrentInbox(newInbox);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setMessages([]);
      setTotalMessages(0);
      prevMessageIdsRef.current = new Set();
      setSecondsUntilNextPoll(DEFAULT_POLL_INTERVAL);
      addToast('Generated new disposable email address!', 'success');
    } catch (err) {
      addToast(`Failed to create new address: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate custom username address
   */
  const handleCustomGenerate = async (username, domain) => {
    setIsGenerating(true);
    try {
      const newInbox = await emailService.createInbox(username, domain);
      setCurrentInbox(newInbox);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setMessages([]);
      setTotalMessages(0);
      prevMessageIdsRef.current = new Set();
      setSecondsUntilNextPoll(DEFAULT_POLL_INTERVAL);
      addToast(`Custom mailbox created: ${newInbox.address}`, 'success');
    } catch (err) {
      addToast(`Custom address failed: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Delete current mailbox permanently
   */
  const handleDeleteInbox = async () => {
    if (!currentInbox) return;
    setIsGenerating(true);
    try {
      await emailService.deleteAccount(currentInbox.token, currentInbox.id);
      addToast('Mailbox deleted successfully.', 'info');
      // Create fresh replacement inbox
      const newInbox = await emailService.createInbox(null, domains[0]);
      setCurrentInbox(newInbox);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setMessages([]);
      setTotalMessages(0);
      prevMessageIdsRef.current = new Set();
      setSecondsUntilNextPoll(DEFAULT_POLL_INTERVAL);
      addToast(`Provisioned new replacement address.`, 'success');
    } catch (err) {
      addToast('Error during mailbox cleanup.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Change domain: create mailbox with existing username on new domain
   */
  const handleDomainChange = async (newDomain) => {
    if (!currentInbox || currentInbox.domain === newDomain) return;
    setIsGenerating(true);
    try {
      const username = currentInbox.username;
      const newInbox = await emailService.createInbox(username, newDomain);
      setCurrentInbox(newInbox);
      setSelectedMessageId(null);
      setSelectedMessage(null);
      setMessages([]);
      setTotalMessages(0);
      prevMessageIdsRef.current = new Set();
      setSecondsUntilNextPoll(DEFAULT_POLL_INTERVAL);
      addToast(`Switched domain to @${newDomain}`, 'success');
    } catch (err) {
      addToast(`Failed to switch domain: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Select and load message detail
   */
  const handleSelectMessage = async (messageId) => {
    if (!currentInbox?.token || !messageId) return;
    setSelectedMessageId(messageId);
    setReaderLoading(true);
    setReaderError(null);

    // Mark as seen locally
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, seen: true } : m))
    );

    try {
      const fullMessage = await emailService.getMessage(currentInbox.token, messageId);
      setSelectedMessage(fullMessage);
    } catch (err) {
      console.error('Error loading message content:', err);
      setReaderError(err.message || 'Could not load message content from provider.');
    } finally {
      setReaderLoading(false);
    }
  };

  /**
   * Delete single message
   */
  const handleDeleteMessage = async (messageId) => {
    if (!currentInbox?.token || !messageId) return;
    try {
      await emailService.deleteMessage(currentInbox.token, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setTotalMessages((prev) => Math.max(0, prev - 1));
      prevMessageIdsRef.current.delete(messageId);

      if (selectedMessageId === messageId) {
        setSelectedMessageId(null);
        setSelectedMessage(null);
      }
      addToast('Email deleted.', 'info');
    } catch (err) {
      addToast('Failed to delete email.', 'error');
    }
  };

  /**
   * Manual refresh trigger
   */
  const handleManualRefresh = () => {
    if (!currentInbox?.token) return;
    setSecondsUntilNextPoll(DEFAULT_POLL_INTERVAL);
    fetchMessagesForInbox(currentInbox.token, currentPage, true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors">
      {/* Top Navigation */}
      <Navbar
        onRefreshAll={currentInbox ? handleManualRefresh : null}
        isRefreshing={isRefreshing}
        providerStatus={providerStatus}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Global Error Notice */}
        {globalError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-sm font-medium">{globalError}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Hero Section */}
        <Hero />

        {/* Email Address Generator Card */}
        <EmailGenerator
          currentInbox={currentInbox}
          domains={domains}
          isLoading={isLoading}
          isGenerating={isGenerating}
          onGenerateNew={handleGenerateNewInbox}
          onCustomGenerate={handleCustomGenerate}
          onDeleteInbox={handleDeleteInbox}
          onDomainChange={handleDomainChange}
        />

        {/* Main Application Area: Inbox & Reader */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-12">
          {/* Inbox List (Always shown on desktop; hidden on mobile when viewing email) */}
          <div
            className={`lg:col-span-5 w-full ${
              selectedMessageId ? 'hidden lg:block' : 'block'
            }`}
          >
            <InboxList
              messages={messages}
              totalMessages={totalMessages}
              currentPage={currentPage}
              onPageChange={(p) => setCurrentPage(p)}
              selectedMessageId={selectedMessageId}
              onSelectMessage={handleSelectMessage}
              onDeleteMessage={handleDeleteMessage}
              isRefreshing={isRefreshing}
              onManualRefresh={handleManualRefresh}
              autoPollEnabled={autoPollEnabled}
              onToggleAutoPoll={() => setAutoPollEnabled((prev) => !prev)}
              secondsUntilNextPoll={secondsUntilNextPoll}
              currentAddress={currentInbox?.address || 'your temporary address'}
            />
          </div>

          {/* Email Reader (Full view on mobile when open, right pane on desktop) */}
          <div
            className={`lg:col-span-7 w-full ${
              selectedMessageId ? 'block' : 'hidden lg:block'
            }`}
          >
            <EmailReader
              message={selectedMessage}
              isLoading={readerLoading}
              error={readerError}
              onClose={() => {
                setSelectedMessageId(null);
                setSelectedMessage(null);
              }}
              onDelete={handleDeleteMessage}
            />
          </div>
        </div>

        {/* Educational Features & FAQ Section */}
        <FeaturesAndFaq />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
