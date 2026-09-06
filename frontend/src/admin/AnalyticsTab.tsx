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
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Cache Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-lg flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Real Cache Entries</div>
            <div className={`text-2xl font-bold my-1 ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{cacheEntries.length} Entries</div>
            <div className="text-xs text-[#059669]">Stored in query_cache table</div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#2E6B5E]/30 text-[#D0E7E1]' : 'bg-emerald-50 text-[#059669]'}`}>
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Total Cache Hits</div>
            <div className={`text-2xl font-bold my-1 ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{totalHits.toLocaleString()} Hits</div>
            <div className={`text-xs ${isDark ? 'text-[#D0CCE5]' : 'text-slate-500'}`}>0.94 Cosine Threshold</div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1a2434] text-[#D0CCE5]' : 'bg-slate-100 text-indigo-600'}`}>
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`text-xs uppercase tracking-wider font-medium ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Cache Latency</div>
            <div className={`text-2xl font-bold my-1 ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>&lt; 15ms</div>
            <div className={`text-xs ${isDark ? 'text-[#E1EED7]' : 'text-slate-500'}`}>Fast vector matching</div>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1a2434] text-[#E1EED7]' : 'bg-slate-100 text-emerald-600'}`}>
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Semantic Cache Inspector Table */}
      <div className={`border rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#131b26]/80 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isDark ? 'border-[#243247]' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
              Database Semantic Cache Inspector ({cacheEntries.length})
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
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
              isDark ? 'bg-[#0b0f17] text-[#94a3b8] border-[#243247]' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">Cached Query Pattern</th>
                <th className="px-6 py-4 font-semibold text-center w-1/6">Hit Count</th>
                <th className="px-6 py-4 font-semibold w-1/2">Cached Answer Snippet</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#243247]/60' : 'divide-slate-100'}`}>
              {cacheEntries.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-12 text-center ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                    Cache is currently empty in database.
                  </td>
                </tr>
              ) : (
                cacheEntries.map((entry, i) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-[#1a2434]/80' : 'hover:bg-slate-50'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{entry.query_text}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                        isDark ? 'bg-[#2E6B5E]/30 text-[#D0E7E1] border-[#243247]' : 'bg-emerald-50 text-[#059669] border-emerald-200'
                      }`}>
                        {entry.hit_count} hits
                      </span>
                    </td>
                    <td className={`px-6 py-4 truncate max-w-md ${isDark ? 'text-[#94a3b8]' : 'text-slate-600'}`}>{entry.answer_text}</td>
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
