import { TokenMetrics } from "../../types/chat";
import { Tooltip } from "../Tooltip";

interface TokenCostBadgeProps {
  metrics?: TokenMetrics;
  isOpen: boolean;
  onClick: () => void;
}

export default function TokenCostBadge({ metrics, isOpen, onClick }: TokenCostBadgeProps) {
  if (!metrics) {
    return null;
  }

  const formattedCostUsd =
    metrics.total_cost_usd < 0.0001
      ? `${metrics.total_cost_usd.toFixed(6)} USD`
      : `${metrics.total_cost_usd.toFixed(4)} USD`;

  const formattedCostInr = `₹${metrics.total_cost_inr.toFixed(3)}`;

  const formattedLatency =
    metrics.latency_ms >= 1000
      ? `${(metrics.latency_ms / 1000).toFixed(1)}s`
      : `${Math.round(metrics.latency_ms)}ms`;

  const cleanModelName = metrics.model_name
    ? metrics.model_name
        .replace(/^zai\//i, "")
        .replace(/^google\//i, "")
        .replace(/^minimax\//i, "")
    : "";

  const questionTokens = metrics.prompt_tokens ?? 0;
  const answerTokens = metrics.completion_tokens ?? 0;
  const totalTokens = metrics.total_tokens ?? (questionTokens + answerTokens);

  const tooltipText = totalTokens > 0
    ? `Question: ${questionTokens.toLocaleString()} tokens • Answer: ${answerTokens.toLocaleString()} tokens • Total: ${totalTokens.toLocaleString()} tokens (${formattedLatency})`
    : `Instant Prebuilt Card • 0 tokens consumed (Free) • Cost: ₹0.000 (${formattedLatency})`;

  return (
    <Tooltip content={tooltipText} position="top">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onClick}
        className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10.5px] sm:text-[11px] font-medium transition-all duration-150 border border-line shadow-hairline whitespace-nowrap select-none shrink-0 cursor-pointer ${
          isOpen
            ? "bg-hover text-ink shadow-sm font-semibold border-line-strong"
            : "bg-transparent hover:bg-hover text-ink-2 hover:text-ink"
        }`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent shrink-0"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>

        {cleanModelName && (
          <>
            <span className="font-semibold text-ink truncate max-w-[75px] xs:max-w-[105px] sm:max-w-none">
              {cleanModelName}
            </span>
            <span className="text-ink-3/60 shrink-0">•</span>
          </>
        )}

        {totalTokens > 0 ? (
          <>
            <span className="tabular-nums font-mono text-ink font-medium shrink-0 whitespace-nowrap">
              <span className="inline sm:hidden">
                {totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens} tok
              </span>
              <span className="hidden sm:inline">
                {totalTokens.toLocaleString()} tokens
              </span>
            </span>
            <span className="text-ink-3/60 shrink-0">•</span>
          </>
        ) : (
          <>
            <span className="tabular-nums font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 whitespace-nowrap">
              0 tokens (Free)
            </span>
            <span className="text-ink-3/60 shrink-0">•</span>
          </>
        )}

        <span className="tabular-nums font-mono text-ink shrink-0 whitespace-nowrap">
          {formattedLatency}
        </span>

        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </Tooltip>
  );
}

interface TokenCostPanelProps {
  metrics: TokenMetrics;
}

export function TokenCostPanel({ metrics }: TokenCostPanelProps) {
  const formattedCostUsd =
    metrics.total_cost_usd < 0.0001
      ? `${metrics.total_cost_usd.toFixed(6)} USD`
      : `${metrics.total_cost_usd.toFixed(4)} USD`;

  const formattedCostInr = `₹${metrics.total_cost_inr.toFixed(3)}`;

  const cleanModelName = metrics.model_name
    ? metrics.model_name
        .replace(/^zai\//i, "")
        .replace(/^google\//i, "")
        .replace(/^minimax\//i, "")
    : "Gemini";

  const questionTokens = metrics.prompt_tokens ?? 0;
  const answerTokens = metrics.completion_tokens ?? 0;
  const totalTokens = metrics.total_tokens ?? (questionTokens + answerTokens);

  return (
    <div className="w-full rounded-2xl bg-surface/90 dark:bg-[#18181b]/90 text-ink dark:text-[#f4f3ee] mt-2 mb-1 p-3.5 border border-black/[0.08] dark:border-white/[0.08] shadow-md backdrop-blur-xl">
      <div className="flex flex-col gap-3.5">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[#E1EED7] dark:bg-[#2E6B5E]/30 border border-[#2E6B5E]/30 dark:border-[#10b981]/30 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] shadow-sm shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="text-[12px] font-bold text-ink dark:text-[#f4f3ee]">
              Token Usage & Performance Telemetry
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Verified Grounded</span>
          </div>
        </div>

        {/* 4-Box Token & Performance Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Question (Prompt) Tokens */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
              Question Tokens
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {questionTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate">
              {metrics.query_tokens ? `Query: ${metrics.query_tokens} • Prompt: ${questionTokens}` : "Input / Prompt"}
            </div>
          </div>

          {/* 2. Answer (Completion) Tokens */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
              Answer Tokens
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {answerTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate">
              Generated response
            </div>
          </div>

          {/* 3. Total Tokens & Speed */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
              Total Tokens
            </div>
            <div className="text-[14px] font-bold font-mono text-ink dark:text-[#f4f3ee] mt-0.5">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate">
              {metrics.tokens_per_sec > 0 ? `${metrics.tokens_per_sec} tok/s speed` : "Total usage"}
            </div>
          </div>

          {/* 4. Model & Latency */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
              Model & Latency
            </div>
            <div className="text-[13px] font-bold text-ink dark:text-[#f4f3ee] truncate mt-0.5">
              {cleanModelName}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] font-mono mt-0.5 truncate">
              {metrics.latency_ms}ms • {formattedCostUsd}
            </div>
          </div>
        </div>

        {/* Step-by-Step Execution & Real Token Usage Table */}
        {metrics.steps && metrics.steps.length > 0 && (
          <div className="mt-1">
            <div className="text-[10px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider mb-1.5 flex items-center justify-between">
              <span>Step-by-Step Pipeline & Real Token Usage</span>
              <span className="text-[9px] font-normal lowercase text-ink-3">measured in real BPE tokens</span>
            </div>

            <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
              <div className="min-w-[420px] divide-y divide-black/[0.06] dark:divide-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] text-[9.5px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Pipeline Step & Model</div>
                  <div className="col-span-3 text-right">Real Tokens</div>
                  <div className="col-span-3 text-right">Duration</div>
                </div>

              {metrics.steps.map((step) => (
                <div
                  key={step.step_number}
                  className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-1 font-mono font-bold text-[#2E6B5E] dark:text-[#10b981]">
                    {step.step_number}
                  </div>
                  <div className="col-span-5 min-w-0 pr-1">
                    <div className="font-semibold text-ink dark:text-[#f4f3ee] truncate">
                      {step.step_name}
                    </div>
                    <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] truncate font-mono">
                      {step.details || step.model_name}
                    </div>
                  </div>
                  <div className="col-span-3 text-right font-mono">
                    {step.total_tokens > 0 ? (
                      <span className="font-bold text-[#2E6B5E] dark:text-[#10b981]">
                        {step.total_tokens.toLocaleString()}{" "}
                        <span className="text-[9.5px] font-normal text-ink-3 dark:text-[#b1ada1]">
                          tok {step.output_tokens > 0 ? `(${step.input_tokens} in / ${step.output_tokens} out)` : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">0 tok (Free)</span>
                    )}
                  </div>
                  <div className="col-span-3 text-right font-mono text-ink dark:text-[#f4f3ee]">
                    {step.duration_ms}ms
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

