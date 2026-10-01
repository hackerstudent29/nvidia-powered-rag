"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReasoningStep } from "../../types/chat";

/* ─────────────────────────────────────────────────────────
 * 21ST.DEV LOADING STATE — Pixel-grid wavefront loader &
 * background reasoning trace for Lorin AI (ChatGPT-style)
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle keeps two fronts in flight
 *   Dots   — circular cells
 *   Orbit  — comet perimeter loop
 *   Steps  — square cells with live dynamic reasoning trace
 * ───────────────────────────────────────────────────────── */

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3),
    c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<
  string,
  { delays: (number | null)[]; dur: number; round: boolean }
> = {
  Drive: { delays: chevron, dur: 650, round: false },
  Dots: { delays: chevron, dur: 650, round: true },
  Orbit: { delays: orbit, dur: 950, round: false },
  Steps: { delays: chevron, dur: 650, round: false },
  Reasoning: { delays: chevron, dur: 650, round: false },
};

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

/**
 * Normalizes and broadens granular reasoning sentences into broad, high-level, human-friendly milestones.
 * Eliminates verbose internal scratchpad monologues and redundant micro-steps.
 */
function broadenReasoningStep(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();

  // 1. Filter out internal model monologue / raw intermediate scratchpad lines
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
    lower.includes("scan through the knowledge") ||
    lower.includes("verified entity:")
  ) {
    return null;
  }

  // 2. Broaden technical pipeline steps into concise human milestones
  if (
    lower.includes("query intent") ||
    lower.includes("analyzing inquiry") ||
    lower.includes("targeting developer") ||
    lower.includes("targeting institutional") ||
    lower.includes("analyzing query")
  ) {
    return s.length > 55 ? "Analyzing inquiry & intent" : s;
  }
  if (lower.includes("classified domain intent") || lower.includes("classifying domain")) {
    return s.replace(/^Classified domain intent:\s*/i, "Domain intent: ");
  }
  if (lower.includes("knowledge entity match") || (lower.includes("linked") && lower.includes("entities"))) {
    return "Matched verified institutional entities";
  }
  if (
    lower.includes("dense embedding") ||
    lower.includes("llama-nemotron-embed") ||
    lower.includes("generating 1,024-dim")
  ) {
    return "Generating semantic query embedding";
  }
  if (
    lower.includes("qdrant vector") ||
    lower.includes("bm25 lexical") ||
    lower.includes("searching official") ||
    lower.includes("scanning campus records") ||
    lower.includes("retrieving verified")
  ) {
    return "Searching campus knowledge base & vector records";
  }
  if (
    lower.includes("crac verification") ||
    lower.includes("fused") ||
    lower.includes("cross-referencing") ||
    lower.includes("cross-verifying")
  ) {
    return "Cross-verifying relevant campus documents & policies";
  }
  if (
    lower.includes("synthesizing") ||
    lower.includes("formulating grounded") ||
    lower.includes("structuring")
  ) {
    return "Synthesizing verified grounded response";
  }
  if (lower.includes("routefinder")) {
    return s;
  }
  if (lower.includes("patent & research")) {
    return "Checking verified patent & research records";
  }
  if (lower.includes("cache match") || lower.includes("cached response") || lower.includes("prebuilt")) {
    return "Retrieved verified response from campus cache";
  }

  // If already reasonably concise (< 60 chars), keep it
  if (s.length <= 60) return s;
  return s.slice(0, 57) + "...";
}

/**
 * Accurate elapsed timer hook with live millisecond precision that resets on streaming changes.
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
  variant = "Drive",
  isLiveStreaming = false,
  hasContent = false,
  liveSteps,
  durationSeconds,
}: ThinkingStateProps) {
  const isWorking = !!isLiveStreaming;
  const elapsed = useElapsedTimer(isWorking, durationSeconds);

  // Parse, broaden, and deduplicate live steps into concise broad milestones
  const steps: StepRow[] = React.useMemo(() => {
    if (!Array.isArray(liveSteps) || liveSteps.length === 0) return [];
    
    const broadList: StepRow[] = [];
    const seen = new Set<string>();

    for (const item of liveSteps) {
      let rawText = "";
      let secondary: string | undefined;

      if (typeof item === "string") {
        rawText = item;
      } else if (typeof item === "object" && item !== null) {
        const stepObj = item as any;
        rawText = stepObj.primary || stepObj.step || "";
        secondary = stepObj.secondary;
      }

      const broadened = broadenReasoningStep(rawText);
      if (broadened && !seen.has(broadened.toLowerCase())) {
        seen.add(broadened.toLowerCase());
        broadList.push({
          primary: broadened,
          secondary,
        });
      }
    }

    // Cap to at most 5 high-level milestones for clean broad display
    if (broadList.length > 5) {
      return broadList.slice(-5);
    }
    return broadList;
  }, [liveSteps]);

  const hasSteps = steps.length > 0;
  const hasDuration = typeof durationSeconds === "number" && durationSeconds > 0;

  // Selected pixel-grid pattern
  const patternKey = PATTERNS[variant] ? variant : "Drive";
  const { delays, dur, round } = PATTERNS[patternKey] ?? PATTERNS.Drive;

  // Manual expanded state: null means follow automatic mode
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  // Reset expansion state when message starts fresh streaming generation
  const prevStreamingRef = useRef(isLiveStreaming);
  useEffect(() => {
    if (isLiveStreaming && !prevStreamingRef.current) {
      setManualExpanded(null);
    }
    prevStreamingRef.current = isLiveStreaming;
  }, [isLiveStreaming]);

  // Automatic state: Expanded ONLY while thinking before answer tokens arrive.
  // The moment the answer text begins streaming (hasContent = true) or completes, auto-collapse.
  const autoExpanded = isWorking && !hasContent;
  const isExpanded = manualExpanded !== null ? manualExpanded : autoExpanded;

  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) {
      setLineHeight(traceRef.current.offsetHeight);
    }
  }, [isExpanded, steps.length, isWorking]);

  // Do not render if not streaming, no steps, and no duration
  if (!isWorking && !hasSteps && !hasDuration) {
    return null;
  }

  // Active step description for collapsed view preview
  const activeStepText = hasSteps ? steps[steps.length - 1].primary : "Analyzing campus records...";

  return (
    <div className="flex w-full max-w-full sm:max-w-xl md:max-w-2xl flex-col my-1 select-none font-sans transition-all duration-200">
      {/* ── Header / Collapsed Bar (Flush left aligned) ── */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setManualExpanded((prev) => !(prev !== null ? prev : autoExpanded))}
        className="group -ml-1 sm:-ml-1.5 flex w-full items-center justify-between rounded-lg pl-0 pr-1 py-1
          transition-colors duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          {/* 3x3 Pixel Grid Wavefront Loader */}
          <span aria-hidden className="grid grid-cols-[repeat(3,3.5px)] gap-[1.5px] shrink-0">
            {delays.map((d, i) => (
              <span
                key={i}
                className={`size-[3.5px] bg-foreground dark:bg-zinc-200 ${round ? "rounded-full" : "rounded-[1px]"}`}
                style={{
                  opacity: !isWorking ? 0.35 : d === null ? 0.08 : 0.15,
                  animation:
                    !isWorking || d === null
                      ? "none"
                      : `pixel-on ${dur}ms ease-in-out ${d}ms infinite`,
                }}
              />
            ))}
          </span>

          {/* Shimmering State Label */}
          {isWorking ? (
            <span className="animate-thinking-shimmer text-[13px] font-medium whitespace-nowrap shrink-0">
              Thinking
            </span>
          ) : (
            <span className="text-[13px] font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-200 shrink-0">
              Thought for {elapsed}
            </span>
          )}

          {/* Animated Active Step Preview in Collapsed View (Hidden when Expanded) */}
          {!isExpanded && (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0">•</span>
              <div className="min-w-0 flex-1 overflow-hidden relative h-[18px] flex items-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isWorking ? activeStepText : (steps.length > 0 ? `${steps.length}-done` : "done")}
                    initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-[12px] sm:text-[12.5px] truncate block ${
                      isWorking
                        ? "animate-thinking-shimmer font-medium"
                        : "text-zinc-500 dark:text-zinc-400 font-normal"
                    }`}
                    title={isWorking ? activeStepText : (steps.length > 0 ? `${steps.length} steps verified` : "Verified ground truth")}
                  >
                    {isWorking
                      ? activeStepText
                      : steps.length > 0
                      ? `${steps.length} steps verified`
                      : "Verified ground truth"}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right Info: Live Timer (when working) & Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {isWorking && (
            <span className="font-mono text-[12px] text-zinc-500 dark:text-zinc-400 tabular-nums font-normal">
              {elapsed}
            </span>
          )}

          <span
            className="flex size-4 items-center justify-center text-zinc-500 dark:text-zinc-400 transition-transform duration-200 opacity-60 group-hover:opacity-100"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>

      {/* ── Expandable Broad Step-by-Step Reasoner ── */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 -ml-0.5 sm:-ml-1 pl-2.5 border-l border-black/10 dark:border-white/10 my-1">
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isStepActive = isWorking && isLast;

                return (
                  <motion.div
                    key={`${step.primary}-${idx}`}
                    initial={{ opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-2 rounded-md px-0.5 py-0.5 text-left transition-colors duration-150"
                  >
                    {/* Step Checkmark / Active Breathing Indicator */}
                    <div className="mt-1 shrink-0 flex items-center justify-center size-3">
                      {isStepActive ? (
                        <span className="relative flex size-2.5 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 dark:bg-zinc-200 opacity-60" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-zinc-800 dark:bg-zinc-100" />
                        </span>
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
                          className="text-emerald-600 dark:text-emerald-400 shrink-0"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>

                    {/* Step Text with Lively Shimmer Animation */}
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                      <span
                        className={`text-[12.5px] leading-relaxed break-words transition-all duration-200 ${
                          isStepActive
                            ? "font-medium animate-thinking-shimmer"
                            : "text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {step.primary}
                      </span>
                      {step.secondary && (
                        <span className="shrink-0 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                          {step.secondary}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {steps.length === 0 && isWorking && (
                <div className="flex items-center gap-2 px-0.5 py-0.5 text-[12.5px]">
                  <span className="relative flex size-2.5 items-center justify-center shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 dark:bg-zinc-200 opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-zinc-800 dark:bg-zinc-100" />
                  </span>
                  <span className="animate-thinking-shimmer font-medium">Connecting to campus reasoning engine...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
