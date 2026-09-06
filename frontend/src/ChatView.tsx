import { useEffect, useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import { useMobileLayout } from "./hooks/useMobileLayout";
import ChatHeader from "./components/chat/ChatHeader";
import HeroGreeting from "./components/chat/HeroGreeting";
import MessageItem from "./components/chat/MessageItem";
import ChatInput from "./components/chat/ChatInput";
import SessionDrawer from "./components/chat/SessionDrawer";
import StatsModal from "./components/chat/StatsModal";
import { Tooltip } from "./components/Tooltip";
import { AmbientBackground } from "./components/chat/AmbientBackground";

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [chatInput, setChatInput] = useState("");

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
    const isFarFromBottom = messages.length > 0 && (scrollHeight - scrollTop - clientHeight > 100);
    setShowScrollBottom((prev) => (prev !== isFarFromBottom ? isFarFromBottom : prev));
  };

  const handleOpenStats = () => {
    fetchStats();
    setIsStatsOpen(true);
  };

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
        isStreaming={isStreaming}
      />

      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 pt-16 sm:pt-20 pb-28 sm:pb-32 gpu-accelerated"
      >
        <div className="mx-auto max-w-4xl w-full min-h-full flex flex-col justify-start">
          {messages.length === 0 ? (
            <HeroGreeting
              onSelectPrompt={(prompt) => {
                sendMessage(prompt);
                setChatInput("");
              }}
              onPastePrompt={(prompt) => setChatInput(prompt)}
            />
          ) : (
            <div className="flex flex-col space-y-6 sm:space-y-8 pt-4 pb-12 sm:pb-16">
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
                    onSendPrompt={(prompt) => sendMessage(prompt)}
                    onRegenerate={regenerateLastMessage}
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
        onSendMessage={(msg, effort) => {
          const clean = msg.trim().toLowerCase();
          if (clean === "/admin" || clean === "/ admin" || clean === "admin/") {
            setChatInput("");
            window.location.href = "/admin";
            return;
          }
          sendMessage(msg, effort);
          setChatInput("");
        }}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
        showChips={messages.length > 0}
        rateLimitInfo={rateLimitInfo}
        onClearRateLimit={() => setRateLimitInfo(null)}
        isMobile={isMobile}
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
    </div>
  );
}
