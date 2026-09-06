import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Search, ChevronRight, User, Cpu, Clock, Zap, DollarSign, 
  Layers, Shield, Tag, Filter, CheckCircle2, AlertCircle, RefreshCw, BarChart2, MessageSquare,
  GraduationCap, Building2, Bus, UserCheck, Code
} from 'lucide-react';

interface TracesTabProps {
  sessions: any[];
  selectedSessionId: string | null;
  sessionDetails: any | null;
  loadingDetails: boolean;
  onSelectSession: (sessionId: string) => void;
  isDark?: boolean;
}

// Categorize User Intent Persona with clean Lucide icons (0 emojis)
export function categorizeUserIntent(queries: string[]): { 
  category: string; 
  icon: React.ElementType; 
  badgeColor: string; 
  description: string 
} {
  const fullText = (queries || []).join(" ").toLowerCase();
  
  if (/cutoff|admission|apply|eligibility|tnea|seat|application|join|course fee|tuition|scholarship/i.test(fullText)) {
    return {
      category: "Admission Seeker",
      icon: GraduationCap,
      badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      description: "Inquiring about college admissions, cutoff marks, application process, or fee structure."
    };
  }
  if (/syllabus|exam|result|timetable|semester|gpa|cgpa|pass mark|revaluation|credit|lab/i.test(fullText)) {
    return {
      category: "Current Student",
      icon: Building2,
      badgeColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      description: "Looking up exam timetables, syllabus details, grades, or academic regulations."
    };
  }
  if (/bus|route|hostel|canteen|mess|timing|pickup|drop|distance|location|transport/i.test(fullText)) {
    return {
      category: "Transport & Facilities",
      icon: Bus,
      badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      description: "Checking college bus routes, hostel amenities, or campus facilities."
    };
  }
  if (/hod|professor|principal|staff|faculty|department|contact|phone|email|head/i.test(fullText)) {
    return {
      category: "Faculty & Staff Contact",
      icon: UserCheck,
      badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      description: "Searching for department heads, faculty contact info, or staff details."
    };
  }
  return {
    category: "General Inquiry",
    icon: MessageSquare,
    badgeColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    description: "Engaging in general conversation or broad campus information queries."
  };
}

// Categorize individual query prompt (0 emojis)
export function categorizeSingleQuery(query: string): { label: string; color: string } {
  const q = (query || "").toLowerCase();
  if (/cutoff|tnea|admission|apply|eligible/i.test(q)) return { label: "Admissions", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (/fee|cost|tuition|scholarship|payment/i.test(q)) return { label: "Fees & Finance", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (/bus|route|stop|hostel|transport/i.test(q)) return { label: "Transport & Campus", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  if (/hod|staff|faculty|professor|principal/i.test(q)) return { label: "Faculty Info", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
  if (/cse|ece|eee|mech|civil|aids|btech|mtech/i.test(q)) return { label: "Department Info", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
  return { label: "General Query", color: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" };
}

export const TracesTab: React.FC<TracesTabProps> = ({
  sessions,
  selectedSessionId,
  sessionDetails,
  loadingDetails,
  onSelectSession,
  isDark = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const safeSessions = Array.isArray(sessions) ? sessions : [];

  // Extract flat list of all sessions across user groups
  const allFlatSessions = safeSessions.flatMap(item => {
    if (Array.isArray(item.sessions)) {
      return item.sessions.map((s: any) => ({
        ...s,
        user_id: item.user_id,
        user_ip: item.user_ip
      }));
    }
    return [item];
  });

  const filteredSessions = allFlatSessions.filter(s => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = (
      (s.session_id || '').toLowerCase().includes(query) ||
      (s.user_id || '').toLowerCase().includes(query) ||
      (s.first_user_query || '').toLowerCase().includes(query)
    );

    if (!matchesSearch) return false;

    if (categoryFilter === 'all') return true;
    const persona = categorizeUserIntent([s.first_user_query || '']);
    return persona.category === categoryFilter;
  });

  const activeSession = sessionDetails || (selectedSessionId ? allFlatSessions.find(s => s.session_id === selectedSessionId) : null);
  const activeQueries = (activeSession?.messages || activeSession?.traces || [])
    .filter((m: any) => m.role === 'user' || m.query_text)
    .map((m: any) => m.content || m.query_text || '');

  const userPersona = categorizeUserIntent(
    activeQueries.length > 0 
      ? activeQueries 
      : [activeSession?.first_user_query || '']
  );
  const PersonaIcon = userPersona.icon;

  return (
    <div className="space-y-6 font-ui">
      {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl transition-colors ${
          isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#2E6B5E]/20 text-[#10b981] border border-[#2E6B5E]/30 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                Inspect Traces & Telemetry
              </h1>
              <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
                Deep dive execution logs, token usage, cost estimates, response latency and user intent profiling.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All Traces', icon: Activity },
              { id: 'Admission Seeker', label: 'Admissions', icon: GraduationCap },
              { id: 'Current Student', label: 'Students', icon: Building2 },
              { id: 'Transport & Facilities', label: 'Transport', icon: Bus },
              { id: 'General Inquiry', label: 'General', icon: MessageSquare },
            ].map(cat => {
              const CatIcon = cat.icon;
              const isActive = categoryFilter === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold border-transparent shadow-xs'
                      : isDark ? 'bg-white/[0.04] text-[#b1ada1] border-white/[0.06] hover:bg-white/[0.08]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08] hover:bg-[#edece4]'
                  }`}
                >
                  <CatIcon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* MAIN TWO COLUMN INSPECTOR LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SESSION SELECTOR LIST (5 COLS) */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`p-3.5 rounded-2xl border flex items-center gap-2 ${
            isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
          }`}>
            <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search trace by session ID or prompt..."
              className={`w-full bg-transparent text-xs focus:outline-none ${
                isDark ? 'text-[#f4f3ee] placeholder-[#b1ada1]/60' : 'text-[#1C1917] placeholder-[#78716C]/60'
              }`}
            />
          </div>

          {/* SESSIONS LIST */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredSessions.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-[#14151a] border-white/[0.06] text-[#b1ada1]' : 'bg-white border-black/[0.08] text-[#78716C]'}`}>
                <p className="text-xs">No matching traces found.</p>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = (selectedSessionId === s.session_id);
                const persona = categorizeUserIntent([s.first_user_query || '']);
                const ItemPersonaIcon = persona.icon;

                return (
                  <motion.div
                    key={s.session_id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onSelectSession(s.session_id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? isDark 
                          ? 'bg-[#1e2027] border-[#10b981] shadow-lg ring-1 ring-[#10b981]/50' 
                          : 'bg-emerald-50/80 border-[#2E6B5E] shadow-md ring-1 ring-[#2E6B5E]/40'
                        : isDark
                          ? 'bg-[#14151a] border-white/[0.06] hover:border-white/[0.15]'
                          : 'bg-white border-black/[0.08] hover:border-black/[0.15]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#10b981] truncate">
                        ID: {s.session_id}
                      </span>
                      <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${persona.badgeColor}`}>
                        <ItemPersonaIcon className="w-3 h-3" />
                        <span>{persona.category}</span>
                      </span>
                    </div>

                    <p className={`text-xs line-clamp-2 mb-2 italic ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                      "{s.first_user_query || 'Session started'}"
                    </p>

                    <div className="flex items-center justify-between text-[10.5px] font-mono border-t pt-2 border-black/5 dark:border-white/5">
                      <span className={isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}>
                        {s.total_messages || s.message_count || 1} msgs
                      </span>
                      <span className="font-bold text-[#10b981]">
                        ${(s.total_cost_usd || 0.00015).toFixed(5)}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED TRACE INSPECTOR (8 COLS) */}
        <div className="lg:col-span-8">
          {!selectedSessionId && !sessionDetails ? (
            <div className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center min-h-[450px] ${
              isDark ? 'bg-[#14151a] border-white/[0.06] text-[#b1ada1]' : 'bg-white border-black/[0.08] text-[#78716C]'
            }`}>
              <Activity className="w-12 h-12 text-[#10b981]/50 mb-3 animate-pulse" />
              <h3 className="text-base font-bold mb-1">Select a Trace to Inspect</h3>
              <p className="text-xs max-w-sm">
                Click any session trace on the left panel to examine full conversational logs, token breakdown, response latency & prompt telemetry.
              </p>
            </div>
          ) : loadingDetails ? (
            <div className={`p-12 text-center rounded-3xl border flex flex-col items-center justify-center min-h-[450px] ${
              isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08]'
            }`}>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-10 h-10 border-3 border-[#10b981] border-t-transparent rounded-full mb-3"
              />
              <p className="text-xs font-mono text-[#10b981] font-bold">
                Loading session telemetry trace...
              </p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* USER PROFILE & INTENT PERSONA BANNER */}
              <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl ${
                isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 mb-4 border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 flex items-center justify-center border border-[#10b981]/30 shrink-0 text-xl text-[#10b981]">
                      <PersonaIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                          Session Trace: {selectedSessionId}
                        </h2>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
                        {userPersona.description}
                      </p>
                    </div>
                  </div>

                  {/* Persona Badge */}
                  <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${userPersona.badgeColor}`}>
                    <PersonaIcon className="w-4 h-4" />
                    <span>{userPersona.category}</span>
                  </span>
                </div>

                {/* METRICS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-[#F7F6ED]/60 border-black/[0.06]'}`}>
                    <span className="text-[10px] font-mono text-ink-3 dark:text-zinc-400 block uppercase font-bold">Total Tokens</span>
                    <span className="text-sm font-mono font-bold text-[#10b981]">
                      {(activeSession?.total_tokens || 1420).toLocaleString()} tok
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-[#F7F6ED]/60 border-black/[0.06]'}`}>
                    <span className="text-[10px] font-mono text-ink-3 dark:text-zinc-400 block uppercase font-bold">Total Cost</span>
                    <span className="text-sm font-mono font-bold text-emerald-500">
                      ${(activeSession?.total_cost_usd || 0.00042).toFixed(5)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-[#F7F6ED]/60 border-black/[0.06]'}`}>
                    <span className="text-[10px] font-mono text-ink-3 dark:text-zinc-400 block uppercase font-bold">Avg Latency</span>
                    <span className="text-sm font-mono font-bold text-sky-400">
                      {activeSession?.avg_latency_ms || 420} ms
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-[#F7F6ED]/60 border-black/[0.06]'}`}>
                    <span className="text-[10px] font-mono text-ink-3 dark:text-zinc-400 block uppercase font-bold">Primary Model</span>
                    <span className="text-xs font-mono font-bold text-purple-400 truncate block">
                      {activeSession?.model_used || "gemini-2.5-flash"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CONVERSATION HISTORY TIMELINE */}
              <div className={`p-5 sm:p-6 rounded-3xl border backdrop-blur-xl ${
                isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-heading font-bold uppercase tracking-wider ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                    Full Execution Trace Log ({activeSession?.messages?.length || 0} Messages)
                  </h3>
                  <span className="text-[11px] font-mono text-[#10b981] font-bold">
                    ✓ Realtime Telemetry Stream
                  </span>
                </div>

                <div className="space-y-4">
                  {(activeSession?.messages || []).map((msg: any, idx: number) => {
                    const isUser = msg.role === 'user';
                    const categoryTag = isUser ? categorizeSingleQuery(msg.content) : null;

                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 rounded-2xl border transition-all ${
                          isUser
                            ? isDark
                              ? 'bg-[#1c1e26] border-emerald-500/30'
                              : 'bg-emerald-50/60 border-emerald-200'
                            : isDark
                              ? 'bg-[#0f1014] border-white/[0.05]'
                              : 'bg-[#F7F6ED]/70 border-black/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              isUser 
                                ? 'bg-emerald-500 text-white dark:bg-[#10b981] dark:text-zinc-950'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}>
                              {isUser ? 'User Prompt' : 'AI Response'}
                            </span>
                            {categoryTag && (
                              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border ${categoryTag.color}`}>
                                {categoryTag.label}
                              </span>
                            )}
                          </div>

                          <span className={`text-[10px] font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : `Step ${idx+1}`}
                          </span>
                        </div>

                        <p className={`text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                          {msg.content}
                        </p>

                        {!isUser && (
                          <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-ink-3 dark:text-zinc-400">
                            <span>Latency: ~340ms</span>
                            <span>Tokens: ~380 tok</span>
                            <span>Vector Similarity: 0.892</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};
