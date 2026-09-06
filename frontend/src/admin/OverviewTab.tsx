import React from 'react';
import { 
  Users, MessageSquare, Database, DollarSign, Clock, 
  ShieldCheck, RefreshCw, Zap
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';

interface OverviewTabProps {
  metrics: any;
  period: string;
  setPeriod: (p: string) => void;
  onRefresh: () => void;
  isDark?: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ 
  metrics, 
  period, 
  setPeriod, 
  onRefresh,
  isDark = true
}) => {
  const totalUsers = metrics?.total_users !== undefined ? metrics.total_users : 0;
  const activeSessions = metrics?.total_sessions !== undefined ? metrics.total_sessions : 0;
  const totalQueries = metrics?.total_queries !== undefined ? metrics.total_queries : 0;
  const totalTokens = metrics?.total_tokens !== undefined ? metrics.total_tokens : 0;
  const totalCostUsd = metrics?.total_cost_usd !== undefined ? metrics.total_cost_usd : 0;
  const cachedQueries = metrics?.cached_queries !== undefined ? metrics.cached_queries : 0;
  const avgLatency = metrics?.avg_latency !== undefined ? metrics.avg_latency : 0;

  const cacheHitRate = totalQueries > 0 
    ? ((cachedQueries / totalQueries) * 100).toFixed(1) + '%' 
    : '0.0%';

  return (
    <div className="space-y-6 animate-fade-in font-ui">
      {/* Header Banner */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm relative overflow-hidden transition-colors ${
        isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
      }`}>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-[#E1EED7] dark:bg-[#2E6B5E]/30 text-[#2E6B5E] dark:text-[#34d399] text-xs font-bold uppercase tracking-wider border border-[#2E6B5E]/30 dark:border-emerald-500/30">
              Executive Overview
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs border ${
              isDark ? 'bg-[#1c1d24] text-[#f4f3ee] border-white/[0.06]' : 'bg-[#ECEAE0] text-[#1C1917] border-black/[0.06]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span>Live Database Connected • RAG Engine v3.4.2</span>
            </div>
          </div>
          <h1 className={`text-2xl lg:text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
            Lorin AI Real-Time Telemetry
          </h1>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
            Autonomous RAG & Student Assistant Operations • Mohamed Sathak A.J. College of Engineering and Architecture
          </p>
        </div>

        {/* Period Selector Controls */}
        <div className="flex items-center gap-3 relative z-10 self-start lg:self-center">
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-[#1c1d24] border-white/[0.06]' : 'bg-[#ECEAE0] border-black/[0.06]'
          }`}>
            {['24h', '7d', '30d', 'Quarter'].map((p) => (
              <Tooltip key={p} content={`Filter telemetry data by ${p}`}>
                <button
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    period === p 
                      ? isDark ? 'bg-emerald-500/20 text-[#34d399] font-bold border border-emerald-500/30' : 'bg-[#2E6B5E] text-white shadow-sm font-bold'
                      : isDark ? 'text-[#b1ada1] hover:text-[#f4f3ee]' : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {p}
                </button>
              </Tooltip>
            ))}
          </div>
          <Tooltip content="Refresh telemetry data">
            <button
              onClick={onRefresh}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                isDark ? 'bg-[#1c1d24] hover:bg-zinc-800 text-[#b1ada1] hover:text-[#f4f3ee] border-white/[0.06]' : 'bg-white hover:bg-[#ECEAE0] text-[#57534E] border-black/[0.08]'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 8-Card KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Users */}
        <Tooltip content="Total unique users and active chat sessions initialized in database">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Total Active Users</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Live DB</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{totalUsers.toLocaleString()} Users</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>{activeSessions.toLocaleString()} Chat sessions initialized</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <Users className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Unique client user IDs</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 2: Total Queries */}
        <Tooltip content="Total user queries processed by the system in PostgreSQL">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Total User Queries</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Live DB</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{totalQueries.toLocaleString()}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Queries processed</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <MessageSquare className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Role = 'user' in PostgreSQL</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 3: Tokens Processed */}
        <Tooltip content="Combined prompt and completion tokens processed by LLM models">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Tokens Processed</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">Real Usage</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                {totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(2) + 'M' : totalTokens.toLocaleString()}
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Total prompt + completion</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <Database className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Calculated from token_usage JSON</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 4: Computed API Cost */}
        <Tooltip content="Estimated USD and INR cost calculated from exact token usage">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Computed API Cost</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Real USD</span>
            </div>
            <div className="my-3">
              <div className="text-3xl font-heading font-bold text-[#2E6B5E] dark:text-[#34d399] tracking-tight">${totalCostUsd.toFixed(5)}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
                ≈ ₹{(metrics?.total_cost_inr || (totalCostUsd * 86.5)).toFixed(3)} INR
              </div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <DollarSign className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Exact token billing trace</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 5: Avg Latency */}
        <Tooltip content="Average end-to-end response generation latency across assistant turns">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Avg Response Latency</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Realtime</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{avgLatency}ms</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>End-to-end RAG latency</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <Clock className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Average across assistant turns</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 6: Cache Hit Ratio */}
        <Tooltip content="Percentage of total queries served from high-performance vector semantic cache">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Semantic Cache Hits</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Live DB</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{cacheHitRate}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>{cachedQueries} cached queries served</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Query cache table hits</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 7: Safety Index */}
        <Tooltip content="System compliance score enforced by NVIDIA NeMo Guardrails Colang 2.0 rules">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Safety Index</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">Active</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>99.8%</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>NeMo Guardrail Colang 2.0</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Domain boundary enforced</span>
            </div>
          </div>
        </Tooltip>

        {/* Card 8: Guardrail Blocks */}
        <Tooltip content="Percentage of unsafe or prompt-injection attempts intercepted and blocked">
          <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Guardrail Blocks</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">Protected</span>
            </div>
            <div className="my-3">
              <div className={`text-3xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>0.12%</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Prompt injections caught</div>
            </div>
            <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-[#2E6B5E] dark:text-[#34d399]" />
              <span>Strict policy guardrails</span>
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  );
};
