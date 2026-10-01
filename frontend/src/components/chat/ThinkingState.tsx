"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  liveSteps?: (string | ReasoningStep | StepRow)[];
  durationSeconds?: number;
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
  liveSteps,
  durationSeconds,
}: ThinkingStateProps) {
  const isWorking = !!isLiveStreaming;
  const elapsed = useElapsedTimer(isWorking, durationSeconds);

  // Parse and normalize live steps
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
  const hasDuration = typeof durationSeconds === "number" && durationSeconds > 0;

  // Selected pixel-grid pattern
  const patternKey = PATTERNS[variant] ? variant : "Drive";
  const { delays, dur, round } = PATTERNS[patternKey] ?? PATTERNS.Drive;

  // Manual expanded state: null means default (expanded while streaming, collapsed when complete)
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);

  // Reset expansion state when message regenerates
  const prevStreamingRef = useRef(isLiveStreaming);
  useEffect(() => {
    if (isLiveStreaming && !prevStreamingRef.current) {
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

  // Do not render if not streaming, no steps, and no duration
  if (!isWorking && !hasSteps && !hasDuration) {
    return null;
  }

  // Active step description for collapsed view preview
  const activeStepText = hasSteps ? steps[steps.length - 1].primary : "Analyzing campus records...";

  return (
    <div className="flex w-full max-w-full sm:max-w-xl md:max-w-2xl flex-col my-1 select-none font-sans transition-all duration-200">
      {/* ── Header / Collapsed Bar ── */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setManualExpanded((prev) => !(prev !== null ? prev : isWorking))}
        className="group -mx-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1
          transition-colors duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer text-left focus:outline-none"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {/* 3x3 Pixel Grid Wavefront Loader */}
          <span aria-hidden className="grid grid-cols-[repeat(3,4.5px)] gap-[2px] shrink-0">
            {delays.map((d, i) => (
              <span
                key={i}
                className={`size-[4.5px] bg-foreground dark:bg-zinc-200 ${round ? "rounded-full" : "rounded-[1px]"}`}
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
            <span
              className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent shrink-0"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(120,120,120,0.4) 30%, rgba(30,30,30,0.95) 50%, rgba(120,120,120,0.4) 70%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-text 1.4s linear infinite",
              }}
            >
              Thinking
            </span>
          ) : (
            <span className="text-[13px] font-medium whitespace-nowrap text-ink dark:text-zinc-200 shrink-0">
              Thought for {elapsed}
            </span>
          )}

          {/* Active Step Preview in Collapsed View */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0">•</span>
            {isWorking ? (
              <span
                className="text-[12px] sm:text-[12.5px] truncate font-normal text-zinc-500 dark:text-zinc-400"
                title={activeStepText}
              >
                {activeStepText}
              </span>
            ) : (
              <span className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate">
                {steps.length > 0 ? `${steps.length} steps verified` : "Verified ground truth"}
              </span>
            )}
          </div>
        </div>

        {/* Right Info: Live Timer (when working) & Chevron */}
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {isWorking && (
            <span className="font-mono text-[12px] text-ink-3 dark:text-zinc-400 tabular-nums font-normal">
              {elapsed}
            </span>
          )}

          <span
            className="flex size-4 items-center justify-center text-ink-3 dark:text-zinc-400 transition-transform duration-200 opacity-60 group-hover:opacity-100"
            style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
          <div className="relative mt-1 ml-[7px] pl-3.5 border-l border-line dark:border-white/10 my-1">
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isStepActive = isWorking && isLast;

                return (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-md px-1 py-0.5 text-left transition-colors duration-150"
                  >
                    {/* Step Checkmark / Spinner */}
                    <div className="mt-1 shrink-0">
                      {isStepActive ? (
                        <span
                          className="size-2.5 rounded-full border-[1.5px] border-line-strong border-t-ink-2 dark:border-white/30 dark:border-t-white block"
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

                    {/* Step Text */}
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                      <span
                        className={`text-[12.5px] leading-relaxed break-words ${
                          isStepActive
                            ? "font-medium text-ink dark:text-zinc-100"
                            : "text-ink-2 dark:text-zinc-300"
                        }`}
                      >
                        {step.primary}
                      </span>
                      {step.secondary && (
                        <span className="shrink-0 text-[11px] font-mono text-ink-3 dark:text-zinc-400">
                          {step.secondary}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {steps.length === 0 && isWorking && (
                <div className="flex items-center gap-2 px-1 py-0.5 text-[12px] text-ink-3 dark:text-zinc-400">
                  <span
                    className="size-2.5 rounded-full border-[1.5px] border-line-strong border-t-ink-2 block"
                    style={{ animation: "spin 700ms linear infinite" }}
                  />
                  <span>Connecting to campus reasoning engine...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
