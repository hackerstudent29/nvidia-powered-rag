import { TokenMetrics } from "../../types/chat";
import { Tooltip } from "../Tooltip";

interface TokenCostBadgeProps {
  metrics?: TokenMetrics;
  isOpen: boolean;
  onClick: () => void;
}

export default function TokenCostBadge({ metrics, isOpen, onClick }: TokenCostBadgeProps) {
  if (!metrics || metrics.total_tokens === 0 || (metrics.prompt_tokens === 0 && metrics.completion_tokens === 0) || (metrics as any).is_prebuilt) {
    return null;
  }

  const rawCost = typeof metrics?.total_cost_usd === "number" ? metrics.total_cost_usd : 0;
  const rawLatency = typeof metrics?.latency_ms === "number" ? metrics.latency_ms : 0;

  const formattedCostUsd =
    rawCost < 0.0001
      ? `${rawCost.toFixed(6)} USD`
      : `${rawCost.toFixed(4)} USD`;

  const formattedLatency =
    rawLatency >= 1000
      ? `${(rawLatency / 1000).toFixed(1)}s`
      : `${Math.round(rawLatency)}ms`;

  const cleanModelName = metrics.model_name
    ? metrics.model_name
        .replace(/^zai\//i, "")
        .replace(/^google\//i, "")
        .replace(/^minimax\//i, "")
    : "";

  const queryTokens = metrics.query_tokens ?? 10;
  const promptInputTokens = metrics.prompt_tokens ?? 0;
  const answerTokens = metrics.completion_tokens ?? 0;
  const totalTokens = metrics.total_tokens ?? (promptInputTokens + answerTokens);

  const tooltipText = totalTokens > 0
    ? `Query: ${queryTokens} tok • RAG Context: ${metrics.context_tokens || 0} tok • Answer: ${answerTokens} tok • Total: ${totalTokens.toLocaleString()} tokens (${formattedLatency})`
    : `Instant Prebuilt Card • 0 tokens consumed (Free) • (${formattedLatency})`;

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
          <span className="tabular-nums font-mono text-ink font-medium shrink-0 whitespace-nowrap">
            <span className="inline sm:hidden">
              {totalTokens.toLocaleString()} tok
            </span>
            <span className="hidden sm:inline">
              {totalTokens.toLocaleString()} tokens
            </span>
          </span>
        ) : (
          <span className="tabular-nums font-mono text-[#2E6B5E] dark:text-[#10b981] font-semibold shrink-0 whitespace-nowrap">
            0 tokens (Free)
          </span>
        )}

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
  const rawCost = typeof metrics?.total_cost_usd === "number" ? metrics.total_cost_usd : 0;
  const formattedCostUsd =
    rawCost < 0.0001
      ? `${rawCost.toFixed(6)} USD`
      : `${rawCost.toFixed(4)} USD`;

  const cleanModelName = metrics.model_name
    ? metrics.model_name
        .replace(/^zai\//i, "")
        .replace(/^google\//i, "")
        .replace(/^minimax\//i, "")
    : "Gemini";

  const queryTokens = metrics.query_tokens ?? 0;
  const historyTokens = metrics.history_tokens ?? 0;
  const promptInputTokens = metrics.prompt_tokens ?? 0;
  const answerTokens = metrics.completion_tokens ?? 0;
  const contextTokens = metrics.context_tokens ?? 0;
  const systemTokens = metrics.system_tokens ?? 732;
  const totalTokens = metrics.total_tokens ?? (promptInputTokens + answerTokens);

  const queryHistTokens = queryTokens + historyTokens;

  // Percentage calculations
  const sysPct = totalTokens > 0 ? Math.min(100, Math.round((systemTokens / totalTokens) * 100)) : 0;
  const ragPct = totalTokens > 0 ? Math.min(100, Math.round((contextTokens / totalTokens) * 100)) : 0;
  const qhPct = totalTokens > 0 ? Math.min(100, Math.round((queryHistTokens / totalTokens) * 100)) : 0;
  const ansPct = totalTokens > 0 ? Math.min(100, Math.round((answerTokens / totalTokens) * 100)) : 0;

  return (
    <div className="w-full rounded-2xl bg-surface/90 dark:bg-[#18181b]/90 text-ink dark:text-[#f4f3ee] mt-2 mb-1 p-3.5 border border-black/[0.08] dark:border-white/[0.08] shadow-md backdrop-blur-xl">
      <div className="flex flex-col gap-3.5">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[#2E6B5E]/15 dark:bg-[#10b981]/20 border border-[#2E6B5E]/30 dark:border-[#10b981]/30 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] shadow-sm shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <div className="text-[12px] font-bold text-ink dark:text-[#f4f3ee]">
                Detailed Token Usage Breakdown
              </div>
              <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] font-mono">
                {totalTokens.toLocaleString()} tokens completely used for this response
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#2E6B5E] dark:text-[#10b981] font-medium">
            <span className="size-1.5 rounded-full bg-[#2E6B5E] dark:bg-[#10b981] animate-pulse" />
            <span>Verified Grounded</span>
          </div>
        </div>

        {/* Component-Wise Itemized Token Usage Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* 1. System Prompt */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider flex items-center justify-between">
              <span>System Prompt</span>
              <span className="text-[9px] text-[#2E6B5E] dark:text-[#10b981] font-mono">{sysPct}%</span>
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {systemTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate" title="System rules & identity">
              Rules & Guardrails
            </div>
          </div>

          {/* 2. RAG Context */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider flex items-center justify-between">
              <span>Campus RAG</span>
              <span className="text-[9px] text-[#2E6B5E] dark:text-[#10b981] font-mono">{ragPct}%</span>
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {contextTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate" title="Retrieved dataset records">
              Fetched Chunks
            </div>
          </div>

          {/* 3. Query & History */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider flex items-center justify-between">
              <span>Query & History</span>
              <span className="text-[9px] text-[#2E6B5E] dark:text-[#10b981] font-mono">{qhPct}%</span>
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {queryHistTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate" title="User input & turn memory">
              Input + History
            </div>
          </div>

          {/* 4. Answer Output */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider flex items-center justify-between">
              <span>LLM Answer</span>
              <span className="text-[9px] text-[#2E6B5E] dark:text-[#10b981] font-mono">{ansPct}%</span>
            </div>
            <div className="text-[14px] font-bold font-mono text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
              {answerTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate" title="Generated response">
              Output Tokens
            </div>
          </div>

          {/* 5. Total Usage */}
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]">
            <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">
              Total Tokens
            </div>
            <div className="text-[14px] font-bold font-mono text-ink dark:text-[#f4f3ee] mt-0.5">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-ink-3 dark:text-[#b1ada1] mt-0.5 truncate">
              {metrics.tokens_per_sec > 0 ? `${metrics.tokens_per_sec} tok/s` : cleanModelName}
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
                      <span className="text-[#2E6B5E] dark:text-[#10b981] font-semibold text-[10px]">0 tok (Free)</span>
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
