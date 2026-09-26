import React, { useState } from "react";
import { MessageSquare, X, Maximize2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LorinChatWidgetProps {
  /** The URL where your Lorin AI chatbot is hosted. Defaults to localhost or production deployment. */
  botUrl?: string;
  /** Optional custom title shown in the popup header */
  title?: string;
}

export const LorinChatWidget: React.FC<LorinChatWidgetProps> = ({
  botUrl = "http://localhost:5173",
  title = "Lorin AI",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Normalize URL and append embed flag
  const cleanBaseUrl = botUrl.replace(/\/$/, "");
  const embedUrl = `${cleanBaseUrl}/?embed=true`;

  const handleOpenFullscreen = () => {
    window.open(cleanBaseUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999999] font-sans antialiased pointer-events-auto">
      {/* ── CHAT POPUP WINDOW MODAL ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed bottom-24 right-6 w-[430px] max-w-[calc(100vw-32px)] h-[660px] max-h-[calc(100vh-120px)] bg-canvas dark:bg-[#121214] rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden origin-bottom-right"
          >
            {/* ── CLEAN CHATBOT FRONTEND IFRAME (NO REDUNDANT EXTRA HEADER) ── */}
            <div className="relative flex-1 w-full h-full bg-transparent overflow-hidden">
              {/* Loading Skeleton */}
              {!isIframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#121214] gap-3 z-10 transition-opacity">
                  <div className="w-8 h-8 rounded-full border-3 border-[#2E6B5E]/20 dark:border-[#10b981]/20 border-t-[#2E6B5E] dark:border-t-[#10b981] animate-spin" />
                  <span className="text-xs font-libre font-medium text-neutral-500 dark:text-neutral-400">
                    Connecting to Lorin AI...
                  </span>
                </div>
              )}

              <iframe
                src={embedUrl}
                title="Lorin AI Assistant"
                className="w-full h-full border-0"
                allow="clipboard-write; microphone"
                onLoad={() => setIsIframeLoaded(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING LAUNCHER ACTION BUTTON (FAB) ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle Lorin AI Chatbot"
        className="relative flex items-center justify-center w-[60px] h-[60px] rounded-full bg-gradient-to-tr from-[#9E2339] to-[#7b172a] text-white shadow-xl shadow-[#9E2339]/30 border-2 border-white/20 focus:outline-none transition-shadow"
      >
        {/* Pulsing Green Status Dot */}
        <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-[#121214]"></span>
        </span>

        {/* Icon toggle: Message / Sparkles or Close */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={26} strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <MessageSquare size={26} strokeWidth={2.2} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default LorinChatWidget;
