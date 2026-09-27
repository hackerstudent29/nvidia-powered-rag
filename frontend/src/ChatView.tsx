import { useEffect, useRef, useState, useCallback } from "react";
import { useChat } from "./hooks/useChat";
import { useMobileLayout } from "./hooks/useMobileLayout";
import ChatHeader from "./components/chat/ChatHeader";
import HeroGreeting from "./components/chat/HeroGreeting";
import MessageItem from "./components/chat/MessageItem";
import ChatInput from "./components/chat/ChatInput";
import SessionDrawer from "./components/chat/SessionDrawer";
import StatsModal from "./components/chat/StatsModal";
import SettingsModal from "./components/chat/SettingsModal";
import UserOnboardingModal, { UserProfile } from "./components/chat/UserOnboardingModal";
import { Tooltip } from "./components/Tooltip";
import { AmbientBackground } from "./components/chat/AmbientBackground";

export default function App({ initialSettingsOpen = false }: { initialSettingsOpen?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(initialSettingsOpen);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("lorin_user_profile");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const isEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true";

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => !userProfile && !isEmbed);

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("lorin_user_profile", JSON.stringify(profile));
    setIsOnboardingOpen(false);
  };

  // Automatic clean reset: purges stale user profile & cached messages so user starts fresh
  useEffect(() => {
    const RESET_VERSION = "lorin_clean_reset_fresh_v2";
    if (localStorage.getItem(RESET_VERSION) !== "true") {
      localStorage.removeItem("lorin_user_profile");
      localStorage.removeItem("lorin_cached_messages");
      localStorage.removeItem("lorin_rate_limit_info");
      localStorage.removeItem("lorin_session_id");
      localStorage.removeItem("lorin_sessions");
      localStorage.setItem(RESET_VERSION, "true");
      setUserProfile(null);
    }
  }, []);

  // Single source of truth for mobile/touch layout state + keyboard offset
  const { isMobile, keyboardOffset } = useMobileLayout();

  const {
    messages,
    isStreaming,
    sessionId,
    sessions,
    models,
    selectedModel,
    setSelectedModel,
    stats,
    loadingStats,
    rateLimitInfo,
    setRateLimitInfo,
    fetchSessions,
    fetchStats,
    sendMessage,
    stopStreaming,
    startNewChat,
    selectSession,
    deleteSession,
    clearAllSessions,
    regenerateLastMessage,
    regenerateWithNeMo,
    submitFeedback,
  } = useChat();

  const handleOpenHistory = () => {
    fetchSessions();
    setIsHistoryOpen(true);
  };

  const scrollToBottom = (instant = false) => {
    if (!scrollRef.current) return;
    if (instant) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startNewChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        handleOpenHistory();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        handleOpenStats();
      }
      if (e.key === "Escape") {
        if (isStreaming) stopStreaming();
        window.dispatchEvent(new CustomEvent("stop-all-audio"));
      }
      if (e.key === " " && !isInputFocused) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("stop-all-audio"));
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [fetchSessions, fetchStats, startNewChat, isStreaming, stopStreaming]);

  const prevStreamingRef = useRef(false);
  const prevMsgCountRef = useRef(0);

  useEffect(() => {
    const msgCount = messages.length;
    const isNewMsgAdded = msgCount > prevMsgCountRef.current;
    const isStreamingStarted = isStreaming && !prevStreamingRef.current;

    if ((isNewMsgAdded || isStreamingStarted) && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      // Only scroll to end if content actually overflows the visible container
      if (scrollHeight > clientHeight + 40) {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }

    if (isStreaming && scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 180;
      if (isNearBottom && scrollHeight > clientHeight + 40) {
        scrollRef.current.scrollTop = scrollHeight;
      }
    }

    prevStreamingRef.current = isStreaming;
    prevMsgCountRef.current = msgCount;
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Only show scroll-to-bottom arrow when user scrolled far up (> 450px from bottom)
    const isFarFromBottom = messages.length > 0 && (scrollHeight - scrollTop - clientHeight > 450);
    setShowScrollBottom((prev) => (prev !== isFarFromBottom ? isFarFromBottom : prev));
  };

  const handleOpenStats = () => {
    fetchStats();
    setIsStatsOpen(true);
  };

  const handleSendPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
    setChatInput("");
  }, [sendMessage]);

  const handlePastePrompt = useCallback((prompt: string) => {
    setChatInput(prompt);
  }, []);

  const handleRegenerate = useCallback((targetId?: string) => {
    if (targetId) regenerateLastMessage(targetId);
  }, [regenerateLastMessage]);

  const handleSendMessage = useCallback((msg: string, effort?: string) => {
    const clean = msg.trim().toLowerCase();
    if (clean === "/admin" || clean === "/ admin" || clean === "admin/") {
      setChatInput("");
      window.location.href = "/admin";
      return;
    }
    sendMessage(msg, effort);
    setChatInput("");
  }, [sendMessage]);

  const handleClearRateLimit = useCallback(() => {
    setRateLimitInfo(null);
  }, [setRateLimitInfo]);

  const handleOpenSettingsCallback = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleOpenProfileCallback = useCallback(() => {
    setIsOnboardingOpen(true);
  }, []);

  return (
    // h-screen-safe uses 100dvh — fixes iOS Safari 100vh bug
    <div
      className="relative flex w-screen flex-col overflow-hidden bg-canvas text-ink antialiased h-screen-safe"
      style={{
        // Propagate keyboard offset as CSS var — ChatInput reads this to shift up
        "--keyboard-offset": `${keyboardOffset}px`,
      } as React.CSSProperties}
    >
      <AmbientBackground />
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onNewChat={startNewChat}
        onOpenHistory={handleOpenHistory}
        onOpenSettings={handleOpenSettingsCallback}
        onOpenProfile={handleOpenProfileCallback}
        userProfile={userProfile}
        isStreaming={isStreaming}
        isEmbed={isEmbed}
      />

      <main
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("button, a, input, textarea, [role='button']")) {
            window.dispatchEvent(new CustomEvent("collapse-chat-input"));
          }
        }}
        className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 pt-16 sm:pt-20 pb-4 sm:pb-6"
      >
        <div className={`mx-auto max-w-4xl w-full min-h-full flex flex-col ${messages.length === 0 ? "justify-center" : "justify-start"}`}>
          {messages.length === 0 ? (
            <HeroGreeting
              onSelectPrompt={handleSendPrompt}
              onPastePrompt={handlePastePrompt}
            />
          ) : (
            <div className="flex flex-col space-y-4 sm:space-y-6 pt-4 pb-2 sm:pb-3">
              {messages.map((msg, idx) => {
                const prevUserMsg = idx > 0 ? messages.slice(0, idx).reverse().find(m => m.role === 'user') : null;
                const userQueryText = prevUserMsg ? prevUserMsg.content : "MSAJCEA Inquiry";
                return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    userQuery={userQueryText}
                    sessionId={sessionId}
                    isLatestMessage={idx === messages.length - 1}
                    onSendPrompt={handleSendPrompt}
                    onRegenerate={handleRegenerate}
                    onRegenerateWithNeMo={regenerateWithNeMo}
                    onSubmitFeedback={submitFeedback}
                  />
                );
              })}
              <div ref={endRef} />
            </div>
          )}
        </div>
      </main>

      {showScrollBottom && (
        <Tooltip content="Scroll to bottom" position="top">
          <button
            type="button"
            onClick={() => scrollToBottom(false)}
            className="fixed bottom-40 sm:bottom-36 left-1/2 -translate-x-1/2 z-40 flex size-9 sm:size-10 items-center justify-center rounded-full bg-surface/95 dark:bg-surface/90 backdrop-blur-md shadow-xl border border-line text-ink-2 hover:bg-hover hover:text-ink hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in-95 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>
        </Tooltip>
      )}

      {/* Keyboard-aware floating input — shifts up when iOS keyboard opens */}
      <ChatInput
        inputValue={chatInput}
        onInputChange={setChatInput}
        onSendMessage={handleSendMessage}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
        showChips={messages.length > 0}
        rateLimitInfo={rateLimitInfo}
        onClearRateLimit={handleClearRateLimit}
        isMobile={isMobile}
        onOpenSettings={handleOpenSettingsCallback}
        selectedModel={selectedModel}
      />

      {/* Side drawer on desktop, bottom sheet on mobile */}
      <SessionDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onClearAllSessions={clearAllSessions}
        onNewChat={startNewChat}
        isMobile={isMobile}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        loading={loadingStats}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMobile={isMobile}
      />

      <UserOnboardingModal
        isOpen={isOnboardingOpen}
        onSaveProfile={handleSaveProfile}
        onClose={() => setIsOnboardingOpen(false)}
        initialProfile={userProfile}
      />
    </div>
  );
}
