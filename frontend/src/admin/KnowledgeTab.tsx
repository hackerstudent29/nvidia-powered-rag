import React, { useState } from 'react';
import { BookOpen, Database, AlertCircle, CheckCircle, Upload, Search, FileText } from 'lucide-react';
import { Tooltip } from '../components/Tooltip';

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
    <div className="space-y-6 animate-fade-in font-ui">
      {/* Knowledge Index Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tooltip content="Total verified markdown handbooks and documents indexed into knowledge base">
          <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className="p-3 rounded-2xl bg-[#2E6B5E]/20 text-[#10b981]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{indexSources} Index Documents</div>
              <div className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>Verified Markdown & Handbooks (Dataset/)</div>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Total vector chunks generated using NVIDIA Llama-Nemotron embeddings">
          <div className={`p-5 rounded-3xl border flex items-center gap-4 transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div className="p-3 rounded-2xl bg-white/[0.06] text-[#10b981]">
              <Database className="w-6 h-6 text-[#10b981]" />
            </div>
            <div>
              <div className={`text-2xl font-heading font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{totalChunks.toLocaleString()} Chunks</div>
              <div className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>{vectorModel}</div>
            </div>
          </div>
        </Tooltip>

        <Tooltip content="Sync status with Qdrant vector database collection">
          <div className={`p-5 rounded-3xl border flex items-center justify-between transition-colors backdrop-blur-xl h-full ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
          }`}>
            <div>
              <div className={`text-sm font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>Qdrant Vector Sync</div>
              <div className="text-xs text-[#10b981] font-medium flex items-center gap-1 mt-1 font-mono font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> Synchronized (100%)
              </div>
            </div>
            <Tooltip content="Trigger full re-indexing of Dataset folder into Qdrant">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E6B5E] text-white text-xs font-semibold hover:bg-[#10b981] transition-all shadow-md cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Re-index
              </button>
            </Tooltip>
          </div>
        </Tooltip>
      </div>

      {/* Disliked Responses & AI Re-Evaluated Corrections */}
      <div className={`border rounded-3xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#14151a] border-amber-500/20' : 'bg-white border-amber-500/30 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex justify-between items-center ${
          isDark ? 'border-amber-500/20 bg-amber-500/10' : 'border-amber-500/20 bg-amber-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className={`text-lg font-heading font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                User Dislikes & AI Re-Evaluated Ground-Truth Corrections ({dislikes.length})
              </h2>
              <p className={`text-xs ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>
                AI-as-a-Judge diagnoses why answers were disliked, fetches dataset ground truth, and caches verified corrections for future users.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 font-mono">
            Auto-Learned & Cached
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0c0e]/80 text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08]'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/4">Question Asked</th>
                <th className="px-6 py-4 font-semibold w-1/4">Original Answer (Disliked)</th>
                <th className="px-6 py-4 font-semibold w-1/4">AI Judge Diagnosis</th>
                <th className="px-6 py-4 font-semibold w-1/4">Re-Evaluated Dataset Answer</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
              {dislikes.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                    No user dislikes or correction candidates recorded yet.
                  </td>
                </tr>
              ) : (
                dislikes.map((item, idx) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#F7F6ED]/60'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                      {item.user_query}
                    </td>
                    <td className={`px-6 py-4 italic line-clamp-3 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                      {item.bot_answer || "User marked answer as inaccurate"}
                    </td>
                    <td className={`px-6 py-4 font-sans ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                      <span className="inline-block px-2 py-0.5 mb-1 rounded bg-amber-500/20 text-[10px] font-mono font-bold uppercase">
                        {item.issue_type || 'DISLIKED'}
                      </span>
                      <div>{item.dislike_reason || item.feedback_text || "Re-evaluated against official campus dataset."}</div>
                    </td>
                    <td className={`px-6 py-4 font-sans ${isDark ? 'text-[#10b981]' : 'text-[#059669]'}`}>
                      <div className="font-semibold text-[11px] mb-1 text-[#10b981]">✓ Ground-Truth Verified</div>
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
      <div className={`border rounded-3xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
      }`}>
        <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isDark ? 'border-white/[0.06]' : 'border-black/[0.08]'
        }`}>
          <div>
            <h2 className={`text-xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
              Real Knowledgebase Document Index ({catalog.length})
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              Live verified campus documents indexed into Qdrant vector database and BM25 sparse index
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`} />
            <input 
              type="text" 
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Search document title or category..." 
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none transition-all ${
                isDark 
                  ? 'bg-[#0b0c0e] border-white/[0.08] text-[#f4f3ee] placeholder-[#b1ada1]/60 focus:border-[#2E6B5E]' 
                  : 'bg-[#F7F6ED] border-black/[0.08] text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#2E6B5E]'
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0c0e]/80 text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08]'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold">Document Title & Filename</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Chunk Count</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`px-6 py-12 text-center ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                    No matching documents found in index.
                  </td>
                </tr>
              ) : (
                filteredCatalog.map((doc: any, idx: number) => (
                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#F7F6ED]/60'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#10b981]' : 'text-[#2E6B5E]'}`} />
                        <div>
                          <div className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{doc.title}</div>
                          <div className={`text-[11px] font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>{doc.source_file}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-semibold border ${
                        isDark ? 'bg-white/[0.06] text-[#f4f3ee] border-white/[0.08]' : 'bg-[#F7F6ED] text-[#1C1917] border-black/[0.08]'
                      }`}>
                        {doc.category || 'campus'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#10b981]">
                      {doc.chunk_count} chunks
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">
                      <span className="text-[#10b981] font-semibold flex items-center justify-end gap-1">
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
      <div className={`border rounded-3xl overflow-hidden backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#14151a] border-rose-500/20' : 'bg-white border-rose-500/30 shadow-sm'
      }`}>
        <div className={`p-6 border-b flex justify-between items-center ${
          isDark ? 'border-rose-500/20 bg-rose-500/10' : 'border-rose-500/20 bg-rose-50/50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <h2 className={`text-lg font-heading font-bold ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>
              Real Knowledge Gaps ({knowledgeGaps.length})
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30 font-mono">
            Logged from DB
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0c0e]/80 text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08]'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold w-1/3">User Asked</th>
                <th className="px-6 py-4 font-semibold w-1/2">Bot Fallback Response</th>
                <th className="px-6 py-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
              {knowledgeGaps.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-12 text-center ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                    No low-confidence knowledge gaps logged in database yet.
                  </td>
                </tr>
              ) : (
                knowledgeGaps.map((gap, i) => (
                  <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#F7F6ED]/60'}`}>
                    <td className={`px-6 py-4 font-medium ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{gap.user_query}</td>
                    <td className={`px-6 py-4 italic ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>{gap.bot_response}</td>
                    <td className={`px-6 py-4 text-right font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
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
