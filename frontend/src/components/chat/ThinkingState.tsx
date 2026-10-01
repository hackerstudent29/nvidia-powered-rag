"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReasoningStep } from "../../types/chat";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
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
  Steps: { delays: chevron, dur: 650, round: true },
  Reasoning: { delays: chevron, dur: 650, round: true },
  Search: { delays: orbit, dur: 950, round: false },
  Coding: { delays: chevron, dur: 650, round: false },
};

function useElapsed(active: boolean, initialSeconds?: number) {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, [active]);

  if (!active && typeof initialSeconds === "number" && initialSeconds > 0) {
    const total = initialSeconds;
    if (total < 60) return `${total.toFixed(1)}s`;
    return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
  }

  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

const STAGES = [600, 800, 1400, 2000, 1200];

function useSequence(steps: number[], enabled = true) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps, enabled]);
  return stage;
}

export type Row = {
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

const VARIANTS: Record<
  string,
  { active: string; done: string; rows: Row[]; query?: string }
> = {
  Steps: {
    active: "Thinking",
    done: "Thinking",
    rows: [
      { primary: "Analyzing query intent & campus domain taxonomy" },
      { primary: "Searching Qdrant Vector DB & BM25 Lexical Index", secondary: "1,378 chunks" },
      { primary: "Filtering cross-domain records & executing CRAG relevance check" },
      { primary: "Synthesizing grounded response with verified tables & citations" },
    ],
  },
  Reasoning: {
    active: "Reasoning",
    done: "Reasoning",
    rows: [
      {
        primary:
          "Classified domain intent and verified safety guardrails against prompt injection and domain boundary violations.",
      },
      {
        primary:
          "Cross-referenced 1,378 verified institutional records with Anna University & TNEA regulations to eliminate hallucinations.",
      },
    ],
  },
  Search: {
    active: "Searching",
    done: "Searching",
    query: "MSAJCE Admissions & Campus Directory",
    rows: [
      {
        primary: "MSAJCE Official Portal",
        secondary: "msajce.edu.in",
        href: "https://msajce.edu.in",
      },
      {
        primary: "Anna University Regulations",
        secondary: "annauniv.edu",
        href: "https://www.annauniv.edu",
      },
      {
        primary: "TNEA Counselling Information",
        secondary: "tneaonline.org",
        href: "https://www.tneaonline.org",
      },
      {
        primary: "AICTE Approval & Course Matrix",
        secondary: "aicte-india.org",
        href: "https://www.aicte-india.org",
      },
    ],
  },
  Coding: {
    active: "Running tools",
    done: "Running tools",
    rows: [
      { primary: "RouteFinder.findRoute()", secondary: "msajce_transport.md", mono: true },
      {
        primary: "QdrantHybridSearch.query()",
        secondary: "1,378 vectors",
        mono: true,
        add: 14,
        del: 8,
      },
      { primary: "CRAGFilter.purgeCrossDomain()", secondary: "domain_router.py", mono: true },
    ],
  },
};

function Dot({ tone }: { tone: string }) {
  return (
    <span
      className={`flex size-3.5 shrink-0 items-center justify-center rounded-full text-white ${tone}`}
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    </span>
  );
}

const TONES = ["bg-accent", "bg-orange", "bg-green"];

export interface ThinkingStateProps {
  variant?: string;
  isLiveStreaming?: boolean;
  liveSteps?: (string | ReasoningStep | Row)[];
  durationSeconds?: number;
}

export default function ThinkingState({
  variant = "Steps",
  isLiveStreaming,
  liveSteps,
  durationSeconds,
}: ThinkingStateProps) {
  // If isLiveStreaming is defined, we operate in real live streaming / chat message mode
  const isControlled = isLiveStreaming !== undefined;
  const stage = useSequence(STAGES, !isControlled);

  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const working = isControlled ? !!isLiveStreaming : stage < 3;
  const elapsed = useElapsed(working, durationSeconds);

  const patternKey = PATTERNS[variant] ? variant : "Drive";
  const { delays, dur, round } = PATTERNS[patternKey] ?? PATTERNS.Drive;

  const vBase = VARIANTS[variant] ?? VARIANTS.Steps;

  // Process live real-time steps emitted by backend server
  let dynamicRows: Row[] = [];
  if (Array.isArray(liveSteps) && liveSteps.length > 0) {
    dynamicRows = liveSteps
      .map((item) => {
        if (typeof item === "string") {
          return { primary: item.trim() };
        }
        if (typeof item === "object" && item !== null) {
          const stepObj = item as any;
          return {
            primary: stepObj.primary || stepObj.step || "",
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
  }

  const hasLiveSteps = dynamicRows.length > 0;
  const hasDuration = typeof durationSeconds === "number" && durationSeconds > 0;

  // Do not render empty thinking box if there are no steps, not streaming, and no duration
  if (isControlled && dynamicRows.length === 0 && !isLiveStreaming && !hasDuration) {
    return null;
  }

  const v = {
    active: vBase.active,
    done: vBase.done,
    rows: isControlled ? dynamicRows : vBase.rows,
    query: vBase.query,
  };

  const autoExpanded = isControlled ? !!isLiveStreaming : stage >= 1 && stage < 4;
  const expanded = manualExpanded ?? autoExpanded;

  const visible = isControlled
    ? v.rows.length
    : stage < 2
    ? 0
    : stage === 2
    ? Math.min(2, v.rows.length)
    : v.rows.length;

  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded, variant, stage, dynamicRows.length]);

  return (
    <div key={variant} className="flex min-h-[32px] w-full max-w-xl flex-col my-1.5 select-none font-sans">
      {/* header — pixel-grid loader with label and elapsed time */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() =>
          setManualExpanded((current) => !(current ?? autoExpanded))
        }
        className="group -mx-1.5 flex w-fit items-center gap-2.5 rounded-lg px-2 py-1
          transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
      >
        {/* Pixel Grid Wavefront Loader */}
        <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px] shrink-0">
          {delays.map((d, i) => (
            <span
              key={i}
              className={`size-[4px] bg-foreground ${round ? "rounded-full" : "rounded-[1px]"}`}
              style={{
                opacity: !working ? 0.35 : d === null ? 0.07 : 0.15,
                animation:
                  !working || d === null
                    ? "none"
                    : `pixel-on ${dur}ms ease-in-out ${d}ms infinite`,
              }}
            />
          ))}
        </span>

        {/* State label */}
        {working ? (
          <span
            className="bg-clip-text text-[13px] font-medium whitespace-nowrap text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)",
              backgroundSize: "200% 100%",
              animation: "shimmer-text 1.4s linear infinite",
            }}
          >
            {v.active}
          </span>
        ) : (
          <span className="text-[13px] font-medium whitespace-nowrap text-ink dark:text-zinc-200">
            {v.done}
          </span>
        )}

        {/* Live Elapsed / Latency tag */}
        <span className="font-mono text-[12px] text-ink-3 dark:text-zinc-400 tabular-nums">
          {elapsed}
        </span>

        {/* Chevron */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-3 dark:text-zinc-400 transition-transform duration-300 opacity-60 group-hover:opacity-100 ml-0.5"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* expandable trace */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-400"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-line"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: "height 500ms cubic-bezier(0.23,1,0.32,1)",
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {v.query && (
                <div
                  className="flex h-6 items-center gap-2 px-1.5"
                  style={{
                    animation: expanded
                      ? "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both"
                      : undefined,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-3)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="shrink-0"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <span className="text-[12.5px] text-ink-2 dark:text-zinc-400">{v.query}</span>
                </div>
              )}
              {v.rows.slice(0, visible).map((row, i) => {
                const isLast = i === visible - 1;
                const isStepSpinning = working && isLast;

                const content = (
                  <>
                    {variant === "Search" && <Dot tone={TONES[i % 3]} />}
                    {(variant === "Steps" || variant === "Reasoning" || !variant) &&
                      (!isStepSpinning ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--green)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span
                          className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
                          style={{ animation: "spin 700ms linear infinite" }}
                        />
                      ))}
                    <span
                      className={`min-w-0 truncate text-[12.5px] ${variant === "Reasoning" ? "whitespace-normal leading-relaxed text-ink-2 dark:text-zinc-300" : "font-medium text-ink dark:text-zinc-200"} ${variant === "Search" ? "animated-underline" : ""}`}
                    >
                      {row.primary}
                    </span>
                    {row.secondary && (
                      <span
                        className={`shrink-0 text-[11.5px] text-ink-3 dark:text-zinc-400 ${row.mono ? "font-mono" : ""}`}
                      >
                        {row.secondary}
                      </span>
                    )}
                    {row.add !== undefined && (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        <span className="text-green">+{row.add}</span>{" "}
                        <span className="text-red">−{row.del}</span>
                      </span>
                    )}
                  </>
                );
                const rowClass =
                  "flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left";
                const animation = {
                  animation: `fade-up 320ms cubic-bezier(0.23,1,0.32,1) ${i * 120}ms both`,
                };

                if (variant === "Search") {
                  return (
                    <a
                      key={row.primary + i}
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className={`${rowClass} transition-colors duration-150 hover:bg-hover`}
                      style={animation}
                    >
                      {content}
                    </a>
                  );
                }

                if (variant === "Coding") {
                  const selected = selectedTool === row.primary;
                  return (
                    <button
                      key={row.primary + i}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedTool(selected ? null : row.primary)
                      }
                      className={`${rowClass} transition-colors duration-150 ${selected ? "bg-inset" : "hover:bg-hover"}`}
                      style={animation}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={row.primary + i} className={rowClass} style={animation}>
                    {content}
                  </div>
                );
              })}
              {variant === "Search" && (!isControlled ? stage >= 3 : !working) && (
                <span
                  className="text-[12px] text-ink-3 dark:text-zinc-400"
                  style={{ animation: "fade-in 300ms ease-out both" }}
                >
                  + verified campus links
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Demo Export ---
export function LoadingStateDemo() {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center bg-background p-8">
      <div className="flex flex-col gap-7">
        <ThinkingState variant="Drive" />
        <ThinkingState variant="Dots" />
        <ThinkingState variant="Orbit" />
      </div>
    </div>
  );
}
