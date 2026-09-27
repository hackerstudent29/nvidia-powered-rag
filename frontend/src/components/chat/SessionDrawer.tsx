import { useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Session } from "../../types/chat";
import { Tooltip } from "../Tooltip";
import { audioManager } from "../../utils/audioManager";
import { MessageSquare, Trash2, Plus, X } from "lucide-react";

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  onNewChat: () => void;
  /** When true, renders as a full-width bottom sheet instead of a side drawer */
  isMobile?: boolean;
}

export default function SessionDrawer({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAllSessions,
  onNewChat,
  isMobile = false,
}: SessionDrawerProps) {
  // Swipe-to-close for mobile bottom sheet
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);

  // Stop playing audio immediately when drawer is closed
  useEffect(() => {
    if (!isOpen) {
      audioManager.stopAll();
    }
  }, [isOpen]);

  // Cache pre-formatted date strings for high-performance rendering
  const formattedSessions = useMemo(() => {
    return sessions.map((s) => ({
      ...s,
      dateStr: s.updated_at
        ? new Date(s.updated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recent",
    }));
  }, [sessions]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isMobile || !isOpen) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    };
    const onTouchEnd = () => {
      if (touchDeltaY.current > 80) onClose();
      touchDeltaY.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, onClose, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
          />

          {isMobile ? (
            /* Mobile Bottom Sheet */
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
              <motion.div
                ref={sheetRef}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bottom-sheet relative w-full bg-surface dark:bg-[#14151a] shadow-2xl border-t border-line dark:border-white/[0.06] flex flex-col pointer-events-auto rounded-t-3xl"
                style={{ maxHeight: "80dvh" }}
              >
                {/* Drag handle */}
                <div className="pt-3 pb-1 flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3 border-b border-line dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-accent dark:text-[#34d399]" />
                    <h3 className="text-sm font-bold text-ink dark:text-[#f4f3ee]">Chat History</h3>
                    {sessions.length > 0 && (
                      <span className="rounded-full bg-inset dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-ink-3 dark:text-zinc-400">
                        {sessions.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sessions.length > 0 && onClearAllSessions && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        onClick={() => {
                          if (window.confirm("Archive all chat history?")) onClearAllSessions();
                        }}
                        className="rounded-lg bg-red-500/10 dark:bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        Clear All
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => {
                        onNewChat();
                        onClose();
                      }}
                      className="rounded-lg bg-inset dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-ink dark:text-zinc-200 hover:bg-hover transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> New
                    </motion.button>
                  </div>
                </div>

                {/* Session list */}
                <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5 overscroll-contain">
                  {formattedSessions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-ink-3 dark:text-zinc-400">
                      No previous chat sessions found.
                    </div>
                  ) : (
                    formattedSessions.map((sess) => {
                      const isActive = sess.id === activeSessionId;
                      return (
                        <motion.div
                          key={sess.id}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 450, damping: 25 }}
                          className={`group flex items-center justify-between rounded-xl px-3 min-h-[48px] transition-colors text-xs cursor-pointer ${
                            isActive
                              ? "bg-accent/10 border border-accent/30 text-accent dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#34d399] font-semibold"
                              : "hover:bg-inset dark:hover:bg-zinc-800/60 text-ink dark:text-zinc-300 border border-transparent"
                          }`}
                          onClick={() => {
                            onSelectSession(sess.id);
                            onClose();
                          }}
                        >
                          <div className="flex-1 truncate mr-2">
                            <p className="truncate font-medium text-[13px]">{sess.title || "Campus Chat"}</p>
                            <p className="text-[10px] text-ink-3 dark:text-zinc-400 mt-0.5">
                              {sess.dateStr}
                            </p>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.85 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(sess.id);
                            }}
                            className="size-7 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          ) : (
            /* Desktop Side Drawer */
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end pointer-events-none">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="relative h-full w-full max-w-sm bg-surface dark:bg-[#14151a] p-5 shadow-2xl border-l border-line dark:border-white/[0.06] flex flex-col cursor-default pointer-events-auto"
              >
                <div className="flex items-center justify-between pb-4 border-b border-line dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-accent dark:text-[#34d399]" />
                    <h3 className="text-sm font-bold text-ink dark:text-[#f4f3ee]">Chat History</h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sessions.length > 0 && onClearAllSessions && (
                      <Tooltip content="Archive all chat history" position="top">
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to archive all chat history?")) {
                              onClearAllSessions();
                            }
                          }}
                          className="rounded-lg bg-red-500/10 dark:bg-red-500/20 px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                        >
                          Clear All
                        </motion.button>
                      </Tooltip>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      type="button"
                      onClick={() => {
                        onNewChat();
                        onClose();
                      }}
                      className="rounded-lg bg-inset dark:bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-ink dark:text-zinc-200 hover:bg-hover dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> New Chat
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={onClose}
                      className="rounded-lg p-1 text-ink-3 dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-hover transition-colors"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-1.5 overscroll-contain">
                  {formattedSessions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-ink-3 dark:text-zinc-400">
                      No previous chat sessions found.
                    </div>
                  ) : (
                    formattedSessions.map((sess) => {
                      const isActive = sess.id === activeSessionId;
                      return (
                        <motion.div
                          key={sess.id}
                          whileHover={{ scale: 1.01, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 450, damping: 25 }}
                          className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors text-xs cursor-pointer ${
                            isActive
                              ? "bg-accent/10 border border-accent/30 text-accent dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-[#34d399] font-semibold"
                              : "hover:bg-inset dark:hover:bg-zinc-800/60 text-ink dark:text-zinc-300 border border-transparent"
                          }`}
                          onClick={() => {
                            onSelectSession(sess.id);
                            onClose();
                          }}
                        >
                          <div className="flex-1 truncate mr-2">
                            <p className="truncate font-medium">{sess.title || "Campus Chat"}</p>
                            <p className="text-[10px] text-ink-3 dark:text-zinc-400 mt-0.5">
                              {sess.dateStr}
                            </p>
                          </div>

                          <Tooltip content="Delete session" position="top">
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.85 }}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(sess.id);
                              }}
                              className="p-1.5 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0 ml-1 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </Tooltip>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
