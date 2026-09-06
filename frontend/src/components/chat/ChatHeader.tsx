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
  ShieldCheck,
  Plus,
  GraduationCap
} from "lucide-react";

interface ChatHeaderProps {
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  isStreaming: boolean;
}

export default function ChatHeader({
  models: _models,
  selectedModel: _selectedModel,
  onSelectModel: _onSelectModel,
  onNewChat,
  onOpenHistory,
  isStreaming: _isStreaming,
}: ChatHeaderProps) {
  const navigate = useNavigate();
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const fontSizeMenuRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [fontSizeMenuOpen]);

  // Pill Header Items
  const headerPills = [
    {
      id: "new",
      label: "New Chat",
      icon: Plus,
      action: () => {
        onNewChat();
        setActivePill("new");
      },
    },
    {
      id: "history",
      label: "Chat History",
      icon: Clock,
      action: () => {
        onOpenHistory();
        setActivePill("history");
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
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="sticky top-0 z-30 w-full bg-canvas/90 dark:bg-[#0b0c0e]/90 backdrop-blur-xl border-b border-line dark:border-white/[0.08]"
    >
      <div className="mx-auto max-w-6xl w-full min-w-0 px-3 sm:px-6 py-2.5 flex items-center justify-between box-border gap-2">
        {/* ── Brand & Badges ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Tooltip content="Start New Chat" position="bottom">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNewChat}
              className="flex size-9 items-center justify-center rounded-2xl bg-surface dark:bg-[#14151a] shadow-sm border border-line dark:border-white/[0.08] cursor-pointer shrink-0"
            >
              <GraduationCap className="w-5 h-5 text-[#2E6B5E] dark:text-[#10b981]" />
            </motion.div>
          </Tooltip>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-heading font-bold text-ink dark:text-[#f4f3ee] tracking-tight whitespace-nowrap">
                Lorin AI
              </h1>
              <span className="rounded-full bg-[#E1EED7] dark:bg-[#2E6B5E]/30 px-2 py-0.5 text-[9.5px] font-semibold text-[#2E6B5E] dark:text-[#10b981] dark:border dark:border-[#2E6B5E]/40 whitespace-nowrap">
                MSAJCEA
              </span>
              <span className="hidden md:inline-block rounded-full bg-[#D0CCE5]/60 dark:bg-[#4C1D95]/30 px-2 py-0.5 text-[9.5px] font-medium text-[#4C1D95] dark:text-[#c4b5fd] dark:border dark:border-[#4C1D95]/40">
                TNEA 1301
              </span>
            </div>
          </div>
        </div>

        {/* ── EXPANDABLE PILL TOP HEADER NAVBAR (SHADCN / FRAMER MOTION) ── */}
        <div className="flex items-center gap-1.5 relative">
          <motion.nav
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="rounded-full flex items-center p-1 border border-black/[0.08] dark:border-white/[0.09] bg-[#E8E5DA]/80 dark:bg-[#07080a]/90 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)] backdrop-blur-xl"
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
                    className={`flex items-center gap-0 px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 relative h-9 min-w-[36px] sm:min-w-[40px] cursor-pointer overflow-hidden ${
                      isActive
                        ? "bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md"
                        : "bg-transparent text-ink-3 dark:text-[#b1ada1] hover:bg-hover dark:hover:bg-white/[0.06] hover:text-ink dark:hover:text-[#f4f3ee]"
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
                        width: isActive ? "72px" : "0px",
                        opacity: isActive ? 1 : 0,
                        marginLeft: isActive ? "6px" : "0px",
                      }}
                      transition={{
                        width: { type: "spring", stiffness: 350, damping: 30 },
                        opacity: { duration: 0.18 },
                        marginLeft: { duration: 0.18 },
                      }}
                      className="overflow-hidden flex items-center whitespace-nowrap hidden sm:flex"
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

          {/* Accessibility Font Size Popover Modal */}
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
      </div>
    </motion.header>
  );
}
