"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReasoningStep } from "../../types/chat";

/* ─────────────────────────────────────────────────────────
 * LORIN AI — PREMIUM REASONING & THINKING STATE
 *
 * Provides real-time background reasoning visualization:
 * - Collapsed view shows live active step preview + elapsed timer
 * - Expandable trace with vertical timeline of verified thoughts
 * - Automatic reset and live animation on regeneration / new turns
 * - Responsive for mobile, tablet, and desktop screens
 * - Strictly zero emojis across all elements
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
  liveSteps?: (string | ReasoningStep | StepRow)[];
  durationSeconds?: number;
  modelName?: string;
}

/**
 * Precise elapsed timer hook that resets cleanly on streaming state changes.
 */
function useElapsedTimer(active: boolean, initialSeconds?: number) {
  const [elapsedTenths, setElapsedTenths] = useState(0);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      setElapsedTenths(0);
      const timer = setInterval(() => {
        setElapsedTenths((prev) => prev + 1);
      }, 100);
      return () => clearInterval(timer);
    }
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
  variant = "Steps",
  isLiveStreaming = false,
  liveSteps,
  durationSeconds,
  modelName,
}: ThinkingStateProps) {
  // Normalize raw incoming live steps into clean step rows
  const steps: StepRow[] = React.useMemo(() => {
    if (!Array.isArray(liveSteps) || liveSteps.length === 0) return [];
    return liveSteps
      .map((item) => {
        if (typeof item === "string") {
          return { primary: item.trim() };
        }
        if (typeof item === "object" && item !== null) {
          const stepObj = item as any;
          return {
            primary: (stepObj.primary || stepObj.step || "").trim(),
            secondary: stepObj.secondary,
            mono: stepObj.mono,
            add: stepObj.add,
            del: stepObj.del,
            href: stepObj.href,
          };
        }
        return { primary: "" };
      })
      .filter((r) => r.primary.length > 0);
  }, [liveSteps]);

  const hasSteps = steps.length > 0;
  const isWorking = !!isLiveStreaming;
  const elapsed = useElapsedTimer(isWorking, durationSeconds);

  // Manual expanded state: null means auto (expanded while streaming, collapsed when done)
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  // Auto-expand on new streaming session or regeneration
  const prevStreamingRef = useRef(isLiveStreaming);
  useEffect(() => {
    if (isLiveStreaming && !prevStreamingRef.current) {
      // Stream just started / message regenerating: reset manual override to auto-expand
      setManualExpanded(null);
    }
    prevStreamingRef.current = isLiveStreaming;
  }, [isLiveStreaming]);

  const isExpanded = manualExpanded !== null ? manualExpanded : isWorking;

  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) {
      setLineHeight(traceRef.current.offsetHeight);
    }
  }, [isExpanded, steps.length, isWorking]);

  // Do not render empty box if there are no steps and not working
  if (!isWorking && !hasSteps && (!durationSeconds || durationSeconds <= 0)) {
    return null;
  }

  // Active step for collapsed preview
  const activeStepText = hasSteps ? steps[steps.length - 1].primary : "Initializing reasoning engine...";

  return (
    <div className="flex w-full max-w-full sm:max-w-xl md:max-w-2xl flex-col my-1.5 select-none font-sans transition-all duration-200">
      {/* ── Collapsed / Header Bar ── */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setManualExpanded((prev) => !(prev !== null ? prev : isWorking))}
        className="group -mx-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5
          transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {/* Animated Status Indicator */}
          {isWorking ? (
            <span className="relative flex size-3.5 shrink-0 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span className="flex size-3.5 shrink-0 items-center justify-center text-primary dark:text-[#E11D48]">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </span>
          )}

          {/* Primary State Label */}
          <span className="text-[12.5px] sm:text-[13px] font-semibold text-foreground dark:text-zinc-200 shrink-0">
            {isWorking ? "Thinking" : `Thought for ${elapsed}`}
          </span>

          {/* Collapsed Step Preview: Displays active background action in real-time */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0">•</span>
            {isWorking ? (
              <span
                className="text-[12px] sm:text-[12.5px] truncate font-medium text-zinc-600 dark:text-zinc-300 animate-pulse"
                title={activeStepText}
              >
                {activeStepText}
              </span>
            ) : (
              <span className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">
                {steps.length > 0 ? `${steps.length} steps completed` : "Verified response"}
              </span>
            )}
          </div>
        </div>

        {/* Right Action: Live Timer / Step Count & Chevron */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {isWorking && (
            <span className="font-mono text-[11.5px] sm:text-[12px] text-primary dark:text-[#E11D48] tabular-nums font-semibold px-1.5 py-0.5 rounded bg-primary/10 dark:bg-primary/20">
              {elapsed}
            </span>
          )}

          <span
            className="flex size-5 items-center justify-center rounded text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-hover:text-foreground"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </button>

      {/* ── Expandable Step-by-Step Reasoner ── */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-1.5 pl-4 border-l border-black/10 dark:border-white/10 my-1">
            <div ref={traceRef} className="flex flex-col gap-1.5 py-1">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isStepActive = isWorking && isLast;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  >
                    {/* Step Icon */}
                    <div className="mt-0.5 shrink-0">
                      {isStepActive ? (
                        <span className="flex size-3.5 items-center justify-center">
                          <span
                            className="size-3 rounded-full border-[1.5px] border-primary/30 border-t-primary dark:border-primary/40 dark:border-t-primary"
                            style={{ animation: "spin 650ms linear infinite" }}
                          />
                        </span>
                      ) : (
                        <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* Step Text & Optional Secondary Info */}
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                      <span
                        className={`text-[12px] sm:text-[12.5px] leading-relaxed break-words ${
                          isStepActive
                            ? "font-medium text-foreground dark:text-zinc-100"
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
                  </div>
                );
              })}

              {steps.length === 0 && isWorking && (
                <div className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-zinc-500 dark:text-zinc-400">
                  <span
                    className="size-3 shrink-0 rounded-full border-[1.5px] border-primary/30 border-t-primary"
                    style={{ animation: "spin 650ms linear infinite" }}
                  />
                  <span>Initializing campus reasoning pipeline...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
