import { useState, useEffect, useRef, FC } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EyeTracking } from "../ui/EyeTracking";
import { JellyBlobMascot, JellyEmotion } from "../ui/JellyBlobMascot";

const MINIMAL_MESSAGES = [
  "Ask Lorin AI",
  "Need help with admissions?",
  "Looking for courses?",
  "Ask me anything",
];

function useThemeDetector() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    const observer = new MutationObserver(() => checkDark());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

function useChatbotEmotions(isOpen: boolean) {
  const [currentText, setCurrentText] = useState(MINIMAL_MESSAGES[0] || "Ask Lorin AI");
  const idleIndexRef = useRef(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) return;

    const startIdleRotation = () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      idleIntervalRef.current = setInterval(() => {
        idleIndexRef.current = (idleIndexRef.current + 1) % MINIMAL_MESSAGES.length;
        const msg = MINIMAL_MESSAGES[idleIndexRef.current];
        if (msg) setCurrentText(msg);
      }, 6000);
    };

    startIdleRotation();

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.closest("[data-chatbot-launcher]")) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setCurrentText("Click to chat with me");
        return;
      }

      if (target.closest("a, button, [role='button'], input, select, textarea")) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setCurrentText("Curious about this?");
        hoverTimeoutRef.current = setTimeout(startIdleRotation, 4000);
        return;
      }
    };

    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 400) {
        lastScrollY = currentScrollY;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setCurrentText("Can I help you?");
        hoverTimeoutRef.current = setTimeout(startIdleRotation, 4000);
      }
    };

    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (idleIntervalRef.current) clearInterval(idleIntervalRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  return currentText;
}

interface ChatbotWidgetProps {
  botUrl?: string;
  title?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const ChatbotWidget: FC<ChatbotWidgetProps> = ({
  botUrl,
  title = "Lorin AI",
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnToggle || (() => setInternalIsOpen((prev) => !prev));

  const [isLoading, setIsLoading] = useState(true);
  const isDark = useThemeDetector();
  const textMessage = useChatbotEmotions(isOpen);

  const embedUrl = botUrl
    ? botUrl.includes("?")
      ? `${botUrl}&embed=true`
      : `${botUrl}/?embed=true`
    : null;

  return (
    <div className="fixed bottom-0 right-4 sm:right-8 md:right-10 z-[999999] select-none font-sans pointer-events-auto">
      {/* Open Chat Window Modal if embedUrl provided */}
      <AnimatePresence>
        {isOpen && embedUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.82, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.82, y: 28 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 28,
              mass: 0.8,
            }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-4 sm:right-8 md:right-10 w-[360px] sm:w-[430px] md:w-[460px] h-[640px] max-h-[calc(100vh-120px)] bg-surface border border-line dark:border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[1000000] backdrop-blur-xl will-change-transform"
          >
            <div className="relative w-full h-full bg-canvas overflow-hidden flex-1">
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas/95 backdrop-blur-md text-ink"
                  >
                    <div className="relative flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                      <JellyBlobMascot emotion="hmm" size={64} />
                      <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-spin" />
                    </div>
                    <span className="text-xs font-heading uppercase tracking-wider text-ink-3">
                      Connecting to {title}...
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <iframe
                src={embedUrl}
                title={title}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full border-none bg-canvas"
                allow="microphone; camera; clipboard-write; encrypted-media; autoplay"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Sticky Mascot & Interactive Launcher */}
      <div 
        data-chatbot-launcher="true"
        className="relative group cursor-pointer flex flex-col items-center"
      >
        {/* Floating Minimal Speech Bubble */}
        {!isOpen && (
          <div className="absolute bottom-[calc(100%-0.4rem)] mb-0.5 flex flex-col items-center pointer-events-none transition-all duration-300 opacity-95 group-hover:opacity-100 group-hover:-translate-y-1.5 z-20">
            <motion.div
              key={textMessage}
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative px-2.5 py-1 bg-white dark:bg-[#121214] text-slate-900 dark:text-white font-heading text-[11px] uppercase font-bold tracking-wider rounded-lg shadow-[0_6px_20px_rgba(0,0,0,0.14)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.6)] flex items-center gap-1.5 border border-slate-200/90 dark:border-white/15 whitespace-nowrap leading-none"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span>{textMessage}</span>
            </motion.div>
            <div className="w-2 h-2 bg-white dark:bg-[#121214] rotate-45 -mt-1 border-r border-b border-slate-200/90 dark:border-white/15" />
          </div>
        )}

        {/* Interactive Jelly Mascot Button */}
        <motion.button
          type="button"
          onClick={() => setIsOpen()}
          whileHover={{ y: -4, scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 450, damping: 22 }}
          className="relative block focus:outline-none cursor-pointer"
          aria-label={isOpen ? "Close Lorin AI Assistant" : "Open Lorin AI Assistant"}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.div
                key="bot-close-mode"
                initial={{ opacity: 0, scale: 0.75, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className="relative px-3.5 pt-2 pb-4 rounded-t-2xl bg-gradient-to-b from-[#2E6B5E] via-[#24544a] to-[#1a3d36] dark:from-[#10b981] dark:via-[#059669] dark:to-[#047857] border-t-2 border-x-2 border-white/30 dark:border-white/25 shadow-[0_-6px_22px_rgba(46,107,94,0.35)] dark:shadow-[0_-6px_25px_rgba(0,0,0,0.7)] backdrop-blur-md flex flex-col items-center justify-center select-none"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shadow-[0_0_8px_rgba(110,231,183,0.9)]" />
                  <span className="text-[9px] font-heading font-black uppercase tracking-wider text-white/95 leading-none">
                    CLOSE
                  </span>
                </div>

                <div className="relative flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl bg-black/30 border border-white/20 text-white shadow-inner">
                  <span className="w-1 h-2.5 rounded-full bg-white/45" />
                  <motion.div
                    initial={{ rotate: -90, scale: 0.6 }}
                    animate={{ rotate: 0, scale: 1 }}
                    exit={{ rotate: 90, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  >
                    <X className="w-4 h-4 stroke-[3] text-white" />
                  </motion.div>
                  <span className="w-1 h-2.5 rounded-full bg-white/45" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="bot-idle-mode"
                initial={{ opacity: 0, scale: 0.75, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.75, y: 8 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
                className="relative px-3 pt-1 pb-3 rounded-t-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-[#1E1E24] dark:via-[#18181B] dark:to-[#0F0F12] border-t-2 border-x-2 border-[#2E6B5E]/40 dark:border-[#10b981]/50 shadow-[0_-6px_22px_rgba(46,107,94,0.18)] dark:shadow-[0_-6px_25px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center justify-center transition-colors"
              >
                <JellyBlobMascot emotion="wave" size={44} interactive={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};

export const LorinChatWidget = ChatbotWidget;
export default ChatbotWidget;
