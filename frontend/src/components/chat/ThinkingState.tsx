"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReasoningStep } from "../../types/chat";

/* ─────────────────────────────────────────────────────────
 * LORIN AI THINKING STATE — Production RAG Thinking Experience
 *
 * Principles:
 *  - Quiet, informative, and alive — gently pulsing ✦ icon
 *  - Truthful representation of pipeline events (2–5 words)
 *  - Zero technical jargon (no Qdrant, embeddings, reranker, tokens)
 *  - Zero internal chain-of-thought monologues
 *  - Smoothly vanishes as soon as response streaming starts (hasContent = true)
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

/**
 * Timer hook for elapsed time formatting (e.g., "1.2s")
 */
function useElapsedTimer(active: boolean, initialSeconds?: number) {
  const [elapsedTenths, setElapsedTenths] = useState(0);

  useEffect(() => {
    if (!active) return;
    setElapsedTenths(0);
    const timer = setInterval(() => {
      setElapsedTenths((prev) => prev + 1);
    }, 100);
    return () => clearInterval(timer);
  }, [active]);

  if (!active && typeof initialSeconds === "number" && initialSeconds > 0) {
    if (initialSeconds < 60) return `${initialSeconds.toFixed(1)}s`;
    return `${Math.floor(initialSeconds / 60)}m ${(initialSeconds % 60).toFixed(1)}s`;
  }

  const seconds = elapsedTenths / 10;
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
  const elapsed = useElapsedTimer(isWorking, durationSeconds);
  const [startTime] = useState<number>(() => Date.now());
  const [autoStageIdx, setAutoStageIdx] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Auto-progression schedule for smooth state updates when SSE steps are waiting
  useEffect(() => {
    if (!isWorking || hasContent) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - startTime;
      if (diff < 500) {
        setAutoStageIdx(0); // Understanding
      } else if (diff < 1200) {
        setAutoStageIdx(1); // Searching
      } else if (diff < 2000) {
        setAutoStageIdx(2); // Reviewing
      } else {
        setAutoStageIdx(3); // Preparing
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

  // Active current stage to show during thinking
  const currentStage: StageInfo = useMemo(() => {
    if (stages.length > 0) {
      return stages[stages.length - 1];
    }
    return defaultStages[Math.min(autoStageIdx, defaultStages.length - 1)];
  }, [stages, autoStageIdx]);

  // 1. ACTIVE THINKING MODE (Before content streaming begins)
  // As soon as response streaming starts (hasContent = true), remove active state
  if (isWorking && !hasContent) {
    return (
      <div className="w-full max-w-full my-1.5 select-none font-sans">
        <div className="flex items-center gap-2 text-[14px] sm:text-[14.5px] font-normal leading-[1.4] text-zinc-500 dark:text-zinc-400 py-1">
          {/* Pulsing ✦ Icon (Opacity 0.45 ↔ 1, Scale 0.98 ↔ 1.02) */}
          <motion.span
            animate={{
              opacity: [0.45, 1, 0.45],
              scale: [0.98, 1.02, 0.98],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-flex items-center justify-center shrink-0 text-[#9E2339] dark:text-[#E11D48] font-medium text-[15px] select-none"
            aria-hidden="true"
          >
            {currentStage.icon}
          </motion.span>

          {/* Smooth Transition between 2-5 Word Stage Phrases */}
          <div className="relative min-w-0 flex-1 overflow-hidden h-[22px] flex items-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={currentStage.text}
                initial={{ opacity: 0, y: 3, filter: "blur(1.5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -3, filter: "blur(1.5px)" }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-[14px] sm:text-[14.5px] font-normal text-zinc-500 dark:text-zinc-400 truncate block tracking-tight"
              >
                {currentStage.text}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // 2. COMPLETED MESSAGE MODE (Has Content or Stream Finished)
  // Render a minimal, quiet "Thought for X.Xs" toggle if historical stages exist
  if (!isWorking && hasContent && (stages.length > 0 || (typeof durationSeconds === "number" && durationSeconds > 0))) {
    const verifiedList = stages.length > 0 ? stages : defaultStages.slice(0, 3);

    return (
      <div className="w-full max-w-full my-1 select-none font-sans">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors duration-150 cursor-pointer focus:outline-none -ml-2"
        >
          <span className="text-zinc-400 dark:text-zinc-500 text-[13px]">✦</span>
          <span>Thought for {elapsed}</span>
          <span
            className="flex size-3.5 items-center justify-center text-zinc-400 dark:text-zinc-500 transition-transform duration-200"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {/* Expandable Verified Milestones */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden pl-2 border-l border-zinc-200 dark:border-zinc-800 my-1"
            >
              <div className="flex flex-col gap-1 py-1">
                {verifiedList.map((stg, i) => (
                  <div key={`${stg.key}-${i}`} className="flex items-center gap-2 text-[12.5px] text-zinc-600 dark:text-zinc-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">✓</span>
                    <span>{stg.text.replace("…", "")}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
