import React, { useState } from 'react';
import { Search, ChevronRight, ChevronDown, ChevronUp, User, MessageSquare, Zap, DollarSign } from 'lucide-react';

interface ConversationsTabProps {
  sessions: any[];
  onSelectSession: (sessionId: string) => void;
  isDark?: boolean;
}

export const ConversationsTab: React.FC<ConversationsTabProps> = ({
  sessions,
  onSelectSession,
  isDark = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filteredUsers = safeSessions.filter(item => {
    const query = searchTerm.toLowerCase();
    if (item.sessions) {
      // User group object
      return (
        (item.user_id || '').toLowerCase().includes(query) ||
        (item.user_ip || '').toLowerCase().includes(query) ||
        item.sessions.some((s: any) => 
          (s.session_id || '').toLowerCase().includes(query) ||
          (s.first_user_query || '').toLowerCase().includes(query)
        )
      );
    }
    // Flat session object
    return (
      (item.session_id || '').toLowerCase().includes(query) ||
      (item.first_user_query || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in font-ui">
      <div className={`border rounded-3xl overflow-hidden flex flex-col backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#14151a] border-white/[0.06]' : 'bg-white border-black/[0.08] shadow-sm'
      }`}>
        {/* Table Header */}
        <div className={`p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isDark ? 'border-white/[0.06]' : 'border-black/[0.08]'
        }`}>
          <div>
            <h2 className={`text-xl font-heading font-bold tracking-tight ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
              Real Users & Sessions ({sessions.length} Unique Users)
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'}`}>
              Multi-session user tracking grouped by User ID and IP. Total tokens and cost include all sessions created by each user.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search User ID, IP, session ID or prompt..." 
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs focus:outline-none transition-all ${
                isDark 
                  ? 'bg-[#0b0c0e] border-white/[0.08] text-[#f4f3ee] placeholder-[#b1ada1]/60 focus:border-[#2E6B5E]' 
                  : 'bg-[#F7F6ED] border-black/[0.08] text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#2E6B5E]'
              }`}
            />
          </div>
        </div>
        
        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`font-mono uppercase tracking-wider border-b ${
              isDark ? 'bg-[#0b0c0e]/80 text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.08]'
            }`}>
              <tr>
                <th className="px-6 py-4 font-semibold">User & Device Info</th>
                <th className="px-6 py-4 font-semibold text-center">Sessions</th>
                <th className="px-6 py-4 font-semibold text-center">Total Messages</th>
                <th className="px-6 py-4 font-semibold text-right">Full User Tokens</th>
                <th className="px-6 py-4 font-semibold text-right">Full User Cost</th>
                <th className="px-6 py-4 font-semibold">Last Active</th>
                <th className="px-6 py-4 text-right">Sessions & Traces</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-black/[0.04]'}`}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-6 py-12 text-center ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                    No users logged in database yet. Start a chat on the main app to log live telemetry.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item, uIdx) => {
                  const isUserGroup = Array.isArray(item.sessions);
                  const userId = item.user_id || item.session_id || `user_${uIdx}`;
                  const isExpanded = expandedUsers[userId] ?? true; // Default expand to show sessions
                  const userSessions = isUserGroup ? item.sessions : [item];

                  const totalSessions = isUserGroup ? item.total_sessions : 1;
                  const totalMsgs = isUserGroup ? item.total_messages : (item.total_messages || item.message_count || 0);
                  const totalTokens = isUserGroup ? item.total_tokens : (item.total_tokens || 0);
                  const totalCostUsd = isUserGroup ? item.total_cost_usd : (item.total_cost_usd || 0.0);
                  const totalCostInr = isUserGroup ? item.total_cost_inr : (item.total_cost_inr || (totalCostUsd * 86.5));
                  const lastActive = item.last_active_at ? new Date(item.last_active_at).toLocaleString() : 'Just now';

                  return (
                    <React.Fragment key={userId}>
                      {/* USER MASTER ROW */}
                      <tr 
                        className={`transition-colors cursor-pointer font-sans ${
                          isDark ? 'bg-[#14151a] hover:bg-white/[0.03]' : 'bg-white hover:bg-[#F7F6ED]/60'
                        }`}
                        onClick={() => toggleUser(userId)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#2E6B5E]/20 text-[#10b981]">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className={`font-mono text-xs font-bold ${
                                isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'
                              }`}>
                                ID: {userId}
                              </span>
                              <span className={`text-[11px] font-mono ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                                IP: {item.user_ip || '127.0.0.1'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#2E6B5E]/20 text-[#10b981] border border-[#2E6B5E]/30">
                            {totalSessions} Session{totalSessions > 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap font-mono font-semibold">
                          <span className={isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}>
                            {totalMsgs} msgs
                          </span>
                        </td>

                        <td className={`px-6 py-4 text-right font-mono font-bold text-xs ${
                          isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'
                        }`}>
                          {totalTokens.toLocaleString()} tok
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-bold whitespace-nowrap">
                          <div className="text-[#10b981] text-xs">${totalCostUsd.toFixed(5)}</div>
                          <div className={`text-[10px] font-normal ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>≈ ₹{totalCostInr.toFixed(3)}</div>
                        </td>

                        <td className={`px-6 py-4 whitespace-nowrap text-xs ${isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'}`}>
                          {lastActive}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            isDark 
                              ? 'bg-white/[0.05] text-[#f4f3ee] border-white/[0.08] hover:bg-[#2E6B5E] hover:text-white' 
                              : 'bg-white text-[#1C1917] border-black/[0.08] hover:bg-[#2E6B5E] hover:text-white shadow-sm'
                          }`}>
                            <span>{isExpanded ? 'Collapse Sessions' : 'View Sessions'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDABLE SUB-SESSIONS FOR THIS USER */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={`p-0 ${isDark ? 'bg-[#0b0c0e]/60' : 'bg-[#F7F6ED]/70'}`}>
                            <div className="p-4 sm:p-5 space-y-2.5">
                              <div className={`text-[10.5px] font-mono uppercase tracking-wider font-bold px-1 flex items-center gap-1.5 ${
                                isDark ? 'text-[#b1ada1]' : 'text-[#78716C]'
                              }`}>
                                <MessageSquare className="w-3.5 h-3.5 text-[#10b981]" />
                                <span>Active User Sessions ({userSessions.length}):</span>
                              </div>

                              <div className="space-y-2">
                                {userSessions.map((s: any) => (
                                  <div 
                                    key={s.session_id} 
                                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                                      isDark 
                                        ? 'bg-[#14151a] border-white/[0.06] hover:border-[#10b981]/50 shadow-xs' 
                                        : 'bg-white border-black/[0.08] hover:border-[#2E6B5E]/50 shadow-xs'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-[#10b981]">
                                          ID: {s.session_id}
                                        </span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                          isDark ? 'bg-white/[0.06] text-[#b1ada1] border-white/[0.06]' : 'bg-[#F7F6ED] text-[#57534E] border-black/[0.06]'
                                        }`}>
                                          {s.total_messages || 0} msgs
                                        </span>
                                      </div>
                                      <p className={`text-xs line-clamp-1 italic ${isDark ? 'text-[#f4f3ee]' : 'text-[#57534E]'}`}>
                                        "{s.first_user_query || 'No prompt recorded'}"
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                                      <div className="text-right">
                                        <div className={`font-bold ${isDark ? 'text-[#f4f3ee]' : 'text-[#1C1917]'}`}>
                                          {(s.total_tokens || 0).toLocaleString()} tok
                                        </div>
                                        <div className="text-[#10b981] font-bold text-[11px]">
                                          ${(s.total_cost_usd || 0).toFixed(5)}
                                        </div>
                                      </div>

                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectSession(s.session_id);
                                        }}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
                                      >
                                        <span>Inspect Trace</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
