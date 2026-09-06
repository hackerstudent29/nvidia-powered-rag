import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, ThumbsUp, ThumbsDown, Clock, Zap, Cpu, FileText, 
  Database, ChevronDown, ChevronUp, Layers, CheckCircle2 
} from 'lucide-react';

interface TraceDrawerProps {
  sessionId: string | null;
  sessionDetails: any;
  loading: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const TraceDrawer: React.FC<TraceDrawerProps> = ({
  sessionId,
  sessionDetails,
  loading,
  onClose,
  isDark = true
}) => {
  if (!sessionId) return null;

  const messages = sessionDetails?.messages || [];
  const sessionInfo = sessionDetails?.session_info || {};

  // Group messages into Q&A turns
  const turns: { user?: any; assistant?: any }[] = [];
  let tempUser: any = null;

  messages.forEach((msg: any) => {
    if (msg.role === 'user') {
      if (tempUser) {
        turns.push({ user: tempUser });
      }
      tempUser = msg;
    } else if (msg.role === 'assistant') {
      turns.push({ user: tempUser, assistant: msg });
      tempUser = null;
    }
  });
  if (tempUser) {
    turns.push({ user: tempUser });
  }

  // State for expanded turn indices (default expand last turn)
  const [expandedTurns, setExpandedTurns] = useState<Record<number, boolean>>({});

  const toggleTurn = (index: number) => {
    setExpandedTurns(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Compact Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[560px] border-l shadow-2xl z-50 transform transition-transform duration-300 flex flex-col font-ui text-xs ${
        isDark ? 'bg-[#0b0c0e] border-white/[0.08] text-[#f4f3ee]' : 'bg-white border-black/[0.08] text-[#1C1917]'
      }`}>
        
        {/* Compact Header */}
        <div className={`p-4 border-b flex justify-between items-center ${
          isDark ? 'border-white/[0.06] bg-[#14151a]' : 'border-black/[0.08] bg-[#F7F6ED]'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-[#2E6B5E]/20 text-[#10b981]">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm font-heading font-bold tracking-tight truncate ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                Session Trace Inspector
              </h3>
              <p className={`text-[11px] font-mono truncate ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                ID: {sessionId}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/[0.08] text-[#b1ada1] hover:text-[#f4f3ee]' : 'hover:bg-black/[0.05] text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#10b981]" />
              <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                Loading telemetry & RAG trace...
              </p>
            </div>
          ) : (
            <>
              {/* Compact Session Metadata Bar */}
              <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono ${
                isDark ? 'bg-[#14151a] border-white/[0.06] text-[#b1ada1]' : 'bg-[#F7F6ED] border-black/[0.08] text-[#57534E]'
              }`}>
                <span>IP: <strong className={isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}>{sessionInfo.user_ip || '127.0.0.1'}</strong></span>
                <span>Turns: <strong className={isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}>{turns.length} Q&A Pairs</strong></span>
                <span>Created: <strong className={isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}>{sessionInfo.created_at ? new Date(sessionInfo.created_at).toLocaleTimeString() : 'Recent'}</strong></span>
              </div>

              {/* Q&A Accordion Turns */}
              {turns.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                  No message history recorded for this session.
                </div>
              ) : (
                turns.map((turn, idx) => {
                  const isExpanded = expandedTurns[idx] ?? (idx === turns.length - 1);
                  const userMsg = turn.user;
                  const asstMsg = turn.assistant;

                  let parsedUsage = asstMsg?.token_usage;
                  if (typeof parsedUsage === 'string') {
                    try { parsedUsage = JSON.parse(parsedUsage); } catch(e){}
                  }

                  const promptTokens = parsedUsage?.prompt_tokens ?? 0;
                  const completionTokens = parsedUsage?.completion_tokens ?? 0;
                  const totalTokens = parsedUsage?.total_tokens ?? (promptTokens + completionTokens);
                  const totalCostUsd = parsedUsage?.total_cost_usd ?? 0.0;
                  const citations = Array.isArray(asstMsg?.citations) ? asstMsg.citations : [];

                  return (
                    <div 
                      key={idx} 
                      className={`border rounded-2xl transition-all shadow-sm overflow-hidden ${
                        isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleTurn(idx)}
                        className={`w-full p-3 flex items-center justify-between text-left gap-3 transition-colors ${
                          isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-[#F7F6ED]/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2E6B5E]/20 text-[#10b981] border border-[#2E6B5E]/30">
                            Q#{idx + 1}
                          </span>
                          <span className={`text-xs font-semibold truncate ${
                            isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'
                          }`}>
                            {userMsg?.content || 'User Prompt'}
                          </span>
                        </div>

                        {/* Quick Telemetry Pills */}
                        <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                          {totalTokens > 0 && (
                            <span className="text-[#10b981] font-bold">
                              {totalTokens.toLocaleString()} tok
                            </span>
                          )}
                          {totalCostUsd > 0 && (
                            <span className="text-[#10b981] font-bold">
                              ${totalCostUsd.toFixed(4)}
                            </span>
                          )}
                          {asstMsg?.latency_ms && (
                            <span className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>
                              {(asstMsg.latency_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                          <div className={`p-1 rounded ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Expandable Accordion Content */}
                      {isExpanded && (
                        <div className={`p-4 border-t space-y-4 ${
                          isDark ? 'border-white/[0.06] bg-[#0b0c0e]/50' : 'border-black/[0.06] bg-[#F7F6ED]/50'
                        }`}>
                          {/* User Prompt Box */}
                          {userMsg && (
                            <div className="space-y-1">
                              <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                                isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'
                              }`}>
                                User Question
                              </div>
                              <div className={`p-3 rounded-2xl border text-xs font-medium ${
                                isDark ? 'bg-white/[0.04] border-white/[0.06] text-[#f4f3ee]' : 'bg-white border-black/[0.08] text-[#1C1917]'
                              }`}>
                                {userMsg.content}
                              </div>
                            </div>
                          )}

                          {/* Assistant Response Box (Rendered formatted Markdown like User Chatbox) */}
                          {asstMsg && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#10b981] font-bold flex items-center gap-1">
                                  <Cpu className="w-3.5 h-3.5" /> Lorin AI ({asstMsg.model_used || "Nemotron"})
                                </span>
                                <span className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>
                                  {asstMsg.created_at ? new Date(asstMsg.created_at).toLocaleTimeString() : ''}
                                </span>
                              </div>

                              <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition-colors ${
                                isDark ? 'bg-[#14151a] border-white/[0.06] text-[#f4f3ee]' : 'bg-white border-black/[0.08] text-[#1C1917] shadow-sm'
                              }`}>
                                <div className="prose-admin max-w-none space-y-2">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                                      h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1 text-[#10b981]">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-xs font-bold mt-2 mb-1 text-[#10b981]">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-xs font-semibold mt-1.5 mb-1">{children}</h3>,
                                      strong: ({ children }) => <strong className="font-semibold text-[#10b981]">{children}</strong>,
                                      table: ({ children }) => (
                                        <div className="w-full overflow-x-auto my-2 border rounded-xl overflow-hidden border-none">
                                          <table className="w-full text-left text-[11px] border-collapse">{children}</table>
                                        </div>
                                      ),
                                      thead: ({ children }) => (
                                        <thead className={isDark ? 'bg-white/[0.06] text-[#f4f3ee]' : 'bg-[#F7F6ED] text-[#1C1917]'}>{children}</thead>
                                      ),
                                      tbody: ({ children }) => <tbody className="divide-y divide-white/[0.04]">{children}</tbody>,
                                      tr: ({ children }) => <tr>{children}</tr>,
                                      th: ({ children }) => <th className="p-2 font-semibold whitespace-normal break-words">{children}</th>,
                                      td: ({ children }) => <td className="p-2 whitespace-normal break-words">{children}</td>,
                                      code: ({ children }) => <code className="px-1.5 py-0.5 rounded-md bg-[#2E6B5E]/20 font-mono text-[10px] text-[#10b981]">{children}</code>
                                    }}
                                  >
                                    {asstMsg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>

                              {/* Grounded Sources & Citations */}
                              {citations.length > 0 && (
                                <div className="space-y-1.5 pt-2">
                                  <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 ${
                                    isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'
                                  }`}>
                                    <FileText className="w-3 h-3 text-[#10b981]" />
                                    Retrieved Grounding Sources ({citations.length})
                                  </div>
                                  <div className="space-y-1.5">
                                    {citations.map((cit: any, cIdx: number) => (
                                      <div key={cIdx} className={`p-3 rounded-2xl border text-[11px] space-y-0.5 ${
                                        isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-white border-black/[0.08]'
                                      }`}>
                                        <div className="flex items-center justify-between font-mono">
                                          <span className={`font-semibold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                                            📄 {cit.title || cit.source_file || `Source #${cIdx+1}`}
                                          </span>
                                          {cit.chunk_id && (
                                            <span className="text-[9px] text-[#10b981]">Chunk ID: {cit.chunk_id.slice(0, 8)}...</span>
                                          )}
                                        </div>
                                        {cit.snippet && (
                                          <p className={`text-[10px] line-clamp-2 italic ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
                                            "{cit.snippet}"
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Detailed Token & Telemetry Breakdown Grid */}
                              <div className={`p-3 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono ${
                                isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-black/[0.08]'
                              }`}>
                                <div>
                                  <div className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>Prompt Tok</div>
                                  <div className={`font-bold text-xs ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{promptTokens.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>Completion Tok</div>
                                  <div className={`font-bold text-xs ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>{completionTokens.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>Total Tokens</div>
                                  <div className="text-[#10b981] font-bold text-xs">{totalTokens.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>Cost USD</div>
                                  <div className="text-[#10b981] font-bold text-xs">${totalCostUsd.toFixed(5)}</div>
                                </div>
                              </div>

                              {/* Feedback / Badges */}
                              <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1">
                                {asstMsg.rating === 'thumbs_up' || asstMsg.rating === 1 ? (
                                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-[#10b981] border border-emerald-500/30 rounded-full flex items-center gap-1 font-semibold">
                                    <ThumbsUp className="w-3 h-3" /> Liked
                                  </span>
                                ) : null}
                                {asstMsg.rating === 'thumbs_down' || asstMsg.rating === -1 ? (
                                  <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-full flex items-center gap-1 font-semibold">
                                    <ThumbsDown className="w-3 h-3" /> Disliked
                                  </span>
                                ) : null}
                                {asstMsg.is_cached && (
                                  <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full font-semibold">
                                    Cache HIT
                                  </span>
                                )}
                              </div>

                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
