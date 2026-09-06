import { useEffect, useRef } from "react";
import { Session } from "../../types/chat";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../Tooltip";

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

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    };
    const onTouchEnd = () => {
      // If user swipes down more than 80px — close the drawer
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

  // ── Mobile: Full-width Bottom Sheet ──
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              ref={sheetRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.38 }}
              onClick={(e) => e.stopPropagation()}
              className="bottom-sheet relative w-full bg-surface shadow-2xl border-t border-line flex flex-col max-h-[80dvh]"
              style={{ maxHeight: "80dvh" }}
            >
              {/* Drag handle — visual affordance for swipe-to-close */}
              <div className="pt-3 pb-1">
                <div className="bottom-sheet-handle" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3 className="text-sm font-bold text-ink">Chat History</h3>
                  {sessions.length > 0 && (
                    <span className="rounded-full bg-inset px-2 py-0.5 text-[10px] font-semibold text-ink-3">
                      {sessions.length}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {sessions.length > 0 && onClearAllSessions && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Archive all chat history?")) onClearAllSessions();
                      }}
                      className="tap-target rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { onNewChat(); onClose(); }}
                    className="tap-target rounded-lg bg-inset px-2.5 py-1 text-xs font-medium text-ink hover:bg-hover transition-colors flex items-center gap-1"
                  >
                    <span>+</span> New
                  </button>
                </div>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5">
                {sessions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    No previous chat sessions found.
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    return (
                      <div
                        key={sess.id}
                        className={`group flex items-center justify-between rounded-xl px-3 min-h-[52px] transition-all text-xs cursor-pointer ${
                          isActive
                            ? "bg-accent/10 border border-accent/30 text-accent font-semibold"
                            : "hover:bg-inset text-ink border border-transparent"
                        }`}
                        onClick={() => { onSelectSession(sess.id); onClose(); }}
                      >
                        <div className="flex-1 truncate mr-2">
                          <p className="truncate font-medium text-[13px]">{sess.title || "Campus Chat"}</p>
                          <p className="text-[10px] text-ink-3 mt-0.5">
                            {sess.updated_at ? new Date(sess.updated_at).toLocaleDateString() : "Recent"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteSession(sess.id); }}
                          className="tap-target p-1.5 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop: Side Drawer (original behavior) ──
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-black/25 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full max-w-sm bg-surface p-5 shadow-2xl border-l border-line flex flex-col cursor-default"
          >
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3 className="text-sm font-bold text-ink">Chat History</h3>
              </div>

              <div className="flex items-center gap-1">
                {sessions.length > 0 && onClearAllSessions && (
                  <Tooltip content="Archive all chat history" position="top">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to archive all chat history?")) {
                          onClearAllSessions();
                        }
                      }}
                      className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                    >
                      Clear All
                    </button>
                  </Tooltip>
                )}
                <button
                  type="button"
                  onClick={() => { onNewChat(); onClose(); }}
                  className="rounded-lg bg-inset px-2.5 py-1 text-xs font-medium text-ink hover:bg-hover transition-colors flex items-center gap-1"
                >
                  <span>+</span> New Chat
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1.5">
              {sessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-3">
                  No previous chat sessions found.
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-all text-xs cursor-pointer ${
                        isActive
                          ? "bg-accent/10 border border-accent/30 text-accent font-semibold"
                          : "hover:bg-inset text-ink border border-transparent"
                      }`}
                      onClick={() => { onSelectSession(sess.id); onClose(); }}
                    >
                      <div className="flex-1 truncate mr-2">
                        <p className="truncate font-medium">{sess.title || "Campus Chat"}</p>
                        <p className="text-[10px] text-ink-3 mt-0.5">
                          {sess.updated_at ? new Date(sess.updated_at).toLocaleDateString() : "Recent"}
                        </p>
                      </div>

                      <Tooltip content="Delete session" position="top">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteSession(sess.id); }}
                          className="p-1.5 rounded-lg text-red-500/70 hover:text-red-600 hover:bg-red-500/10 transition-all flex items-center justify-center shrink-0 ml-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </Tooltip>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
