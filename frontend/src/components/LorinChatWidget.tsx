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
            className="fixed bottom-24 right-6 w-[430px] max-w-[calc(100vw-32px)] h-[660px] max-h-[calc(100vh-120px)] max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none bg-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col overflow-hidden origin-bottom-right"
          >
            {/* ── HEADER ── */}
            <div className="bg-[#9E2339] dark:bg-[#80182c] text-white px-4 py-3.5 flex items-center justify-between shadow-md select-none shrink-0 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/20 p-0.5 flex items-center justify-center shrink-0">
                  <img
                    src={`${cleanBaseUrl}/lorin-pic.png`}
                    alt="Lorin AI"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-oswald font-black text-sm uppercase tracking-wide leading-none">
                      {title}
                    </h3>
                    <span className="text-[9px] font-mono uppercase bg-white/20 px-1 py-0.5 rounded text-white/90 leading-none">
                      TNEA 1301
                    </span>
                  </div>
                  <p className="text-[11px] text-white/85 font-libre flex items-center gap-1.5 mt-0.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Official Campus Assistant
                  </p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Fullscreen Redirect Button */}
                <button
                  onClick={handleOpenFullscreen}
                  title="Open in Fullscreen"
                  aria-label="Open in Fullscreen"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                >
                  <Maximize2 size={16} strokeWidth={2.2} />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Chat"
                  aria-label="Close Chat"
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* ── IFRAME CONTAINER ── */}
            <div className="relative flex-1 w-full h-full bg-[#F3F3F2] dark:bg-[#18181B] overflow-hidden">
              {/* Loading Skeleton */}
              {!isIframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#121214] gap-3 z-10 transition-opacity">
                  <div className="w-8 h-8 rounded-full border-3 border-[#9E2339]/20 border-t-[#9E2339] animate-spin" />
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
