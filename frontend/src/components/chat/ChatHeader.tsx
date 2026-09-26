import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

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

export default function ChatHeader({
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

  const [activePill, setActivePill] = useState<string>("chat");

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
        !fontSizeMenuRef.current.contains(target)
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
    {
      id: "profile",
      label: userProfile?.name ? userProfile.name.split(" ")[0] : "Profile",
      icon: User,
      action: () => {
        if (onOpenProfile) onOpenProfile();
        setActivePill("profile");
      },
    },
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
    <div className="fixed top-2.5 sm:top-3 left-0 right-0 z-40 px-2 sm:px-4 pointer-events-none">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="pointer-events-auto max-w-3xl lg:max-w-4xl mx-auto h-14 sm:h-16 backdrop-blur-2xl backdrop-saturate-180 bg-white/45 dark:bg-[#14151a]/55 border border-white/70 dark:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-full flex items-center justify-between px-3.5 sm:px-6 transition-all"
      >
        {/* ── Brand & Badges ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Tooltip content="Start New Chat" position="bottom">
            <motion.div
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNewChat}
              className="flex size-9 items-center justify-center rounded-full overflow-hidden shadow-sm border border-black/10 dark:border-white/20 cursor-pointer shrink-0 bg-black ring-1 ring-accent/30 p-0.5"
            >
              <img src="/lorin-pic.png" alt="Lorin AI" className="w-full h-full object-cover rounded-full" />
            </motion.div>
          </Tooltip>

          <div className="flex flex-col justify-center min-w-0 leading-none">
            {/* Top Row: MSAJCE */}
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[9px] sm:text-[9.5px] font-mono font-extrabold uppercase tracking-wider text-[#2E6B5E] dark:text-[#10b981] leading-none">
                MSAJCE
              </span>
              <span className="hidden sm:inline-block rounded-full bg-[#D0CCE5]/60 dark:bg-[#4C1D95]/30 px-1.5 py-0.2 text-[8.5px] font-medium text-[#4C1D95] dark:text-[#c4b5fd] dark:border dark:border-[#4C1D95]/40 leading-none">
                TNEA 1301
              </span>
            </div>
            {/* Bottom Row: Lorin AI */}
            <h1 className="text-xs sm:text-sm font-heading font-extrabold text-ink dark:text-[#f4f3ee] tracking-tight whitespace-nowrap leading-tight mt-0.5">
              Lorin AI
            </h1>
          </div>
        </div>

        {/* ── HEADER NAVBAR RIGHT SIDE ── */}
        <div className="flex items-center gap-1.5 relative">
          {/* 1. PC View: Expandable Pill Navbar (Visible only on Desktop lg+, and hidden if embedded) */}
          {!isEmbed && (
            <motion.nav
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="hidden lg:flex rounded-full items-center p-1 border border-black/[0.08] dark:border-white/[0.09] bg-[#E8E5DA]/85 dark:bg-[#07080a]/90 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            >
              {headerPills.map((pill) => {
                const Icon = pill.icon;
                const isActive = activePill === pill.id;

                return (
                  <Tooltip key={pill.id} content={pill.label} position="bottom">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.04 }}
                      onClick={pill.action}
                      type="button"
                      className={`flex items-center gap-0 px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 relative h-9 min-w-[36px] sm:min-w-[38px] cursor-pointer overflow-hidden ${
                        isActive
                          ? "bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md shadow-[#2E6B5E]/30 dark:shadow-[#10b981]/30"
                          : "bg-transparent text-ink-3 dark:text-[#b1ada1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-ink dark:hover:text-[#f4f3ee]"
                      }`}
                      aria-label={pill.label}
                    >
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2.3 : 1.8}
                        className="shrink-0 transition-transform duration-200"
                      />

                      <motion.div
                        initial={false}
                        animate={{
                          width: isActive ? "62px" : "0px",
                          opacity: isActive ? 1 : 0,
                          marginLeft: isActive ? "5px" : "0px",
                        }}
                        transition={{
                          width: { type: "spring", stiffness: 350, damping: 30 },
                          opacity: { duration: 0.18 },
                          marginLeft: { duration: 0.18 },
                        }}
                        className="overflow-hidden flex items-center whitespace-nowrap"
                      >
                        <span
                          className={`font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 truncate ${
                            isActive ? "text-white dark:text-zinc-950 font-bold" : "opacity-0"
                          }`}
                        >
                          {pill.label}
                        </span>
                      </motion.div>
                    </motion.button>
                  </Tooltip>
                );
              })}
            </motion.nav>
          )}

          {/* 2. Mobile, Tablet & Iframe: Minimal 3-Line Sandwich Button (☰) */}
          <div className={isEmbed ? "flex relative" : "flex lg:hidden relative"} ref={mobileMenuRef}>
            <Tooltip content={mobileMenuOpen ? "Close menu" : "Menu"} position="bottom">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                type="button"
                aria-label="Navigation Menu"
                className="size-9 rounded-full flex items-center justify-center border border-black/10 dark:border-white/15 bg-[#E8E5DA]/90 dark:bg-[#07080a]/90 text-ink dark:text-[#f4f3ee] hover:bg-black/5 dark:hover:bg-white/10 shadow-sm transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <X size={19} strokeWidth={2.4} className="text-[#2E6B5E] dark:text-[#10b981]" />
                ) : (
                  <Menu size={19} strokeWidth={2.4} />
                )}
              </motion.button>
            </Tooltip>

            {/* Mobile / Tablet / Iframe Dropdown Panel */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white/95 dark:bg-[#14151a]/95 border border-black/10 dark:border-white/10 shadow-2xl p-2.5 backdrop-blur-2xl divide-y divide-black/[0.06] dark:divide-white/[0.06]"
                >
                  {/* User Profile Header */}
                  <div className="pb-2 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-7 rounded-full bg-[#2E6B5E]/15 dark:bg-[#10b981]/20 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] font-bold text-xs shrink-0">
                        {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink dark:text-[#f4f3ee] truncate">
                          {userProfile?.name || "Student Guest"}
                        </p>
                        <p className="text-[10px] text-ink-3 dark:text-[#b1ada1] truncate">
                          {userProfile?.purpose || "MSAJCEA Applicant"}
                        </p>
                      </div>
                    </div>
                    {onOpenProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="text-[10.5px] font-semibold text-[#2E6B5E] dark:text-[#10b981] hover:underline cursor-pointer shrink-0 ml-1"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="py-1.5 flex flex-col gap-0.5">
                    {/* New Chat */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onNewChat();
                      }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-ink dark:text-[#f4f3ee] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <Plus size={16} className="text-[#2E6B5E] dark:text-[#10b981]" />
                      <span>Start New Chat</span>
                    </button>

                    {/* Chat History */}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenHistory();
                      }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-ink dark:text-[#f4f3ee] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <Clock size={16} className="text-[#2E6B5E] dark:text-[#10b981]" />
                      <span>Chat History</span>
                    </button>

                    {/* Settings */}
                    <button
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
                    </button>

                    {/* Open in Fullscreen (if iframe) */}
                    {isEmbed && (
                      <>
                        <button
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
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            window.parent.postMessage({ type: "close-lorin-widget" }, "*");
                          }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                          <span>Close Window</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Settings & Appearance */}
                  <div className="pt-2 flex flex-col gap-1.5">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[11px] font-medium text-ink-3 dark:text-[#b1ada1] flex items-center gap-1.5">
                        {isDark ? <Moon size={14} /> : <Sun size={14} />}
                        Appearance
                      </span>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="px-2 py-1 rounded-lg text-[10.5px] font-bold border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.06] text-ink dark:text-[#f4f3ee] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
                      >
                        {isDark ? "Dark Mode" : "Light Mode"}
                      </button>
                    </div>

                    {/* Font Size Selector */}
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-[11px] font-medium text-ink-3 dark:text-[#b1ada1] flex items-center gap-1.5">
                        <Type size={14} />
                        Text Size
                      </span>
                      <div className="flex items-center gap-1 bg-black/[0.04] dark:bg-black/40 p-0.5 rounded-lg border border-black/[0.06] dark:border-white/[0.06]">
                        {(["normal", "large", "xlarge"] as const).map((sz) => (
                          <button
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
                          </button>
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
                ref={fontSizeMenuRef}
                initial={{ opacity: 0, scale: 0.94, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 6 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="absolute right-0 top-12 z-50 w-56 rounded-2xl bg-surface dark:bg-[#14151a] border border-line dark:border-white/[0.08] shadow-2xl p-2 backdrop-blur-2xl"
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
  );
}
