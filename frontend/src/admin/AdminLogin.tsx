import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Invalid credentials");
      }

      const data = await response.json();
      localStorage.setItem("adminToken", data.token);
      document.cookie = `admin_token=${data.token}; path=/; max-age=86400; SameSite=Lax;`;
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6ED] dark:bg-[#0b0c0e] transition-colors duration-300 font-ui relative overflow-hidden">
      
      {/* Premium ambient blur background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#2E6B5E]/15 dark:bg-[#10b981]/15 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#D0E7E1]/30 dark:bg-[#2E6B5E]/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-[120px] animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative w-full max-w-md p-8 sm:p-10 space-y-8 bg-white/90 dark:bg-[#14151a]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.06] z-10 mx-4">
        
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#E1EED7] dark:bg-[#2E6B5E]/30 border border-[#2E6B5E]/30 dark:border-emerald-500/40 flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-[#2E6B5E] dark:text-[#34d399]" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-ink dark:text-[#f4f3ee]">Admin Portal</h2>
          <p className="mt-2 text-xs sm:text-sm text-ink-2 dark:text-[#b1ada1]">
            Sign in to access MSAJCEA Telemetry & Operations
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-4 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-ink-3 dark:text-zinc-500" />
              </div>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-line dark:border-white/[0.08] rounded-2xl bg-surface/80 dark:bg-zinc-900/80 text-ink dark:text-[#f4f3ee] placeholder-ink-3 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#2E6B5E] dark:focus:ring-emerald-500 transition-all text-sm"
                placeholder="Admin ID"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-ink-3 dark:text-zinc-500" />
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-3.5 border border-line dark:border-white/[0.08] rounded-2xl bg-surface/80 dark:bg-zinc-900/80 text-ink dark:text-[#f4f3ee] placeholder-ink-3 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#2E6B5E] dark:focus:ring-emerald-500 transition-all text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl text-sm font-bold text-white dark:text-zinc-950 bg-[#2E6B5E] dark:bg-emerald-500 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E6B5E] transition-all disabled:opacity-50 shadow-lg cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In"}
            {!loading && (
              <span className="absolute right-6 inset-y-0 flex items-center">
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
