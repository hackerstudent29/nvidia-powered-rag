import React, { useState, useRef, useEffect } from "react";
import { ModelOption } from "../../types/chat";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../Tooltip";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Type,
  Sun,
  Moon,
  Plus,
  Settings,
  User,
  ExternalLink,
  Menu,
  X,
  Mic,
} from "lucide-react";
import { JellyBlobMascot } from "../ui/JellyBlobMascot";

interface ChatHeaderProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  userProfile?: { name: string; age: number | string; purpose: string } | null;
  isStreaming: boolean;
  isEmbed?: boolean;
}

const ChatHeader = React.memo(function ChatHeader({
  models: _models,
  selectedModel: _selectedModel,
  onSelectModel: _onSelectModel,
  onNewChat,
  onOpenHistory,
  onOpenSettings,
  onOpenProfile,
  userProfile,
  isStreaming: _isStreaming,
  isEmbed = false,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const fontSizeMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const headerNavRef = useRef<HTMLDivElement>(null);
  const [activePill, setActivePill] = useState<string | null>(null);

  const [fontSize, setFontSizeState] = useState<"normal" | "large" | "xlarge">(
    () => {
      const saved = localStorage.getItem("fontSize");
      if (saved === "large" || saved === "xlarge") return saved;
      return "normal";
    }
  );

  const changeFontSize = (size: "normal" | "large" | "xlarge") => {
    setFontSizeState(size);
    localStorage.setItem("fontSize", size);
    if (size === "normal") {
      document.documentElement.removeAttribute("data-font-size");
    } else {
      document.documentElement.setAttribute("data-font-size", size);
    }
  };

  useEffect(() => {
    if (fontSize !== "normal") {
      document.documentElement.setAttribute("data-font-size", fontSize);
    } else {
      document.documentElement.removeAttribute("data-font-size");
    }
  }, [fontSize]);

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
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        fontSizeMenuOpen &&
        fontSizeMenuRef.current &&
        !fontSizeMenuRef.current.contains(target) &&
        !headerNavRef.current?.contains(target)
      ) {
        setFontSizeMenuOpen(false);
      }
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
      if (
        headerNavRef.current &&
        !headerNavRef.current.contains(target)
      ) {
        setActivePill(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [fontSizeMenuOpen, mobileMenuOpen]);

  // Pill Header Items (for Desktop View)
  const headerPills = [
    {
      id: "new",
      label: "New",
      icon: Plus,
      action: () => {
        onNewChat();
        setActivePill("new");
      },
    },
    ...(!userProfile?.name
      ? [
          {
            id: "profile",
            label: "Profile",
            icon: User,
            action: () => {
              if (onOpenProfile) onOpenProfile();
              setActivePill("profile");
            },
          },
        ]
      : []),
    {
      id: "history",
      label: "Chats",
      icon: Clock,
      action: () => {
        onOpenHistory();
        setActivePill("history");
      },
    },
    {
      id: "voice",
      label: "Voice",
      icon: Mic,
      action: () => {
        if (onOpenSettings) {
          onOpenSettings();
        } else {
          navigate("/settings");
        }
        setActivePill("voice");
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      action: () => {
        if (onOpenSettings) {
          onOpenSettings();
        } else {
          navigate("/settings");
        }
        setActivePill("settings");
      },
    },
    {
      id: "font",
      label: fontSize === "normal" ? "Font Size" : fontSize === "large" ? "Font A+" : "Font A++",
      icon: Type,
      action: () => {
        setFontSizeMenuOpen((prev) => !prev);
        setActivePill("font");
      },
    },
    {
      id: "theme",
      label: isDark ? "Dark Theme" : "Light Theme",
      icon: isDark ? Moon : Sun,
      action: () => {
        toggleTheme();
        setActivePill("theme");
      },
    },
    ...(isEmbed
      ? [
          {
            id: "fullscreen",
            label: "Open Fullscreen",
            icon: ExternalLink,
            action: () => {
              const fullUrl = window.location.origin + window.location.pathname.replace(/\/$/, "");
              window.open(fullUrl, "_blank");
            },
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mild top frosted glass backdrop above & across the navbar header */}
      <div
        className="fixed top-0 left-0 right-0 h-16 sm:h-20 z-30 pointer-events-none backdrop-blur-[6px] bg-gradient-to-b from-white/70 via-white/30 to-transparent dark:from-[#0b0c0e]/80 dark:via-[#0b0c0e]/35 dark:to-transparent"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Viewport Dismiss Backdrop */}
      <AnimatePresence>
        {(mobileMenuOpen || fontSizeMenuOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setMobileMenuOpen(false);
              setFontSizeMenuOpen(false);
            }}
            className="fixed inset-0 bg-black/15 dark:bg-black/50 backdrop-blur-[2px] z-40 pointer-events-auto cursor-pointer"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="fixed top-2 sm:top-2.5 left-0 right-0 z-50 px-2.5 sm:px-6 pointer-events-none">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="pointer-events-auto max-w-4xl w-full mx-auto h-14 sm:h-16 relative flex items-center justify-between px-3.5 sm:px-6 rounded-full
            backdrop-blur-2xl
            bg-white/60 dark:bg-[#0d0e12]/55
            border border-white/70 dark:border-white/[0.09]
            shadow-[0_8px_32px_rgba(0,0,0,0.10),0_1.5px_0_rgba(255,255,255,0.55)_inset,0_-1px_0_rgba(0,0,0,0.06)_inset] dark:shadow-[0_8px_40px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.06)_inset]
            before:absolute before:inset-0 before:rounded-full before:pointer-events-none
            before:bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,255,255,0.45)_0%,transparent_100%)] dark:before:bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_100%)]"
        >
          {/* ── Brand & Badges ── */}
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip content="Start New Chat" position="bottom">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 2 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 450, damping: 20 }}
                onClick={onNewChat}
                className="flex items-center justify-center cursor-pointer shrink-0 -my-1"
              >
                <JellyBlobMascot emotion={_isStreaming ? "hmm" : "idle"} size={58} interactive={true} />
              </motion.div>
            </Tooltip>

            <div className="flex flex-col justify-center min-w-0 leading-none">
              <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
                <span className="text-[9px] sm:text-[9.5px] font-mono font-extrabold uppercase tracking-wider text-[#2E6B5E] dark:text-[#10b981] leading-none">
                  MSAJCE
                </span>
                <span className="inline-block rounded-md bg-[#2E6B5E]/15 dark:bg-[#10b981]/20 px-1.5 py-0.5 text-[8px] sm:text-[8.5px] font-mono font-bold text-[#2E6B5E] dark:text-[#10b981] border border-[#2E6B5E]/25 dark:border-[#10b981]/30 leading-none whitespace-nowrap">
                  TNEA 1301
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-heading font-extrabold text-ink dark:text-[#f4f3ee] tracking-tight whitespace-nowrap leading-tight mt-0.5">
                Lorin AI
              </h1>
            </div>
          </div>

          {/* ── HEADER NAVBAR RIGHT SIDE ── */}
          <div className="flex items-center gap-1.5 relative">
            {!isEmbed && (
              <nav
                ref={headerNavRef}
                className="hidden lg:flex rounded-full items-center p-1 gap-1 border border-black/[0.06] dark:border-white/[0.07] bg-black/[0.04] dark:bg-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
              >
                {headerPills.map((pill) => {
                  const Icon = pill.icon;
                  const isActive = activePill === pill.id;

                  return (
                    <Tooltip key={pill.id} content={pill.label} position="bottom">
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.93 }}
                        transition={{ type: "spring", stiffness: 450, damping: 24 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          pill.action();
                        }}
                        type="button"
                        className={`flex items-center justify-center rounded-full transition-all duration-200 relative h-9 cursor-pointer overflow-hidden ${
                          isActive
                            ? "px-3.5 gap-2 bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md shadow-[#2E6B5E]/30 dark:shadow-[#10b981]/30"
                            : "size-9 bg-transparent text-ink-3 dark:text-[#b1ada1] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:text-ink dark:hover:text-[#f4f3ee]"
                        }`}
                        aria-label={pill.label}
                      >
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2.3 : 1.8}
                          className="shrink-0 transition-transform duration-200"
                        />

                        <AnimatePresence>
                          {isActive && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="font-bold text-xs whitespace-nowrap select-none overflow-hidden"
                            >
                              {pill.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </Tooltip>
                  );
                })}
              </nav>
            )}

            {/* Sandwich Button */}
            <div className={isEmbed ? "flex relative z-50" : "flex lg:hidden relative z-50"} ref={mobileMenuRef}>
              <Tooltip content={mobileMenuOpen ? "Close menu" : "Menu"} position="bottom">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  type="button"
                  aria-label={mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
                  className={`size-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    mobileMenuOpen
                      ? "bg-[#2E6B5E]/15 text-[#2E6B5E] border border-[#2E6B5E]/30 dark:bg-[#10b981]/25 dark:text-[#10b981] dark:border-[#10b981]/40 shadow-xs"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-ink dark:text-[#f4f3ee] border border-black/10 dark:border-white/15 hover:bg-black/[0.08] dark:hover:bg-white/[0.12] shadow-xs"
                  }`}
                >
                  {mobileMenuOpen ? (
                    <X size={18} strokeWidth={2.4} />
                  ) : (
                    <Menu size={18} strokeWidth={2.4} />
                  )}
                </motion.button>
              </Tooltip>

              {/* Mobile / Tablet Sandwich Dropdown Popup */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-11 sm:top-12 z-50 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-2.5 divide-y divide-black/[0.06] dark:divide-white/[0.06] origin-top-right"
                  >
                    {!userProfile?.name && onOpenProfile && (
                      <div className="pb-2 px-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-7 rounded-full bg-[#2E6B5E]/15 dark:bg-[#10b981]/20 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] font-bold text-xs shrink-0">
                            <User size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-ink dark:text-[#f4f3ee] truncate">
                              Student Profile
                            </p>
                            <p className="text-[10px] text-ink-3 dark:text-[#b1ada1] truncate">
                              Add name & details
                            </p>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenProfile();
                          }}
                          className="text-[10.5px] font-semibold text-[#2E6B5E] dark:text-[#10b981] hover:underline cursor-pointer shrink-0 ml-1"
                        >
                          Set Up
                        </motion.button>
                      </div>
                    )}

                    <div className="py-1.5 flex flex-col gap-0.5">
                      <motion.button
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNewChat();
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-ink dark:text-[#f4f3ee] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Plus size={16} className="text-[#2E6B5E] dark:text-[#10b981]" />
                        <span>Start New Chat</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenHistory();
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-ink dark:text-[#f4f3ee] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Clock size={16} className="text-[#2E6B5E] dark:text-[#10b981]" />
                        <span>Chat History</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (onOpenSettings) onOpenSettings();
                          else navigate("/settings");
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-ink dark:text-[#f4f3ee] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <Settings size={16} className="text-[#2E6B5E] dark:text-[#10b981]" />
                        <span>Settings & Voice</span>
                      </motion.button>

                      {isEmbed && (
                        <motion.button
                          whileHover={{ x: 3 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            const fullUrl = window.location.origin + window.location.pathname.replace(/\/$/, "");
                            window.open(fullUrl, "_blank");
                          }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-[#2E6B5E] dark:text-[#10b981] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer font-bold"
                        >
                          <ExternalLink size={16} />
                          <span>Open Full Website</span>
                        </motion.button>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-[11px] font-medium text-ink-3 dark:text-[#b1ada1] flex items-center gap-1.5">
                          {isDark ? <Moon size={14} /> : <Sun size={14} />}
                          Appearance
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={toggleTheme}
                          className="px-2 py-1 rounded-lg text-[10.5px] font-bold border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-ink dark:text-[#f4f3ee] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                        >
                          {isDark ? "Dark Mode" : "Light Mode"}
                        </motion.button>
                      </div>

                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-[11px] font-medium text-ink-3 dark:text-[#b1ada1] flex items-center gap-1.5">
                          <Type size={14} />
                          Text Size
                        </span>
                        <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-black/40 p-0.5 rounded-lg border border-black/[0.06] dark:border-white/[0.06]">
                          {(["normal", "large", "xlarge"] as const).map((sz) => (
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              key={sz}
                              type="button"
                              onClick={() => changeFontSize(sz)}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold transition-all cursor-pointer ${
                                fontSize === sz
                                  ? "bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-xs"
                                  : "text-ink-3 dark:text-[#b1ada1] hover:text-ink dark:hover:text-[#f4f3ee]"
                              }`}
                            >
                              {sz === "normal" ? "100%" : sz === "large" ? "115%" : "130%"}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop Accessibility Font Size Popover Modal */}
            <AnimatePresence>
              {fontSizeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -8 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  ref={fontSizeMenuRef}
                  className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-white dark:bg-[#18181b] border border-black/10 dark:border-white/10 shadow-2xl p-2 origin-top-right"
                >
                  <div className="px-3 py-1.5 border-b border-line/60 dark:border-white/[0.06]">
                    <p className="text-[11px] font-bold text-ink dark:text-[#f4f3ee]">
                      Text Size Settings
                    </p>
                    <p className="text-[9.5px] text-ink-3 dark:text-[#b1ada1]">
                      Easy reading for parents & low vision
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        changeFontSize("normal");
                        setFontSizeMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "normal"
                          ? "bg-[#2E6B5E]/15 text-[#2E6B5E] dark:bg-[#10b981]/20 dark:text-[#10b981] font-bold"
                          : "text-ink dark:text-[#f4f3ee] hover:bg-hover dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>Standard (100%)</span>
                      {fontSize === "normal" && (
                        <span className="text-[#2E6B5E] dark:text-[#10b981] text-[10px]">✓ Active</span>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        changeFontSize("large");
                        setFontSizeMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "large"
                          ? "bg-[#2E6B5E]/15 text-[#2E6B5E] dark:bg-[#10b981]/20 dark:text-[#10b981] font-bold"
                          : "text-ink dark:text-[#f4f3ee] hover:bg-hover dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>Large (+15% Parents)</span>
                      {fontSize === "large" && (
                        <span className="text-[#2E6B5E] dark:text-[#10b981] text-[10px]">✓ Active</span>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        changeFontSize("xlarge");
                        setFontSizeMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                        fontSize === "xlarge"
                          ? "bg-[#2E6B5E]/15 text-[#2E6B5E] dark:bg-[#10b981]/20 dark:text-[#10b981] font-bold"
                          : "text-ink dark:text-[#f4f3ee] hover:bg-hover dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span>Extra Large (+30%)</span>
                      {fontSize === "xlarge" && (
                        <span className="text-[#2E6B5E] dark:text-[#10b981] text-[10px]">✓ Active</span>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>
      </div>
    </>
  );
});

export default ChatHeader;

