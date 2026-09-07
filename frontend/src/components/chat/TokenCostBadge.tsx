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

  return (
    <Tooltip content="View model-wise & step-wise token cost telemetry" position="top">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onClick}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 border border-line shadow-hairline ${
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
        className="text-accent"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>

      {cleanModelName && (
        <>
          <span className="font-semibold text-ink">
            {cleanModelName}
          </span>
          <span className="text-ink-3/60">•</span>
        </>
      )}

      <span className="tabular-nums font-mono text-ink-2">
        {metrics.total_tokens.toLocaleString()} tok
      </span>
      <span className="text-ink-3/60">•</span>
      <span className="tabular-nums font-mono text-ink">
        {formattedLatency}
      </span>

      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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

  return (
    <div className="w-full rounded-2xl bg-surface/90 dark:bg-[#14151a]/90 text-ink dark:text-[#f4f3ee] mt-2 mb-1 p-3.5 border border-black/[0.08] dark:border-white/[0.08] shadow-md backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-start gap-4 lg:gap-8">
        
        {/* Left Side: Core Stats */}
        <div className="flex flex-col gap-2 shrink-0 md:w-[260px]">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[#E1EED7] dark:bg-[#2E6B5E]/30 border border-[#2E6B5E]/30 dark:border-[#10b981]/30 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981] shadow-sm shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="text-[11.5px] font-bold text-ink dark:text-[#f4f3ee]">
              Token Usage & Performance
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">
             <div>
                <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">Total Tokens</div>
                <div className="text-[13px] font-bold text-ink dark:text-[#f4f3ee] font-mono mt-0.5">{metrics.total_tokens.toLocaleString()}</div>
             </div>
             <div>
                <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">Total Cost</div>
                <div className="text-[13px] font-bold text-[#2E6B5E] dark:text-[#10b981] mt-0.5">
                  {formattedCostUsd} <span className="text-[10px] font-normal text-ink-3 dark:text-[#b1ada1]">({formattedCostInr})</span>
                </div>
             </div>
             <div>
                <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">Gen Speed</div>
                <div className="text-[12px] font-semibold text-ink dark:text-[#f4f3ee] mt-0.5">{metrics.tokens_per_sec} <span className="text-[10px] text-ink-3 dark:text-[#b1ada1] font-normal">tok/s</span></div>
             </div>
             <div>
                <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider">Latency</div>
                <div className="text-[12px] font-semibold text-ink dark:text-[#f4f3ee] font-mono mt-0.5">{metrics.latency_ms}ms</div>
             </div>
          </div>
        </div>

        {/* Right Side: Pipeline Steps */}
        <div className="flex-1">
          <div className="text-[9px] uppercase font-bold text-ink-3 dark:text-[#b1ada1] tracking-wider mb-2">Execution Pipeline</div>
          <div className="flex flex-wrap gap-2">
            {metrics.steps.map((step) => (
              <Tooltip key={step.step_number} content={step.details || step.model_name} position="top">
                <div className="flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 text-[10px]">
                  <span className="font-bold text-[#2E6B5E] dark:text-[#10b981] shrink-0">{step.step_number}</span>
                  <span className="font-medium text-ink dark:text-[#f4f3ee]">{step.step_name}</span>
                  <span className="text-ink-3/80 dark:text-[#b1ada1] font-mono text-[9px] pl-1.5 border-l border-black/[0.08] dark:border-white/[0.08]">
                    {step.total_tokens > 0 ? `${step.total_tokens} tok` : `${step.duration_ms}ms`}
                  </span>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

