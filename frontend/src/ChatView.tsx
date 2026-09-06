import { useEffect, useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import ChatHeader from "./components/chat/ChatHeader";
import HeroGreeting from "./components/chat/HeroGreeting";
import MessageItem from "./components/chat/MessageItem";
import ChatInput from "./components/chat/ChatInput";
import SessionDrawer from "./components/chat/SessionDrawer";
import StatsModal from "./components/chat/StatsModal";
import { Tooltip } from "./components/Tooltip";

export default function App() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [chatInput, setChatInput] = useState("");

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

      // Cmd/Ctrl + N -> New Chat
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startNewChat();
      }

      // Cmd/Ctrl + J -> Toggle History Drawer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        handleOpenHistory();
      }

      // Cmd/Ctrl + I -> Toggle Analytics/Stats Drawer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        handleOpenStats();
      }

      // Esc -> Stop Streaming Audio / LLM
      if (e.key === "Escape") {
        if (isStreaming) stopStreaming();
        window.dispatchEvent(new CustomEvent("stop-all-audio"));
      }

      // Spacebar -> Pause/Play Audio if not typing in input
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
    if (!scrollRef.current) return;

    const msgCount = messages.length;
    const wasStreaming = prevStreamingRef.current;

    // User just sent a new message → instant scroll to bottom
    if (msgCount > prevMsgCountRef.current && msgCount > 0) {
      const lastMsg = messages[msgCount - 1];
      if (lastMsg.role === "user" || (lastMsg.role === "assistant" && lastMsg.is_streaming)) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }

    // Streaming just completed → smooth scroll to final answer position
    if (wasStreaming && !isStreaming) {
      setTimeout(() => scrollToBottom(false), 80);
    }

    // During streaming → auto-follow if user is near bottom
    if (isStreaming) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      if (isNearBottom) {
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-canvas text-ink antialiased">
      {/* Top Glassmorphic Navigation Bar */}
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onNewChat={startNewChat}
        onOpenHistory={handleOpenHistory}
        onOpenStats={handleOpenStats}
        isStreaming={isStreaming}
      />

      {/* Centered Single-Column Chat Canvas */}
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 py-2 gpu-accelerated"
      >
        <div className="mx-auto max-w-5xl w-full min-h-full flex flex-col justify-between">
          {messages.length === 0 ? (
            <HeroGreeting
              onSelectPrompt={(prompt) => {
                sendMessage(prompt);
                setChatInput("");
              }}
              onPastePrompt={(prompt) => setChatInput(prompt)}
            />
          ) : (
            <div className="flex flex-col space-y-3 sm:space-y-4 pt-2 pb-36 sm:pb-40">
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

      {/* Scroll To Bottom Button — Floating centered above input box */}
      {showScrollBottom && (
        <Tooltip content="Scroll to bottom" position="top">
          <button
            type="button"
            onClick={() => scrollToBottom(false)}
            className="fixed bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-40 flex size-9 sm:size-10 items-center justify-center rounded-full bg-surface/95 backdrop-blur-md shadow-xl border border-line text-ink-2 hover:bg-hover hover:text-ink hover:scale-105 active:scale-95 transition-all animate-in fade-in zoom-in-95 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>
        </Tooltip>
      )}

      {/* Floating Chat Input Box */}
      <ChatInput
        inputValue={chatInput}
        onInputChange={setChatInput}
        onSendMessage={(msg) => {
          sendMessage(msg);
          setChatInput("");
        }}
        onStopStreaming={stopStreaming}
        isStreaming={isStreaming}
        showChips={messages.length > 0}
        rateLimitInfo={rateLimitInfo}
        onClearRateLimit={() => setRateLimitInfo(null)}
      />

      {/* History Slide-over Drawer */}
      <SessionDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onClearAllSessions={clearAllSessions}
        onNewChat={startNewChat}
      />

      {/* Telemetry Stats Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        loading={loadingStats}
      />
    </div>
  );
}
