import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, MessageSquare, BookOpen, BarChart2, ShieldCheck, Cpu, 
  Search, Bell, LogOut, LayoutDashboard, RefreshCw, Zap, Sun, Moon
} from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { ConversationsTab } from './ConversationsTab';
import { KnowledgeTab } from './KnowledgeTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SafetyTab } from './SafetyTab';
import { SystemTab } from './SystemTab';
import { TraceDrawer } from './TraceDrawer';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'knowledge' | 'analytics' | 'safety' | 'system'>('overview');
  const [period, setPeriod] = useState<string>('24h');
  
  // Theme state (Dark vs Light mode toggle)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? false : true;
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Real Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<any[]>([]);
  const [cacheEntries, setCacheEntries] = useState<any[]>([]);
  const [dislikes, setDislikes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Slide-out panel state for Trace Inspector
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getAuthHeaders();

      const [metricsRes, sessionsRes, gapsRes, cacheRes, dislikesRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers, credentials: 'include' }),
        fetch('/api/admin/sessions', { headers, credentials: 'include' }),
        fetch('/api/admin/knowledge-gaps', { headers, credentials: 'include' }),
        fetch('/api/admin/cache', { headers, credentials: 'include' }),
        fetch('/api/admin/dislikes', { headers, credentials: 'include' })
      ]);

      if (metricsRes.status === 401 || sessionsRes.status === 401) {
        navigate('/admin/login');
        return;
      }

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (gapsRes.ok) {
        const data = await gapsRes.json();
        setKnowledgeGaps(data.gaps || []);
      }
      if (cacheRes.ok) {
        const data = await cacheRes.json();
        setCacheEntries(data.cache || []);
      }
      if (dislikesRes.ok) {
        const data = await dislikesRes.json();
        setDislikes(data.dislikes || []);
      }
    } catch (err: any) {
      console.error("API error", err);
      setError("Failed to fetch real telemetry data from server");
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.status === 401) {
        navigate('/admin/login');
        return;
      }
      if (res.ok) {
        setSessionDetails(await res.json());
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const purgeCache = async () => {
    if (!window.confirm("Are you sure you want to purge the real database semantic cache?")) return;
    try {
      const res = await fetch('/api/admin/cache', { 
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.ok) {
        alert("Semantic cache purged from database.");
        fetchData();
      }
    } catch (e) {
      alert("Failed to purge cache.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
    { id: 'system', label: 'System', icon: Cpu },
  ];

  return (
    <div className={`min-h-screen font-ui relative pb-16 transition-colors duration-300 ${
      isDark ? 'bg-[#0b0c0e] text-[#f4f3ee]' : 'bg-[#F7F6ED] text-[#1C1917]'
    }`}>
      
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute -top-[30%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] blur-3xl opacity-60 rounded-full ${
          isDark ? 'bg-gradient-to-b from-[#2E6B5E]/20 via-[#10b981]/5 to-transparent' : 'bg-gradient-to-b from-[#2E6B5E]/15 via-[#D0E7E1]/20 to-transparent'
        }`} />
      </div>

      {/* FLOATING TOP NAVBAR */}
      <div className="fixed top-4 left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none">
        <header className={`pointer-events-auto max-w-7xl mx-auto h-16 backdrop-blur-2xl border rounded-2xl shadow-xl flex items-center justify-between px-4 sm:px-6 transition-all ${
          isDark ? 'bg-[#14151a]/90 border-white/[0.06]' : 'bg-white/90 border-black/[0.08]'
        }`}>
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2E6B5E]/20 dark:bg-emerald-500/20 flex items-center justify-center border border-[#2E6B5E]/40 dark:border-emerald-500/40">
              <Activity className="w-5 h-5 text-[#2E6B5E] dark:text-[#34d399]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-base tracking-tight text-ink dark:text-[#f4f3ee]">Lorin AI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#E1EED7] dark:bg-[#2E6B5E]/30 text-[#2E6B5E] dark:text-[#34d399] border border-[#2E6B5E]/30 dark:border-emerald-500/30">
                MSAJCEA Ops
              </span>
            </div>
          </div>

          {/* Floating Pill Nav Items */}
          <nav className={`hidden md:flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-[#1c1d24]/80 border-white/[0.06]' : 'bg-[#ECEAE0]/80 border-black/[0.06]'
          }`}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`px-4 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#2E6B5E] dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold shadow-md' 
                      : isDark ? 'text-[#b1ada1] hover:text-[#f4f3ee] hover:bg-white/[0.04]' : 'text-[#57534E] hover:text-[#1C1917] hover:bg-black/[0.04]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Controls, Theme Toggle & Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border ${
              isDark ? 'bg-[#1c1d24] border-white/[0.06] text-[#b1ada1]' : 'bg-[#ECEAE0] border-black/[0.06] text-[#57534E]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="text-[11px] font-mono font-medium">Live 99.98%</span>
            </div>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isDark 
                  ? 'bg-[#1c1d24] hover:bg-zinc-800 text-amber-300 border-white/[0.06]' 
                  : 'bg-white hover:bg-[#ECEAE0] text-indigo-600 border-black/[0.08]'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
              <span className="hidden sm:inline text-[11px]">{isDark ? "Light" : "Dark"}</span>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("adminToken");
                document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                navigate('/admin/login');
              }}
              title="Sign Out"
              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                isDark ? 'bg-[#1c1d24] hover:bg-rose-500/20 hover:text-rose-300 text-[#b1ada1] border-white/[0.06]' : 'bg-white hover:bg-rose-50 hover:text-rose-600 text-[#57534E] border-black/[0.08]'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
      </div>

      {/* Mobile Tab Bar (sticky bottom for mobile) */}
      <div className={`md:hidden fixed bottom-4 left-4 right-4 z-50 backdrop-blur-2xl border rounded-2xl p-1.5 flex justify-around shadow-2xl ${
        isDark ? 'bg-[#14151a]/95 border-white/[0.06]' : 'bg-white/95 border-black/[0.08]'
      }`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`p-2 rounded-xl flex flex-col items-center text-[10px] transition-all cursor-pointer ${
                isActive ? 'bg-[#2E6B5E] dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold' : isDark ? 'text-[#b1ada1]' : 'text-[#57534E]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-4 pt-24 pb-12 relative z-10 space-y-6">
        
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-mono flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={fetchData} className="underline text-xs">Retry API Fetch</button>
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewTab 
            metrics={metrics} 
            period={period} 
            setPeriod={setPeriod} 
            onRefresh={fetchData} 
            isDark={isDark}
          />
        )}

        {activeTab === 'conversations' && (
          <ConversationsTab 
            sessions={sessions} 
            onSelectSession={fetchSessionDetails} 
            isDark={isDark}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeTab 
            knowledgeGaps={knowledgeGaps}
            dislikes={dislikes}
            metrics={metrics}
            isDark={isDark}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab 
            cacheEntries={cacheEntries} 
            onPurgeCache={purgeCache} 
            isDark={isDark}
          />
        )}

        {activeTab === 'safety' && (
          <SafetyTab metrics={metrics} isDark={isDark} />
        )}

        {activeTab === 'system' && (
          <SystemTab metrics={metrics} isDark={isDark} />
        )}
      </main>

      {/* Slide-out Deep RAG Trace Drawer */}
      <TraceDrawer 
        sessionId={selectedSessionId}
        sessionDetails={sessionDetails}
        loading={loadingDetails}
        onClose={() => setSelectedSessionId(null)}
        isDark={isDark}
      />
    </div>
  );
};
