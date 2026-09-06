import { useState, useEffect } from "react";
import { ModelOption } from "../../types/chat";
import { motion } from "framer-motion";
import { Tooltip } from "../Tooltip";

interface ChatHeaderProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
  isStreaming: boolean;
}

export default function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  onNewChat,
  onOpenHistory,
  onOpenStats,
  isStreaming,
}: ChatHeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const activeModelObj = models.find((m) => m.id === selectedModel) || models[0] || {
    id: "zai/glm-5.3-flash",
    name: "GLM-5.3 Flash",
  };

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      return true;
    } else {
      document.documentElement.classList.remove("dark");
      return false;
    }
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    const handleToggleEvent = () => toggleTheme();
    window.addEventListener("toggle-theme", handleToggleEvent);
    return () => window.removeEventListener("toggle-theme", handleToggleEvent);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-30 w-full bg-canvas/90 backdrop-blur-md border-b border-line">
      <div className="mx-auto max-w-5xl w-full min-w-0 px-3 sm:px-6 py-2 flex items-center justify-between box-border">
        {/* Brand & Badges */}
        <div className="flex items-center gap-2">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="flex size-7.5 sm:size-8 items-center justify-center rounded-xl bg-surface shadow-hairline border border-line shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E6B5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </motion.div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-bold text-ink tracking-tight">Lorin AI</h1>
              <span className="rounded-full bg-[#E1EED7] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#2E6B5E]">
                MSAJCEA
              </span>
              <span className="hidden sm:inline-block rounded-full bg-[#D0CCE5]/60 px-1.5 py-0.5 text-[9.5px] font-medium text-[#4C1D95]">
                TNEA 1301
              </span>
            </div>
          </div>
        </div>

        {/* Model Selector & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Automated Model Router Indicator Badge */}
          <Tooltip content="Smart Auto Router: Dynamically routes simple factoids, multi-hop queries, and academic synthesis to optimal models automatically." position="bottom">
            <div className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink shadow-hairline border border-line cursor-default">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[#2E6B5E]">⚡ Smart Auto Router</span>
            </div>
          </Tooltip>

          {/* Dark / Light Theme Toggle Button */}
          <Tooltip content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} position="bottom">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-full bg-surface border border-line text-ink hover:bg-hover transition-colors shadow-hairline cursor-pointer"
            >
              {isDark ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </motion.button>
          </Tooltip>

          {/* History Drawer Button */}
          <Tooltip content="Chat History (Ctrl+J)" position="bottom">
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex size-8 items-center justify-center rounded-full bg-surface border border-line text-ink hover:bg-hover transition-colors shadow-hairline cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          </Tooltip>

          {/* Telemetry Stats Modal Button */}
          <Tooltip content="System Analytics (Ctrl+I)" position="bottom">
            <button
              type="button"
              onClick={onOpenStats}
              className="flex size-8 items-center justify-center rounded-full bg-surface border border-line text-ink hover:bg-hover transition-colors shadow-hairline cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          </Tooltip>

          {/* New Chat Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onNewChat}
            disabled={isStreaming}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D0E7E1] to-[#E1EED7] px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] shadow-hairline border border-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <span>+</span> New Chat
          </motion.button>
        </div>
      </div>
    </header>
  );
}
