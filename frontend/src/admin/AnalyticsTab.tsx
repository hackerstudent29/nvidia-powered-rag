import React from 'react';
import { Zap, Trash2, Database, BarChart2 } from 'lucide-react';

interface AnalyticsTabProps {
  cacheEntries: any[];
  onPurgeCache: () => void;
  isDark?: boolean;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ 
  cacheEntries, 
  onPurgeCache,
  isDark = true
}) => {
  const totalHits = cacheEntries.reduce((acc, curr) => acc + (curr.hit_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in font-ui">
      {/* Cache Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border flex items-center justify-between transition-colors backdrop-blur-xl ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-mono font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Real Cache Entries</div>
            <div className={`text-2xl font-heading font-bold my-1 ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{cacheEntries.length} Entries</div>
            <div className="text-xs text-[#10b981] font-semibold">Stored in query_cache table</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#2E6B5E]/20 text-[#10b981]">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between transition-colors backdrop-blur-xl ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-mono font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Total Cache Hits</div>
            <div className={`text-2xl font-heading font-bold my-1 ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{totalHits.toLocaleString()} Hits</div>
            <div className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>0.94 Cosine Threshold</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.06] text-[#10b981]">
            <Database className="w-6 h-6 text-[#10b981]" />
          </div>
        </div>

        <div className={`p-5 rounded-3xl border flex items-center justify-between transition-colors backdrop-blur-xl ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-mono font-semibold ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>Cache Latency</div>
            <div className={`text-2xl font-heading font-bold my-1 ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>&lt; 15ms</div>
            <div className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Fast vector matching</div>
          </div>
          <div className="p-3 rounded-2xl bg-[#2E6B5E]/20 text-[#10b981]">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Semantic Cache Inspector Table */}
      <div className={`border rounded-3xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
      }`}>
        <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isDark ? 'border-white/[0.06]' : 'border-black/[0.08]'
        }`}>
          <div>
            <h2 className={`text-xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
              Database Semantic Cache Inspector ({cacheEntries.length})
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              Live cached query patterns from database table `query_cache`
            </p>
          </div>
          <button 
            onClick={onPurgeCache}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-semibold transition-all border border-rose-500/30"
          >
            <Trash2 className="w-4 h-4" /> Purge DB Cache
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0c0e]/80 text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08]'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">Cached Query Pattern</th>
                <th className="px-6 py-4 font-semibold text-center w-1/6">Hit Count</th>
                <th className="px-6 py-4 font-semibold w-1/2">Cached Answer Snippet</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
              {cacheEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-12 text-center ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                    Cache is currently empty in database.
                  </td>
                </tr>
              ) : (
                cacheEntries.map((entry, i) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#F7F6ED]/60'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{entry.query_text}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        isDark ? 'bg-[#2E6B5E]/20 text-[#10b981] border-[#2E6B5E]/30' : 'bg-emerald-50 text-[#059669] border-emerald-200'
                      }`}>
                        {entry.hit_count} hits
                      </span>
                    </td>
                    <td className={`px-6 py-4 truncate max-w-md ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>{entry.answer_text}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
