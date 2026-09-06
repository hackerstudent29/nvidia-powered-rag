import React from 'react';
import { Cpu, HardDrive, Activity, Server, Zap, CheckCircle2, Database } from 'lucide-react';

interface SystemTabProps {
  metrics?: any;
  isDark?: boolean;
}

export const SystemTab: React.FC<SystemTabProps> = ({ metrics, isDark = true }) => {
  const avgLatency = metrics?.avg_latency || 0;
  const p50 = metrics?.p50_latency || 0;
  const p95 = metrics?.p95_latency || 0;
  const p99 = metrics?.p99_latency || 0;
  const totalQueries = metrics?.total_queries || 0;
  const totalSessions = metrics?.total_sessions || 0;
  const totalTokens = metrics?.total_tokens || 0;
  const cachedQueries = metrics?.cached_queries || 0;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* System Node Telemetry Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border shadow-lg space-y-2 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
            <span>Average Query Latency</span>
            <Activity className="w-4 h-4 text-[#059669]" />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{avgLatency} ms</div>
          <div className="text-[11px] text-[#059669] font-medium">Measured across all assistant turns</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg space-y-2 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
            <span>Active Database Sessions</span>
            <HardDrive className={`w-4 h-4 ${isDark ? 'text-[#D0E7E1]' : 'text-slate-600'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{totalSessions.toLocaleString()}</div>
          <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Neon PostgreSQL session records</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg space-y-2 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
            <span>Tokens Processed</span>
            <Zap className={`w-4 h-4 ${isDark ? 'text-[#D0CCE5]' : 'text-amber-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
            {totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(2) + 'M' : totalTokens.toLocaleString()}
          </div>
          <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Prompt + completion tokens</div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg space-y-2 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex justify-between items-center text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
            <span>Vector Cache Hits</span>
            <Server className={`w-4 h-4 ${isDark ? 'text-[#E1EED7]' : 'text-[#059669]'}`} />
          </div>
          <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{cachedQueries.toLocaleString()}</div>
          <div className="text-[11px] text-[#059669] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> High-speed cache hits
          </div>
        </div>
      </div>

      {/* Latency Quantiles & Subsystem Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-colors ${
          isDark ? 'bg-[#131b26]/80 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>Measured Latency Distribution Quantiles</h2>
          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                <span>p50 (Median Latency)</span>
                <span className="text-[#059669] font-bold">{p50} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a2434]' : 'bg-slate-100'}`}>
                <div className="bg-[#059669] h-full" style={{ width: `${Math.min(100, Math.max(10, (p50 / (p99 || 1)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                <span>p95 Tail Latency</span>
                <span className="text-[#059669] font-bold">{p95} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a2434]' : 'bg-slate-100'}`}>
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(15, (p95 / (p99 || 1)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                <span>p99 Maximum Bound</span>
                <span className="text-teal-600 font-bold">{p99} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a2434]' : 'bg-slate-100'}`}>
                <div className="bg-teal-500 h-full w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-colors ${
          isDark ? 'bg-[#131b26]/80 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>Sub-system Status & Architecture</h2>
          <div className="space-y-3 text-xs">
            <div className={`p-3 rounded-xl border flex justify-between items-center ${
              isDark ? 'bg-[#1a2434] border-[#243247]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>FastAPI Asynchronous Engine</div>
                <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Port 8000 • Uvicorn Async Loop</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 font-bold">Active</span>
            </div>
            <div className={`p-3 rounded-xl border flex justify-between items-center ${
              isDark ? 'bg-[#1a2434] border-[#243247]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>Qdrant Vector Storage Engine</div>
                <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Cosine Metric • 1,380 Indexed Chunks (2048-d)</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 font-bold">Active</span>
            </div>
            <div className={`p-3 rounded-xl border flex justify-between items-center ${
              isDark ? 'bg-[#1a2434] border-[#243247]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>Neon PostgreSQL Database</div>
                <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Live Session Storage & Query Cache</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 font-bold">Connected</span>
            </div>
            <div className={`p-3 rounded-xl border flex justify-between items-center ${
              isDark ? 'bg-[#1a2434] border-[#243247]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>NeMo Safety Interceptor</div>
                <div className={`text-[11px] ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Colang 2.0 Policy Runner</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-600 font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
