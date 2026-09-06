import React from 'react';
import { Cpu, HardDrive, Activity, Server, Zap, CheckCircle2, Database } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';

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
    <div className="space-y-6 animate-fade-in font-ui">
      {/* System Node Telemetry Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tooltip content="Average query response generation time across all turns">
          <div className={`p-5 rounded-3xl border space-y-2 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className={`flex justify-between items-center text-xs font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
              <span>Average Query Latency</span>
              <Activity className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{avgLatency} ms</div>
            <div className="text-[11px] text-[#10b981] font-semibold">Measured across all assistant turns</div>
          </div>
        </Tooltip>

        <Tooltip content="Total active chat session records logged in Neon PostgreSQL">
          <div className={`p-5 rounded-3xl border space-y-2 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className={`flex justify-between items-center text-xs font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
              <span>Active Database Sessions</span>
              <HardDrive className={`w-4 h-4 ${isDark ? 'text-[#10b981]' : 'text-[#2E6B5E]'}`} />
            </div>
            <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{totalSessions.toLocaleString()}</div>
            <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Neon PostgreSQL session records</div>
          </div>
        </Tooltip>

        <Tooltip content="Cumulative token volume processed across prompt & completion cycles">
          <div className={`p-5 rounded-3xl border space-y-2 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className={`flex justify-between items-center text-xs font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
              <span>Tokens Processed</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
              {totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(2) + 'M' : totalTokens.toLocaleString()}
            </div>
            <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Prompt + completion tokens</div>
          </div>
        </Tooltip>

        <Tooltip content="Queries served directly from sub-15ms vector cache">
          <div className={`p-5 rounded-3xl border space-y-2 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className={`flex justify-between items-center text-xs font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
              <span>Vector Cache Hits</span>
              <Server className={`w-4 h-4 ${isDark ? 'text-[#10b981]' : 'text-[#2E6B5E]'}`} />
            </div>
            <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{cachedQueries.toLocaleString()}</div>
            <div className="text-[11px] text-[#10b981] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> High-speed cache hits
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Latency Quantiles & Subsystem Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-colors backdrop-blur-xl ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}>
          <h2 className={`text-lg font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>Measured Latency Distribution Quantiles</h2>
          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                <span>p50 (Median Latency)</span>
                <span className="text-[#10b981] font-bold">{p50} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-[#F7F6ED]'}`}>
                <div className="bg-[#10b981] h-full" style={{ width: `${Math.min(100, Math.max(10, (p50 / (p99 || 1)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                <span>p95 Tail Latency</span>
                <span className="text-[#10b981] font-bold">{p95} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-[#F7F6ED]'}`}>
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(15, (p95 / (p99 || 1)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className={`flex justify-between mb-1 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                <span>p99 Maximum Bound</span>
                <span className="text-teal-500 font-bold">{p99} ms</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-[#F7F6ED]'}`}>
                <div className="bg-teal-500 h-full w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 transition-colors backdrop-blur-xl ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}>
          <h2 className={`text-lg font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>Sub-system Status & Architecture</h2>
          <div className="space-y-3 text-xs">
            <div className={`p-3 rounded-2xl border flex justify-between items-center ${
              isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#F7F6ED] border-black/[0.08]'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>FastAPI Asynchronous Engine</div>
                <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Port 8000 • Uvicorn Async Loop</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#10b981] font-mono font-bold">Active</span>
            </div>
            <div className={`p-3 rounded-2xl border flex justify-between items-center ${
              isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#F7F6ED] border-black/[0.08]'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>Qdrant Vector Storage Engine</div>
                <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Cosine Metric • 1,380 Indexed Chunks (2048-d)</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#10b981] font-mono font-bold">Active</span>
            </div>
            <div className={`p-3 rounded-2xl border flex justify-between items-center ${
              isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#F7F6ED] border-black/[0.08]'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>Neon PostgreSQL Database</div>
                <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Live Session Storage & Query Cache</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#10b981] font-mono font-bold">Connected</span>
            </div>
            <div className={`p-3 rounded-2xl border flex justify-between items-center ${
              isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#F7F6ED] border-black/[0.08]'
            }`}>
              <div>
                <div className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>NeMo Safety Interceptor</div>
                <div className={`text-[11px] ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Colang 2.0 Policy Runner</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-[#10b981] font-mono font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
