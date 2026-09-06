import { useState, useRef, useEffect } from "react";
import { ModelOption } from "../../types/chat";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../Tooltip";

interface ChatHeaderProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  isStreaming: boolean;
}

export default function ChatHeader({
  models,
  selectedModel,
  onSelectModel,
  onNewChat,
  onOpenHistory,
  isStreaming,
}: ChatHeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  // Mobile overflow menu (History + Theme + Font Size)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Accessibility Font Size menu popover state
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const fontSizeMenuRef = useRef<HTMLDivElement>(null);

  const [fontSize, setFontSizeState] = useState<"normal" | "large" | "xlarge">(() => {
    const saved = localStorage.getItem("fontSize");
    if (saved === "large" || saved === "xlarge") return saved;
    return "normal";
  });

  const changeFontSize = (size: "normal" | "large" | "xlarge") => {
    setFontSizeState(size);
    localStorage.setItem("fontSize", size);
    if (size === "normal") {
      document.documentElement.removeAttribute("data-font-size");
    } else {
      document.documentElement.setAttribute("data-font-size", size);
    }
  };

  // Sync initial font size attribute on mount
  useEffect(() => {
    if (fontSize !== "normal") {
      document.documentElement.setAttribute("data-font-size", fontSize);
    } else {
      document.documentElement.removeAttribute("data-font-size");
    }
  }, [fontSize]);

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

  // Close mobile menu & font size menu when tapping outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
      if (fontSizeMenuOpen && fontSizeMenuRef.current && !fontSizeMenuRef.current.contains(target)) {
        setFontSizeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [mobileMenuOpen, fontSizeMenuOpen]);

  const MoonIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );

  const SunIcon = () => (
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
  );

  const HistoryIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const FontSizeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3" />
      <path d="M9 20h6" />
      <path d="M12 4v16" />
    </svg>
  );

  return (
    <header className="sticky top-0 z-30 w-full bg-canvas/90 backdrop-blur-md border-b border-line">
      <div className="mx-auto max-w-5xl w-full min-w-0 px-3 sm:px-6 py-2 flex items-center justify-between box-border gap-2">
        {/* ── Brand & Badges ── */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="flex size-7.5 sm:size-8 items-center justify-center rounded-xl bg-surface shadow-hairline border border-line shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E6B5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </motion.div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-bold text-ink tracking-tight whitespace-nowrap">Lorin AI</h1>
              <span className="rounded-full bg-[#E1EED7] dark:bg-[#2E6B5E]/30 px-1.5 py-0.5 text-[9.5px] font-semibold text-[#2E6B5E] dark:text-[#6ee7b7] dark:border dark:border-[#2E6B5E]/40 whitespace-nowrap">
                MSAJCEA
              </span>
              {/* TNEA badge — hidden on mobile to save space */}
              <span className="hidden sm:inline-block rounded-full bg-[#D0CCE5]/60 dark:bg-[#4C1D95]/30 px-1.5 py-0.5 text-[9.5px] font-medium text-[#4C1D95] dark:text-[#c4b5fd] dark:border dark:border-[#4C1D95]/40">
                TNEA 1301
              </span>
            </div>
          </div>
        </div>

        {/* ── Desktop Actions (sm and above) ── */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
          {/* ── Accessibility Font Size Control Popover ── */}
          <div className="relative" ref={fontSizeMenuRef}>
            <Tooltip content="Font Size (Parents & Low Vision Support)" position="bottom">
              <button
                type="button"
                onClick={() => setFontSizeMenuOpen((p) => !p)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors shadow-hairline cursor-pointer ${
                  fontSize !== "normal"
                    ? "bg-[#2E6B5E]/15 border-[#2E6B5E]/40 text-[#2E6B5E] dark:text-[#10b981]"
                    : "bg-surface border-line text-ink hover:bg-hover"
                }`}
              >
                <FontSizeIcon />
                <span className="text-[11px] uppercase tracking-wider">{fontSize === "xlarge" ? "A++" : fontSize === "large" ? "A+" : "A"}</span>
              </button>
            </Tooltip>

            <AnimatePresence>
              {fontSizeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-50 w-52 rounded-2xl bg-surface border border-line shadow-2xl p-1.5 backdrop-blur-xl"
                >
                  <div className="px-3 py-1.5 border-b border-line/60">
                    <p className="text-[11px] font-bold text-ink">Text Size Settings</p>
                    <p className="text-[9.5px] text-ink-3">Easy reading for parents & low vision</p>
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <button
                      type="button"
                      onClick={() => { changeFontSize("normal"); setFontSizeMenuOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "normal" ? "bg-[#2E6B5E]/10 text-accent font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <span>Standard (100%)</span>
                      {fontSize === "normal" && <span className="text-accent text-[10px]">✓ Active</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { changeFontSize("large"); setFontSizeMenuOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "large" ? "bg-[#2E6B5E]/10 text-accent font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <span>Large (+15% Parents)</span>
                      {fontSize === "large" && <span className="text-accent text-[10px]">✓ Active</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { changeFontSize("xlarge"); setFontSizeMenuOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "xlarge" ? "bg-[#2E6B5E]/10 text-accent font-bold" : "text-ink hover:bg-hover"
                      }`}
                    >
                      <span>Extra Large (+30%)</span>
                      {fontSize === "xlarge" && <span className="text-accent text-[10px]">✓ Active</span>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Tooltip content={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"} position="bottom">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={toggleTheme}
              className="flex size-8 items-center justify-center rounded-full bg-surface border border-line text-ink hover:bg-hover transition-colors shadow-hairline cursor-pointer">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </motion.button>
          </Tooltip>

          <Tooltip content="Chat History (Ctrl+J)" position="bottom">
            <button type="button" onClick={onOpenHistory}
              className="flex size-8 items-center justify-center rounded-full bg-surface border border-line text-ink hover:bg-hover transition-colors shadow-hairline cursor-pointer">
              <HistoryIcon />
            </button>
          </Tooltip>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={onNewChat}
            disabled={isStreaming}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D0E7E1] to-[#E1EED7] dark:from-[#2E6B5E] dark:to-[#10b981] px-3.5 py-1.5 text-xs font-semibold text-[#1E293B] dark:text-white shadow-hairline border border-white dark:border-emerald-400/30 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
            <span>+</span> New Chat
          </motion.button>
        </div>

        {/* ── Mobile Actions (below sm) ── */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0" ref={mobileMenuRef}>
          {/* New Chat — icon only on mobile for minimal footprint */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={onNewChat}
            disabled={isStreaming}
            aria-label="New Chat"
            className="tap-target flex items-center justify-center size-9 rounded-full bg-gradient-to-r from-[#D0E7E1] to-[#E1EED7] dark:from-[#2E6B5E] dark:to-[#10b981] border border-white/80 dark:border-emerald-400/30 shadow-hairline text-[#1E293B] dark:text-white disabled:opacity-50 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>

          {/* ⋯ Overflow menu — opens popover with History, Stats, Theme, Font Size */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              aria-label="More options"
              className="tap-target flex items-center justify-center size-9 rounded-full bg-surface border border-line text-ink shadow-hairline cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </motion.button>

            {/* Dropdown popover */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-surface border border-line shadow-2xl backdrop-blur-xl overflow-hidden"
                >
                  <button type="button" onClick={() => { onOpenHistory(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-ink hover:bg-hover active:bg-hover-2 transition-colors tap-target">
                    <HistoryIcon /> Chat History
                  </button>

                  {/* Font Size cycle button on mobile */}
                  <button type="button" onClick={() => {
                    const nextSize = fontSize === "normal" ? "large" : fontSize === "large" ? "xlarge" : "normal";
                    changeFontSize(nextSize);
                  }}
                    className="w-full flex items-center justify-between px-3 py-3 text-[13px] font-medium text-ink hover:bg-hover active:bg-hover-2 transition-colors tap-target border-t border-line/40">
                    <div className="flex items-center gap-3">
                      <FontSizeIcon />
                      <span>Font Size</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent uppercase">
                      {fontSize === "xlarge" ? "XL (130%)" : fontSize === "large" ? "L (115%)" : "100%"}
                    </span>
                  </button>

                  <button type="button" onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-[13px] font-medium text-ink hover:bg-hover active:bg-hover-2 transition-colors tap-target border-t border-line/40">
                    {isDark ? <SunIcon /> : <MoonIcon />}
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
