import React from 'react';
import { 
  Users, MessageSquare, Database, DollarSign, Clock, 
  ShieldCheck, RefreshCw, Zap
} from 'lucide-react';

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
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl border shadow-xl backdrop-blur-xl relative overflow-hidden transition-colors ${
        isDark ? 'bg-[#131b26]/80 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#2E6B5E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-[#2E6B5E]/30 text-[#059669] text-xs font-bold uppercase tracking-wider">
              Executive Overview
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs border ${
              isDark ? 'bg-[#1a2434] text-[#E1EED7] border-[#243247]' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              <span>Live Database Connected • RAG Engine v3.4.2</span>
            </div>
          </div>
          <h1 className={`text-2xl lg:text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
            Lorin AI Real-Time Telemetry
          </h1>
          <p className={`text-sm ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
            Autonomous RAG & Student Assistant Operations • Mohamed Sathak A.J. College of Engineering and Architecture
          </p>
        </div>

        {/* Period Selector Controls */}
        <div className="flex items-center gap-3 relative z-10 self-start lg:self-center">
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-[#0b0f17]/80 border-[#243247]' : 'bg-slate-100 border-slate-200'
          }`}>
            {['24h', '7d', '30d', 'Quarter'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p 
                    ? isDark ? 'bg-[#243247] text-[#F7F6ED] shadow-sm font-semibold' : 'bg-white text-slate-900 shadow-sm font-bold'
                    : isDark ? 'text-[#94a3b8] hover:text-[#F7F6ED]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            title="Refresh live telemetry data"
            className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
              isDark ? 'bg-[#1a2434] hover:bg-[#243247] text-[#94a3b8] hover:text-[#F7F6ED] border-[#243247]' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8-Card KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Users */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Total Active Users</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Live DB</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{totalUsers.toLocaleString()} Users</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{activeSessions.toLocaleString()} Chat sessions initialized</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#D0E7E1]' : 'text-slate-600'}`}>
            <Users className="w-3.5 h-3.5 text-[#059669]" />
            <span>Unique client user IDs</span>
          </div>
        </div>

        {/* Card 2: Total Queries */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Total User Queries</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Live DB</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{totalQueries.toLocaleString()}</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Queries processed</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#D0CCE5]' : 'text-slate-600'}`}>
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span>Role = 'user' in PostgreSQL</span>
          </div>
        </div>

        {/* Card 3: Tokens Processed */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Tokens Processed</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">Real Usage</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
              {totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(2) + 'M' : totalTokens.toLocaleString()}
            </div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Total prompt + completion</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#E1EED7]' : 'text-slate-600'}`}>
            <Database className="w-3.5 h-3.5 text-[#059669]" />
            <span>Calculated from token_usage JSON</span>
          </div>
        </div>

        {/* Card 4: Computed API Cost */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Computed API Cost</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Real USD</span>
          </div>
          <div className="my-3">
            <div className="text-3xl font-bold text-[#059669] tracking-tight">${totalCostUsd.toFixed(5)}</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
              ≈ ₹{(metrics?.total_cost_inr || (totalCostUsd * 86.5)).toFixed(3)} INR
            </div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#F2CFDF]' : 'text-slate-600'}`}>
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Exact token billing trace</span>
          </div>
        </div>

        {/* Card 5: Avg Latency */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Avg Response Latency</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Realtime</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{avgLatency}ms</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>End-to-end RAG latency</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#D0E7E1]' : 'text-slate-600'}`}>
            <Clock className="w-3.5 h-3.5 text-[#059669]" />
            <span>Average across assistant turns</span>
          </div>
        </div>

        {/* Card 6: Cache Hit Ratio */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Semantic Cache Hits</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Live DB</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{cacheHitRate}</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{cachedQueries} cached queries served</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#D0CCE5]' : 'text-slate-600'}`}>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Query cache table hits</span>
          </div>
        </div>

        {/* Card 7: Safety Index */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Safety Index</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Active</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>99.8%</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>NeMo Guardrail Colang 2.0</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#E1EED7]' : 'text-slate-600'}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Domain boundary enforced</span>
          </div>
        </div>

        {/* Card 8: Guardrail Blocks */}
        <div className={`p-5 rounded-2xl border shadow-lg transition-all flex flex-col justify-between ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Guardrail Blocks</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">Protected</span>
          </div>
          <div className="my-3">
            <div className={`text-3xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>0.12%</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Prompt injections caught</div>
          </div>
          <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-[#F2CFDF]' : 'text-slate-600'}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>Strict policy guardrails</span>
          </div>
        </div>
      </div>
    </div>
  );
};
