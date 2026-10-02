"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReasoningStep } from "../../types/chat";

/* ─────────────────────────────────────────────────────────
 * LORIN AI THINKING STATE — Old Visual Design + New Words
 * ───────────────────────────────────────────────────────── */

export type StepRow = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

export interface ThinkingStateProps {
  variant?: string;
  isLiveStreaming?: boolean;
  hasContent?: boolean;
  liveSteps?: (string | ReasoningStep | StepRow)[];
  durationSeconds?: number;
}

export interface StageInfo {
  icon: string;
  text: string;
  key: string;
}

/**
 * Normalizes raw pipeline steps into clean, human-friendly 2–5 word status phrases.
 * Strictly eliminates internal model monologues and technical jargon.
 */
export function normalizeStepToStage(raw: string): StageInfo | null {
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // Filter out internal model monologues or scratchpad sentences
  if (
    lower.startsWith("okay,") ||
    lower.startsWith("let me") ||
    lower.startsWith("looking at") ||
    lower.startsWith("this states") ||
    lower.startsWith("she also") ||
    lower.startsWith("he also") ||
    lower.startsWith("her contacts") ||
    lower.startsWith("his contacts") ||
    lower.startsWith("in this section") ||
    lower.startsWith("the user asks") ||
    lower.startsWith("the user is asking") ||
    lower.startsWith("first,") ||
    lower.startsWith("next,") ||
    lower.startsWith("based on the verified") ||
    lower.startsWith("we can see") ||
    lower.startsWith("note:") ||
    lower.includes("let me scan") ||
    lower.includes("let's check") ||
    lower.includes("scan through the knowledge")
  ) {
    return null;
  }

  // 1. Initial / Understanding stage
  if (
    lower.includes("understanding") ||
    lower.includes("interpreting") ||
    lower.includes("analyzing inquiry") ||
    lower.includes("analyzing query") ||
    lower.includes("intent") ||
    lower.includes("classifying") ||
    lower.includes("starting")
  ) {
    return { icon: "✦", text: "Understanding your question…", key: "understanding" };
  }

  // 2. Planning stage
  if (
    lower.includes("planning") ||
    lower.includes("breaking this") ||
    lower.includes("multi-step") ||
    lower.includes("parts") ||
    lower.includes("figuring out")
  ) {
    return { icon: "✦", text: "Breaking this into a few parts…", key: "planning" };
  }

  // 3. Document / PDF processing
  if (
    lower.includes("document") ||
    lower.includes("pdf") ||
    lower.includes("reading the") ||
    lower.includes("looking through the document")
  ) {
    return { icon: "✦", text: "Reading the relevant document…", key: "document" };
  }

  // 4. Searching multiple sources
  if (
    lower.includes("across relevant sources") ||
    lower.includes("checking multiple sources") ||
    lower.includes("multiple collections")
  ) {
    return { icon: "✦", text: "Searching across relevant sources…", key: "search_multi" };
  }

  // 5. Searching knowledge base / Retrieval
  if (
    lower.includes("searching") ||
    lower.includes("looking through") ||
    lower.includes("retrieving") ||
    lower.includes("qdrant") ||
    lower.includes("vector") ||
    lower.includes("bm25") ||
    lower.includes("scanning campus") ||
    lower.includes("knowledge base")
  ) {
    return { icon: "🔍", text: "Searching relevant information…", key: "searching" };
  }

  // 6. Found relevant information / counts
  if (lower.includes("found")) {
    const numMatch = lower.match(/found\s+(\d+)\s+relevant/);
    if (numMatch) {
      return { icon: "✦", text: `Found ${numMatch[1]} relevant sources…`, key: "found" };
    }
    return { icon: "✦", text: "Found relevant information…", key: "found" };
  }

  // 7. Reranking / Checking relevance
  if (
    lower.includes("rerank") ||
    lower.includes("cross-encoder") ||
    lower.includes("most relevant") ||
    lower.includes("checking which information") ||
    lower.includes("narrowing down")
  ) {
    return { icon: "✦", text: "Checking which information is most relevant…", key: "reranking" };
  }

  // 8. Reviewing sources
  if (
    lower.includes("reviewing") ||
    lower.includes("evaluating") ||
    lower.includes("checking the most relevant")
  ) {
    return { icon: "✦", text: "Reviewing relevant sources…", key: "reviewing" };
  }

  // 9. Cross-checking / Verification
  if (
    lower.includes("cross-checking") ||
    lower.includes("comparing") ||
    lower.includes("verifying details") ||
    lower.includes("checking answer against")
  ) {
    return { icon: "✦", text: "Cross-checking the information…", key: "cross_checking" };
  }

  // 10. Specific details (dates, fees, hostel, transport, etc.)
  if (
    lower.includes("details") ||
    lower.includes("fees") ||
    lower.includes("hostel") ||
    lower.includes("transport") ||
    lower.includes("location") ||
    lower.includes("dates")
  ) {
    return { icon: "✦", text: "Looking for the specific details…", key: "checking_details" };
  }

  // 11. Structured records
  if (lower.includes("records") || lower.includes("structured")) {
    return { icon: "✦", text: "Checking available records…", key: "structured_records" };
  }

  // 12. Preparing answer / formulating response
  if (
    lower.includes("preparing") ||
    lower.includes("putting everything together") ||
    lower.includes("writing the answer") ||
    lower.includes("synthesizing") ||
    lower.includes("formulating")
  ) {
    return { icon: "✦", text: "Preparing your answer…", key: "preparing" };
  }

  // Fallback for short custom steps: check if <= 40 chars
  if (s.length <= 40) {
    return { icon: "✦", text: s.endsWith("…") ? s : `${s}…`, key: "custom" };
  }

  return { icon: "✦", text: "Reviewing relevant sources…", key: "default_review" };
}

// 3x3 Pixel Grid loader matrix delays
const MATRIX_DELAYS = [0, 140, 280, 420, 560, 700, 840, 980, 1120];

/**
 * Timer hook for elapsed time formatting (e.g., "1.2s").
 * Freezes timer increment as soon as answer content starts streaming (`freeze = true`).
 */
function useElapsedTimer(active: boolean, freeze: boolean, initialSeconds?: number) {
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const frozenRef = useRef<number | null>(null);
  const lastCapturedRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setElapsedTenths(0);
      frozenRef.current = null;
      lastCapturedRef.current = 0;
      return;
    }

    if (freeze) {
      if (frozenRef.current === null) {
        frozenRef.current = elapsedTenths;
        lastCapturedRef.current = elapsedTenths;
      }
      return;
    }

    frozenRef.current = null;
    const timer = setInterval(() => {
      setElapsedTenths((prev) => {
        const next = prev + 1;
        lastCapturedRef.current = next;
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [active, freeze]);

  if (!active) {
    if (typeof initialSeconds === "number" && initialSeconds > 0) {
      if (initialSeconds < 60) return `${initialSeconds.toFixed(1)}s`;
      return `${Math.floor(initialSeconds / 60)}m ${(initialSeconds % 60).toFixed(1)}s`;
    }
    const finalSecs = (frozenRef.current !== null ? frozenRef.current : lastCapturedRef.current) / 10;
    if (finalSecs < 60) return `${finalSecs.toFixed(1)}s`;
    return `${Math.floor(finalSecs / 60)}m ${(finalSecs % 60).toFixed(1)}s`;
  }

  const tenthsToUse = (freeze && frozenRef.current !== null) ? frozenRef.current : elapsedTenths;
  const seconds = tenthsToUse / 10;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(1)}s`;
}

export default function ThinkingState({
  isLiveStreaming = false,
  hasContent = false,
  liveSteps,
  durationSeconds,
}: ThinkingStateProps) {
  const isWorking = !!isLiveStreaming;
  const shouldFreeze = isWorking && hasContent;
  const elapsed = useElapsedTimer(isWorking, shouldFreeze, durationSeconds);
  const [startTime] = useState<number>(() => Date.now());
  const [autoStageIdx, setAutoStageIdx] = useState<number>(0);
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  // Automatic state: Expanded ONLY while thinking before answer tokens arrive.
  // The moment the answer text begins streaming (hasContent = true) or completes, auto-collapse.
  const autoExpanded = isWorking && !hasContent;
  const isExpanded = manualExpanded !== null ? manualExpanded : autoExpanded;

  // Auto-progression schedule for smooth state updates when SSE steps are waiting
  useEffect(() => {
    if (!isWorking || hasContent) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      if (diff < 500) {
        setAutoStageIdx(0);
      } else if (diff < 1200) {
        setAutoStageIdx(1);
      } else if (diff < 2000) {
        setAutoStageIdx(2);
      } else {
        setAutoStageIdx(3);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isWorking, hasContent, startTime]);

  // Extract clean normalized stages from liveSteps
  const stages: StageInfo[] = useMemo(() => {
    if (!Array.isArray(liveSteps) || liveSteps.length === 0) return [];

    const list: StageInfo[] = [];
    const seen = new Set<string>();

    for (const item of liveSteps) {
      let rawText = "";
      if (typeof item === "string") {
        rawText = item;
      } else if (typeof item === "object" && item !== null) {
        rawText = (item as any).primary || (item as any).step || "";
      }

      const normalized = normalizeStepToStage(rawText);
      if (normalized && !seen.has(normalized.text)) {
        seen.add(normalized.text);
        list.push(normalized);
      }
    }
    return list;
  }, [liveSteps]);

  // Default stage sequence when no live steps sent yet
  const defaultStages: StageInfo[] = [
    { icon: "✦", text: "Understanding your question…", key: "understanding" },
    { icon: "🔍", text: "Searching relevant information…", key: "searching" },
    { icon: "✦", text: "Reviewing relevant sources…", key: "reviewing" },
    { icon: "✦", text: "Preparing your answer…", key: "preparing" },
  ];

  // Active step list to render in expanded timeline
  const activeStepsList: StageInfo[] = useMemo(() => {
    if (stages.length > 0) return stages;
    return defaultStages.slice(0, Math.min(autoStageIdx + 1, defaultStages.length));
  }, [stages, autoStageIdx]);

  // Active preview text for collapsed bar
  const activeStepText = useMemo(() => {
    if (activeStepsList.length === 0) return "Understanding your question…";
    return activeStepsList[activeStepsList.length - 1].text;
  }, [activeStepsList]);

  return (
    <div className="w-full max-w-full my-1.5 select-none font-sans">
      {/* ── Header / Collapsed Bar (Compact Inline Grid + Label + Preview + Adjacent Chevron) ── */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setManualExpanded((prev) => !(prev !== null ? prev : autoExpanded))}
        className="group inline-flex items-center gap-2 max-w-full rounded-md px-1 py-1 transition-colors duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer text-left focus:outline-none -ml-1"
      >
        {/* 3x3 Pixel Grid Wavefront Loader */}
        <span
          aria-hidden
          className="shrink-0 flex items-center justify-center"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 4px)",
            gridTemplateRows: "repeat(3, 4px)",
            gap: "1.5px",
            width: "15px",
            height: "15px",
          }}
        >
          {MATRIX_DELAYS.map((d, i) => (
            <span
              key={i}
              className="size-[4px] bg-[#9E2339] dark:bg-[#E11D48] rounded-[1px] block"
              style={{
                opacity: !isWorking ? 0.9 : 0.35,
                animation: !isWorking
                  ? "none"
                  : `pixel-on 1400ms ease-in-out ${d}ms infinite`,
              }}
            />
          ))}
        </span>

        {/* Shimmering State Label + Live Timer ON THE LEFT */}
        {isWorking ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="bg-clip-text text-[13.5px] font-semibold whitespace-nowrap text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(158,35,57,0.5) 30%, rgba(225,29,72,1) 50%, rgba(158,35,57,0.5) 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              Thinking
            </span>
            <span className="font-mono text-[12.5px] text-zinc-500 dark:text-zinc-400 tabular-nums font-normal">
              {elapsed}
            </span>
          </div>
        ) : (
          <span className="text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200 shrink-0">
            Thought for {elapsed}
          </span>
        )}

        {/* Active Step Preview in Collapsed View */}
        {!isExpanded && (
          <div className="flex items-center gap-1.5 min-w-0 max-w-xs sm:max-w-md overflow-hidden">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0">•</span>
            <div className="min-w-0 overflow-hidden relative h-[18px] flex items-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isWorking ? activeStepText : (activeStepsList.length > 0 ? `${activeStepsList.length}-done` : "done")}
                  initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className={`text-[12px] sm:text-[12.5px] truncate font-normal block ${
                    isWorking ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {isWorking
                    ? activeStepText
                    : activeStepsList.length > 0
                    ? `${activeStepsList.length} verified step${activeStepsList.length === 1 ? "" : "s"}`
                    : "Verified ground truth"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Chevron Arrow Placed Directly Next to the Thinking Text */}
        <span
          className="flex size-4 items-center justify-center text-zinc-400 dark:text-zinc-500 transition-transform duration-200 opacity-70 group-hover:opacity-100 shrink-0 ml-0.5"
          style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* ── Expandable Step-by-Step Reasoner Timeline ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden pl-2.5 border-l border-zinc-200 dark:border-zinc-800 my-1 ml-0.5"
          >
            <div className="flex flex-col gap-1.5 py-1">
              {activeStepsList.map((stg, idx) => {
                const isLast = idx === activeStepsList.length - 1;
                const isStepActive = isWorking && isLast;

                return (
                  <motion.div
                    key={`${stg.key}-${idx}`}
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-2 text-[12.5px] text-zinc-600 dark:text-zinc-300"
                  >
                    {/* Step Icon / Spinner / Checkmark */}
                    <div className="shrink-0 flex items-center justify-center size-3.5">
                      {isStepActive ? (
                        <span
                          className="size-2.5 rounded-full border-[1.5px] border-[#9E2339] border-t-transparent dark:border-[#E11D48] dark:border-t-transparent block"
                          style={{ animation: "spin 700ms linear infinite" }}
                        />
                      ) : (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-600 dark:text-emerald-400"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>

                    {/* Step Text (New 2-5 Word Human-Friendly Text) */}
                    <span className={`leading-snug ${isStepActive ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-300"}`}>
                      {stg.text.replace("…", "")}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
