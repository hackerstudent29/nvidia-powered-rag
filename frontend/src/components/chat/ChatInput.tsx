import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../Tooltip";
import { RateLimitInfo } from "../../types/chat";

interface ChatInputProps {
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendMessage: (message: string) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  showChips?: boolean;
  rateLimitInfo?: RateLimitInfo | null;
  onClearRateLimit?: () => void;
  /** Passed from useMobileLayout — enables mobile-specific chip layout */
  isMobile?: boolean;
}

const DISCLAIMER_SENTENCES = [
  "Lorin AI is an experimental AI campus assistant grounded on official Mohamed Sathak A.J. College of Engineering and Architecture records.",
  "AI models can occasionally make mistakes or produce outdated details — answers are not guaranteed to be 100% accurate.",
  "Please verify critical fee structures, admission criteria, and scholarship policies directly with the official MSAJCEA Admission Office.",
  "Lorin AI assumes no legal liability for admission decisions or financial commitments made based solely on generated chat responses.",
  "Official college circulars, Anna University regulations, and MSAJCEA administrative notices override any AI-generated content."
];

const QUICK_CHIPS = [
  {
    label: "Admission Guide",
    query: "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCEA?",
  },
  {
    label: "Courses Offered",
    query: "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCEA?",
  },
  {
    label: "Campus Placements",
    query: "Who are the top recruiters, placement statistics, and highest salary package at MSAJCEA?",
  },
  {
    label: "Scholarships",
    query: "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCEA?",
  },
  {
    label: "Boys Hostel",
    query: "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCEA?",
  },
  {
    label: "Girls Hostel",
    query: "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCEA?",
  },
  {
    label: "Bus Routes",
    query: "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCEA?",
  },
  {
    label: "Mess & Canteen",
    query: "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCEA?",
  },
  {
    label: "Central Library",
    query: "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCEA.",
  },
  {
    label: "Lab Facilities",
    query: "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCEA?",
  },
  {
    label: "Campus Life",
    query: "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCEA?",
  },
  {
    label: "Contact Info",
    query: "What is the official contact info, phone numbers, email addresses, and location map for MSAJCEA?",
  },
];

const ChatInput = function ChatInput({
  inputValue = "",
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  showChips = true,
  rateLimitInfo,
  onClearRateLimit,
  isMobile = false,
}: ChatInputProps) {
  const [text, setText] = useState(inputValue || "");
  const [isListening, setIsListening] = useState(false);
  const [disclaimerIdx, setDisclaimerIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ticking countdown timer for rate limit reset
  useEffect(() => {
    if (!rateLimitInfo?.untilTimestamp) return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((rateLimitInfo.untilTimestamp - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && onClearRateLimit) {
        onClearRateLimit();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo, onClearRateLimit]);

  const formatCountdown = (totalSecs: number) => {
    if (totalSecs <= 0) return "0s";
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Sync local text when external prop `inputValue` changes (e.g. clicking prompt chips)
  useEffect(() => {
    if (inputValue !== undefined && inputValue !== text) {
      setText(inputValue);
    }
  }, [inputValue]);

  // Rotate disclaimer sentences smoothly every 4.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setDisclaimerIdx((prev) => (prev + 1) % DISCLAIMER_SENTENCES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Smooth, non-blocking auto-resize textarea via requestAnimationFrame
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handle = requestAnimationFrame(() => {
      if (!el) return;
      el.style.height = "auto";
      const maxHeight = Math.min(window.innerHeight * 0.35, 260);
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    });
    return () => cancelAnimationFrame(handle);
  }, [text]);

  // Global Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        textareaRef.current?.focus();
      }

      if (e.key === "/") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setText("");
    if (onInputChange) onInputChange("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn("Speech recognition stop error", err);
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          const updated = text ? `${text.trim()} ${finalTranscript.trim()}` : finalTranscript.trim();
          setText(updated);
          if (onInputChange) onInputChange(updated);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
    }
  };

  return (
    <div
      className="sticky bottom-0 z-20 pb-2.5 pt-1 bg-gradient-to-t from-canvas via-canvas/95 to-transparent w-full"
      style={{
        // Shift entire input up by the iOS keyboard height when open.
        // --keyboard-offset is injected by ChatView via useMobileLayout.
        paddingBottom: `max(10px, calc(10px + var(--keyboard-offset, 0px)))`,
      }}
    >
      <div className="mx-auto max-w-5xl w-full min-w-0 px-3 sm:px-6 box-border">
        {/* Rate Limit Alert Banner Tab */}
        <AnimatePresence>
          {rateLimitInfo && rateLimitInfo.isLimited && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="mb-2.5 w-full rounded-2xl border bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-100 p-3 sm:p-3.5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-amber-900 dark:text-amber-100">
                      {rateLimitInfo.message}
                    </span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-500/30">
                      5:30 AM Daily Reset
                    </span>
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-amber-800/90 dark:text-amber-200/90 mt-0.5 font-medium">
                    Lorin AI will be available again{" "}
                    <strong className="text-amber-950 dark:text-white underline decoration-amber-400">
                      {rateLimitInfo.resetTimeString}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 border border-amber-500/30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-100">
                    {formatCountdown(secondsLeft)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Suggestion Chips
             Desktop: CSS marquee animation for infinite scroll effect
             Mobile:  Native overflow-x scroll — no animation jank on low-end devices */}
        {showChips && (
          isMobile ? (
            // Native scroll on mobile — no marquee animation (causes layout thrash)
            <div className="w-full overflow-x-auto pb-1.5 animate-in fade-in duration-200"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              <div className="flex items-center gap-1.5 w-max pr-3">
                {QUICK_CHIPS.map((chip, idx) => {
                  const colors = [
                    "bg-[#E1EED7]/70 text-[#2E6B5E] dark:bg-[#2E6B5E]/20 dark:text-[#6ee7b7] dark:border-[#2E6B5E]/40",
                    "bg-[#D0CCE5]/70 text-[#4C1D95] dark:bg-[#4C1D95]/20 dark:text-[#c4b5fd] dark:border-[#4C1D95]/40",
                    "bg-[#D0E7E1]/70 text-[#1F7A5F] dark:bg-[#1F7A5F]/20 dark:text-[#5eead4] dark:border-[#1F7A5F]/40",
                    "bg-[#F2CFDF]/70 text-[#9D174D] dark:bg-[#9D174D]/20 dark:text-[#f472b6] dark:border-[#9D174D]/40",
                    "bg-[#FFE4C4]/70 text-[#9A3412] dark:bg-[#9A3412]/20 dark:text-[#fdba74] dark:border-[#9A3412]/40",
                    "bg-[#FCE7F3]/70 text-[#BE185D] dark:bg-[#BE185D]/20 dark:text-[#f472b6] dark:border-[#BE185D]/40",
                    "bg-[#F7F6ED] text-ink-2 dark:bg-zinc-800/80 dark:text-[#b1ada1] dark:border-zinc-700/60",
                    "bg-[#FEF3C7]/70 text-[#B45309] dark:bg-[#B45309]/20 dark:text-[#fcd34d] dark:border-[#B45309]/40",
                    "bg-[#DCFCE7]/70 text-[#15803D] dark:bg-[#15803D]/20 dark:text-[#86efac] dark:border-[#15803D]/40",
                    "bg-[#E0F2FE]/70 text-[#0369A1] dark:bg-[#0369A1]/20 dark:text-[#7dd3fc] dark:border-[#0369A1]/40",
                    "bg-[#EDE9FE]/70 text-[#6D28D9] dark:bg-[#6D28D9]/20 dark:text-[#c4b5fd] dark:border-[#6D28D9]/40",
                    "bg-[#FFEDD5]/70 text-[#C2410C] dark:bg-[#C2410C]/20 dark:text-[#fdba74] dark:border-[#C2410C]/40",
                  ];
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => onSendMessage(chip.query)}
                      disabled={isStreaming || !!rateLimitInfo?.isLimited}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium shrink-0 border border-line shadow-hairline active:scale-95 transition-transform duration-100 cursor-pointer ${
                        colors[idx % colors.length]
                      } disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Desktop: CSS marquee for infinite scroll feel
            <div className="relative w-full overflow-hidden pb-1.5 group animate-in fade-in duration-200">
              <div className="overflow-hidden w-full relative [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)]">
                <div className="animate-marquee flex items-center gap-1.5">
                  {[...QUICK_CHIPS, ...QUICK_CHIPS].map((chip, idx) => {
                    const colors = [
                      "bg-[#E1EED7]/70 text-[#2E6B5E] hover:bg-[#E1EED7] dark:bg-[#2E6B5E]/20 dark:text-[#6ee7b7] dark:border-[#2E6B5E]/40 dark:hover:bg-[#2E6B5E]/35",
                      "bg-[#D0CCE5]/70 text-[#4C1D95] hover:bg-[#D0CCE5] dark:bg-[#4C1D95]/20 dark:text-[#c4b5fd] dark:border-[#4C1D95]/40 dark:hover:bg-[#4C1D95]/35",
                      "bg-[#D0E7E1]/70 text-[#1F7A5F] hover:bg-[#D0E7E1] dark:bg-[#1F7A5F]/20 dark:text-[#5eead4] dark:border-[#1F7A5F]/40 dark:hover:bg-[#1F7A5F]/35",
                      "bg-[#F2CFDF]/70 text-[#9D174D] hover:bg-[#F2CFDF] dark:bg-[#9D174D]/20 dark:text-[#f472b6] dark:border-[#9D174D]/40 dark:hover:bg-[#9D174D]/35",
                      "bg-[#FFE4C4]/70 text-[#9A3412] hover:bg-[#FFE4C4] dark:bg-[#9A3412]/20 dark:text-[#fdba74] dark:border-[#9A3412]/40 dark:hover:bg-[#9A3412]/35",
                      "bg-[#FCE7F3]/70 text-[#BE185D] hover:bg-[#FCE7F3] dark:bg-[#BE185D]/20 dark:text-[#f472b6] dark:border-[#BE185D]/40 dark:hover:bg-[#BE185D]/35",
                      "bg-[#F7F6ED] text-ink-2 hover:bg-surface dark:bg-zinc-800/80 dark:text-[#b1ada1] dark:border-zinc-700/60 dark:hover:bg-zinc-700/80",
                      "bg-[#FEF3C7]/70 text-[#B45309] hover:bg-[#FEF3C7] dark:bg-[#B45309]/20 dark:text-[#fcd34d] dark:border-[#B45309]/40 dark:hover:bg-[#B45309]/35",
                      "bg-[#DCFCE7]/70 text-[#15803D] hover:bg-[#DCFCE7] dark:bg-[#15803D]/20 dark:text-[#86efac] dark:border-[#15803D]/40 dark:hover:bg-[#15803D]/35",
                      "bg-[#E0F2FE]/70 text-[#0369A1] hover:bg-[#E0F2FE] dark:bg-[#0369A1]/20 dark:text-[#7dd3fc] dark:border-[#0369A1]/40 dark:hover:bg-[#0369A1]/35",
                      "bg-[#EDE9FE]/70 text-[#6D28D9] hover:bg-[#EDE9FE] dark:bg-[#6D28D9]/20 dark:text-[#c4b5fd] dark:border-[#6D28D9]/40 dark:hover:bg-[#6D28D9]/35",
                      "bg-[#FFEDD5]/70 text-[#C2410C] hover:bg-[#FFEDD5] dark:bg-[#C2410C]/20 dark:text-[#fdba74] dark:border-[#C2410C]/40 dark:hover:bg-[#C2410C]/35",
                    ];
                    return (
                      <button
                        key={`${chip.label}-${idx}`}
                        type="button"
                        onClick={() => onSendMessage(chip.query)}
                        disabled={isStreaming || !!rateLimitInfo?.isLimited}
                        className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-medium transition-transform duration-150 hover:scale-105 active:scale-95 shrink-0 border border-line shadow-hairline cursor-pointer ${
                          colors[idx % colors.length]
                        } disabled:opacity-50 disabled:pointer-events-none`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        )}

        {/* Floating Auto-Expanding Production Input Box */}
        <div className="relative flex flex-col justify-between rounded-2xl sm:rounded-3xl glass-floating-input p-2.5 sm:p-3 overflow-hidden shadow-lg transition-all duration-200">
          <div className="w-full px-1 pt-0.5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about MSAJCEA (fees, courses, cutoff, hostels, faculty, placements)..."
              rows={1}
              className="w-full resize-none bg-transparent px-1 py-0.5 text-[13.5px] sm:text-[14px] text-ink placeholder:text-ink-3/65 focus:outline-none max-h-[35vh] overflow-y-auto font-medium leading-relaxed block"
            />
          </div>

          <div className="flex items-center justify-end pt-1 gap-1.5 shrink-0">
            {/* Mic Speech-to-Text Button — tap-target ensures 44px min on mobile */}
            <Tooltip content={isListening ? "Listening..." : "Voice Input"} position="top">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={handleVoiceInput}
                className={`tap-target flex items-center justify-center size-9 sm:size-8 rounded-full transition-all duration-150 ${
                  isListening
                    ? "bg-red text-white animate-bounce shadow-md"
                    : "text-ink-3 hover:text-accent hover:bg-accent/10"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </motion.button>
            </Tooltip>

            {/* Send or Stop Button — tap-target ensures 44px min on mobile */}
            {isStreaming ? (
              <Tooltip content="Stop generating" position="top">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={onStopStreaming}
                  className="tap-target flex items-center justify-center size-9 rounded-full bg-red text-white hover:opacity-90 shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </motion.button>
              </Tooltip>
            ) : (
              <Tooltip content="Send message (Enter)" position="top">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => handleSubmit()}
                  className="tap-target flex items-center justify-center size-9 rounded-full bg-[#2E6B5E] dark:bg-[#10b981] text-white dark:text-zinc-950 shadow-md hover:shadow-lg hover:scale-105 transition-all shrink-0 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </motion.button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 1-Sentence Rotating Disclaimer Banner — hidden on mobile to save space */}
        {!isMobile && (
          <div className="mt-1.5 h-4 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={disclaimerIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="text-[10px] text-ink-3/80 font-medium text-center truncate max-w-2xl px-2"
              >
                {DISCLAIMER_SENTENCES[disclaimerIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatInput);
