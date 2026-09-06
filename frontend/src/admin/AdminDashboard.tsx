import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, MessageSquare, BookOpen, BarChart2, ShieldCheck, Cpu, 
  LogOut, LayoutDashboard, RefreshCw, Zap, Sun, Moon, ArrowLeft,
  Lock, AlertTriangle
} from 'lucide-react';
import { Tooltip } from '../components/Tooltip';
import { OverviewTab } from './OverviewTab';
import { ConversationsTab } from './ConversationsTab';
import { TracesTab } from './TracesTab';
import { KnowledgeTab } from './KnowledgeTab';
import { AnalyticsTab } from './AnalyticsTab';
import { SafetyTab } from './SafetyTab';
import { SystemTab } from './SystemTab';
import { TraceDrawer } from './TraceDrawer';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'traces' | 'knowledge' | 'analytics' | 'safety' | 'system'>('overview');
  const [period, setPeriod] = useState<string>('24h');
  
  // Theme state (Dark vs Light mode toggle, defaults to Light theme for Admin)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" ? true : false;
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [dislikes, setDislikes] = useState<any[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [mRes, sRes, dRes, kRes] = await Promise.all([
        fetch("/api/admin/metrics", { headers }),
        fetch("/api/admin/sessions", { headers }),
        fetch("/api/admin/dislikes", { headers }),
        fetch("/api/admin/knowledge-gaps", { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (sRes.ok) {
        const sData = await sRes.json();
        setSessions(Array.isArray(sData) ? sData : []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDislikes(Array.isArray(dData) ? dData : []);
      }
      if (kRes.ok) {
        const kData = await kRes.json();
        setKnowledgeGaps(Array.isArray(kData) ? kData : []);
      }
    } catch (err) {
      console.error("Failed to fetch admin dashboard telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSessionTrace = async (sessId: string) => {
    setSelectedSessionId(sessId);
    setActiveTab('traces');
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/sessions/${sessId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSessionDetails(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch session trace:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const purgeCache = async () => {
    if (!window.confirm("Are you sure you want to purge the real database semantic cache?")) return;
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch('/api/admin/cache', { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Semantic cache purged from database.");
        fetchDashboardData();
      }
    } catch (e) {
      alert("Failed to purge cache.");
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'conversations', label: 'Chats', icon: MessageSquare },
    ...(selectedSessionId || activeTab === 'traces' ? [{ id: 'traces', label: 'Traces', icon: Activity }] : []),
    { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'safety', label: 'Safety', icon: ShieldCheck },
    { id: 'system', label: 'System', icon: Cpu },
  ];

  return (
    <div className={`min-h-screen font-ui relative pb-20 transition-colors duration-300 ${
      isDark ? 'bg-[#0b0c0e] text-[#f4f3ee]' : 'bg-[#F7F6ED] text-[#1C1917]'
    }`}>
      
      {/* FLOATING TOP EXPANDABLE PILL NAVBAR */}
      <div className="fixed top-2.5 sm:top-3 left-0 right-0 z-50 px-2 sm:px-4 pointer-events-none">
        <header className={`pointer-events-auto max-w-7xl mx-auto h-14 sm:h-16 backdrop-blur-2xl border rounded-full shadow-2xl flex items-center justify-between px-3 sm:px-6 transition-all ${
          isDark ? 'bg-[#14151a]/70 border-white/10 shadow-black/40' : 'bg-white/70 border-white/60 shadow-black/5'
        }`}>
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <Tooltip content="Return to Student AI Chat" position="bottom">
              <motion.div 
                whileHover={{ rotate: 15, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2E6B5E]/20 dark:bg-[#10b981]/20 flex items-center justify-center border border-[#2E6B5E]/40 dark:border-[#10b981]/40 cursor-pointer shrink-0"
              >
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-[#2E6B5E] dark:text-[#10b981]" />
              </motion.div>
            </Tooltip>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-bold text-xs sm:text-base tracking-tight text-[#1C1917] dark:text-[#f4f3ee]">
                Lorin AI
              </span>
              <span className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[9px] sm:text-[9.5px] uppercase font-bold tracking-wider bg-[#E1EED7] dark:bg-[#2E6B5E]/30 text-[#2E6B5E] dark:text-[#10b981] border border-[#2E6B5E]/30 dark:border-[#10b981]/30">
                Ops Center
              </span>
            </div>
          </div>

          {/* ── EXPANDABLE PILL TAB NAVIGATION (DESKTOP) ── */}
          <motion.nav
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="hidden md:flex items-center p-1 rounded-full border border-black/[0.08] dark:border-white/[0.09] bg-[#E8E5DA]/80 dark:bg-[#07080a]/90 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Tooltip key={item.id} content={item.label} position="bottom">
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setActiveTab(item.id as any)}
                    type="button"
                    className={`flex items-center gap-0 px-3 py-1.5 rounded-full transition-all duration-200 relative h-9 min-w-[38px] cursor-pointer overflow-hidden ${
                      isActive
                        ? 'bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md'
                        : 'bg-transparent text-[#57534E] dark:text-[#b1ada1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1C1917] dark:hover:text-[#f4f3ee]'
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.3 : 1.8}
                      className="shrink-0 transition-transform duration-200"
                    />

                    <motion.div
                      initial={false}
                      animate={{
                        width: isActive ? "84px" : "0px",
                        opacity: isActive ? 1 : 0,
                        marginLeft: isActive ? "6px" : "0px",
                      }}
                      transition={{
                        width: { type: "spring", stiffness: 350, damping: 30 },
                        opacity: { duration: 0.18 },
                        marginLeft: { duration: 0.18 },
                      }}
                      className="overflow-hidden flex items-center whitespace-nowrap"
                    >
                      <span
                        className={`font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 truncate ${
                          isActive ? "text-white dark:text-zinc-950 font-bold" : "opacity-0"
                        }`}
                      >
                        {item.label}
                      </span>
                    </motion.div>
                  </motion.button>
                </Tooltip>
              );
            })}
          </motion.nav>

          {/* Controls, Theme Toggle & Back to App */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Tooltip content={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"} position="bottom">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`p-1.5 sm:p-2 rounded-full transition-all border flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                  isDark 
                    ? 'bg-white/[0.06] hover:bg-white/[0.1] text-amber-300 border-white/[0.08]' 
                    : 'bg-[#F7F6ED] hover:bg-[#edece4] text-indigo-600 border-black/[0.08]'
                }`}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />}
              </motion.button>
            </Tooltip>

            <Tooltip content="Return to Student AI Chat" position="bottom">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-white/[0.06] hover:bg-white/[0.1] text-[#f4f3ee] border-white/[0.08]' 
                    : 'bg-[#F7F6ED] hover:bg-[#edece4] text-[#1C1917] border-black/[0.08]'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit to Chat</span>
              </motion.button>
            </Tooltip>

            <Tooltip content="Sign Out of Admin Portal" position="bottom">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  localStorage.removeItem("adminToken");
                  document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                  navigate('/admin/login');
                }}
                className={`p-1.5 sm:p-2 rounded-full transition-all border cursor-pointer ${
                  isDark 
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </motion.button>
            </Tooltip>
          </div>
        </header>
      </div>

      {/* DASHBOARD CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-20 sm:pb-12 relative z-10">
        
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="px-3 py-1 rounded-xl bg-rose-500 text-white text-[11px] font-bold hover:bg-rose-600 transition-colors"
              >
                Retry Fetch
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Spinner */}
        {loading && !metrics ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-3 border-[#2E6B5E] dark:border-[#10b981] border-t-transparent rounded-full"
            />
            <p className="text-xs font-medium text-[#57534E] dark:text-[#b1ada1]">
              Fetching real telemetry from database...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {activeTab === 'overview' && (
                <OverviewTab 
                  metrics={metrics} 
                  period={period} 
                  setPeriod={setPeriod} 
                  onRefresh={fetchDashboardData}
                  isDark={isDark}
                />
              )}
              {activeTab === 'conversations' && (
                <ConversationsTab 
                  sessions={sessions} 
                  onSelectSession={handleSelectSessionTrace} 
                  isDark={isDark}
                />
              )}
              {activeTab === 'traces' && (
                <TracesTab
                  sessions={sessions}
                  selectedSessionId={selectedSessionId}
                  sessionDetails={sessionDetails}
                  loadingDetails={loadingDetails}
                  onSelectSession={handleSelectSessionTrace}
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
                  cacheEntries={metrics?.query_cache_entries || []} 
                  onPurgeCache={purgeCache}
                  isDark={isDark}
                />
              )}
              {activeTab === 'safety' && (
                <SafetyTab 
                  metrics={metrics}
                  isDark={isDark}
                />
              )}
              {activeTab === 'system' && (
                <SystemTab 
                  metrics={metrics}
                  isDark={isDark}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* MOBILE STICKY BOTTOM NAV BAR (TOUCH OPTIMIZED, SCROLLABLE IF NARROW) */}
      <div className="fixed inset-x-0 bottom-3 z-40 md:hidden flex justify-center px-2 pointer-events-none">
        <motion.nav
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="pointer-events-auto max-w-[calc(100vw-1rem)] rounded-full flex items-center p-1 border border-black/[0.08] dark:border-white/[0.09] bg-[#E8E5DA]/95 dark:bg-[#07080a]/95 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.08),0_10px_30px_rgba(0,0,0,0.25)] dark:shadow-[inset_0_2px_5px_rgba(0,0,0,0.7),0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-2xl overflow-x-auto scrollbar-none gap-0.5"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActiveTab(item.id as any)}
                type="button"
                className={`flex items-center gap-0 px-2.5 py-1.5 rounded-full transition-all duration-200 relative h-9 min-w-[38px] shrink-0 cursor-pointer overflow-hidden ${
                  isActive
                    ? 'bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold shadow-md'
                    : 'bg-transparent text-[#57534E] dark:text-[#b1ada1]'
                }`}
                aria-label={item.label}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.3 : 1.8}
                  className="shrink-0"
                />

                <motion.div
                  initial={false}
                  animate={{
                    width: isActive ? "68px" : "0px",
                    opacity: isActive ? 1 : 0,
                    marginLeft: isActive ? "5px" : "0px",
                  }}
                  transition={{
                    width: { type: "spring", stiffness: 350, damping: 30 },
                    opacity: { duration: 0.18 },
                    marginLeft: { duration: 0.18 },
                  }}
                  className="overflow-hidden flex items-center whitespace-nowrap"
                >
                  <span
                    className={`font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 truncate ${
                      isActive ? "text-white dark:text-zinc-950 font-bold" : "opacity-0"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </motion.button>
            );
          })}
        </motion.nav>
      </div>
    </div>
  );
};
