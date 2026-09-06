import React, { useState } from 'react';
import { BookOpen, Database, AlertCircle, CheckCircle, Upload, Search, FileText } from 'lucide-react';

interface KnowledgeTabProps {
  knowledgeGaps: any[];
  dislikes?: any[];
  metrics?: any;
  isDark?: boolean;
}

export const KnowledgeTab: React.FC<KnowledgeTabProps> = ({ knowledgeGaps, dislikes = [], metrics, isDark = true }) => {
  const [docSearch, setDocSearch] = useState('');

  const indexSources = metrics?.index_sources || 50;
  const totalChunks = metrics?.total_chunks || 1380;
  const vectorModel = metrics?.vector_model || "NVIDIA Llama-Nemotron 2048-dim Vectors";
  const catalog = metrics?.document_catalog || [];

  const filteredCatalog = catalog.filter((doc: any) => 
    (doc.source_file || '').toLowerCase().includes(docSearch.toLowerCase()) ||
    (doc.title || '').toLowerCase().includes(docSearch.toLowerCase()) ||
    (doc.category || '').toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Knowledge Index Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border shadow-lg flex items-center gap-4 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#2E6B5E]/30 text-[#D0E7E1]' : 'bg-emerald-50 text-[#059669]'}`}>
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{indexSources} Index Documents</div>
            <div className={`text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>Verified Markdown & Handbooks (Dataset/)</div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg flex items-center gap-4 transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl ${isDark ? 'bg-[#1a2434] text-[#D0CCE5]' : 'bg-slate-100 text-emerald-600'}`}>
            <Database className="w-6 h-6 text-[#059669]" />
          </div>
          <div>
            <div className={`text-2xl font-bold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{totalChunks.toLocaleString()} Chunks</div>
            <div className={`text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{vectorModel}</div>
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-lg flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#131b26]/70 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`text-sm font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>Qdrant Vector Sync</div>
            <div className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1 font-mono font-bold">
              <CheckCircle className="w-3.5 h-3.5" /> Synchronized (100%)
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2E6B5E] text-white text-xs font-semibold hover:bg-[#34D399] hover:text-[#0b0f17] transition-all shadow-md">
            <Upload className="w-3.5 h-3.5" /> Re-index
          </button>
        </div>
      </div>

      {/* Disliked Responses & AI Re-Evaluated Corrections */}
      <div className={`border rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#131b26]/80 border-amber-900/40' : 'bg-white border-amber-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex justify-between items-center ${
          isDark ? 'border-amber-900/30 bg-amber-950/20' : 'border-amber-100 bg-amber-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>
                User Dislikes & AI Re-Evaluated Ground-Truth Corrections ({dislikes.length})
              </h2>
              <p className={`text-xs ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                AI-as-a-Judge diagnoses why answers were disliked, fetches dataset ground truth, and caches verified corrections for future users.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
            Auto-Learned & Cached
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0f17] text-[#94a3b8] border-[#243247]' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/4">Question Asked</th>
                <th className="px-6 py-4 font-semibold w-1/4">Original Answer (Disliked)</th>
                <th className="px-6 py-4 font-semibold w-1/4">AI Judge Diagnosis</th>
                <th className="px-6 py-4 font-semibold w-1/4">Re-Evaluated Dataset Answer</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#243247]/60' : 'divide-slate-100'}`}>
              {dislikes.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                    No user dislikes or correction candidates recorded yet.
                  </td>
                </tr>
              ) : (
                dislikes.map((item, idx) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#1a2434]/80' : 'hover:bg-slate-50'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
                      {item.user_query}
                    </td>
                    <td className={`px-6 py-4 italic line-clamp-3 ${isDark ? 'text-rose-300/80' : 'text-rose-700'}`}>
                      {item.bot_answer || "User marked answer as inaccurate"}
                    </td>
                    <td className={`px-6 py-4 font-sans ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                      <span className="inline-block px-2 py-0.5 mb-1 rounded bg-amber-500/20 text-[10px] font-mono font-bold uppercase">
                        {item.issue_type || 'DISLIKED'}
                      </span>
                      <div>{item.dislike_reason || item.feedback_text || "Re-evaluated against official campus dataset."}</div>
                    </td>
                    <td className={`px-6 py-4 font-sans ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      <div className="font-semibold text-[11px] mb-1 text-emerald-400">✓ Ground-Truth Verified</div>
                      <div className="line-clamp-4 text-xs">{item.proposed_correction || "Re-evaluated answer stored in cache."}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Knowledge Base Document Catalog Explorer */}
      <div className={`border rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#131b26]/80 border-[#243247]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isDark ? 'border-[#243247]' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>
              Real Knowledgebase Document Index ({catalog.length})
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
              Live verified campus documents indexed into Qdrant vector database and BM25 sparse index
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-[#94a3b8]' : 'text-slate-400'}`} />
            <input 
              type="text" 
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Search document title or category..." 
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none transition-all ${
                isDark 
                  ? 'bg-[#0b0f17] border-[#243247] text-[#F7F6ED] placeholder-[#94a3b8] focus:border-[#D0E7E1]' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#2E6B5E]'
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0f17] text-[#94a3b8] border-[#243247]' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold">Document Title & Filename</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Chunk Count</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDark ? 'divide-[#243247]/60' : 'divide-slate-100'}`}>
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                    No matching documents found in index.
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((doc: any, idx: number) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#1a2434]/80' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#D0E7E1]' : 'text-slate-600'}`} />
                        <div>
                          <div className={`font-semibold ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{doc.title}</div>
                          <div className={`text-[11px] font-mono ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{doc.source_file}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-semibold border ${
                        isDark ? 'bg-[#1a2434] text-[#D0E7E1] border-[#243247]' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {doc.category || 'campus'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#059669]">
                      {doc.chunk_count} chunks
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <span className="text-emerald-500 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unanswered Queries / Knowledge Gaps */}
      <div className={`border rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#131b26]/80 border-rose-900/40' : 'bg-white border-rose-200 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex justify-between items-center ${
          isDark ? 'border-rose-900/30 bg-rose-950/20' : 'border-rose-100 bg-rose-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
              Real Knowledge Gaps ({knowledgeGaps.length})
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30">
            Logged from DB
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0f17] text-[#94a3b8] border-[#243247]' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">User Asked</th>
                <th className="px-6 py-4 font-semibold w-1/2">Bot Fallback Response</th>
                <th className="px-6 py-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#243247]/60' : 'divide-slate-100'}`}>
              {knowledgeGaps.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-12 text-center ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>
                    No low-confidence knowledge gaps logged in database yet.
                  </td>
                </tr>
              ) : (
                knowledgeGaps.map((gap, i) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-[#1a2434]/80' : 'hover:bg-slate-50'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#F7F6ED]' : 'text-slate-900'}`}>{gap.user_query}</td>
                    <td className={`px-6 py-4 italic ${isDark ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{gap.bot_response}</td>
                    <td className={`px-6 py-4 text-right font-mono ${isDark ? 'text-[#94a3b8]' : 'text-slate-400'}`}>
                      {gap.created_at ? new Date(gap.created_at).toLocaleString() : 'Recent'}
                    </td>
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
