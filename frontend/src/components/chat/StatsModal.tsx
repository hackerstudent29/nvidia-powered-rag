import { SystemStats } from "../../types/chat";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SystemStats | null;
  loading: boolean;
}

export default function StatsModal({ isOpen, onClose, stats, loading }: StatsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl border border-line">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-3 hover:text-ink transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="size-2.5 rounded-full bg-green animate-pulse" />
          <h3 className="text-base font-semibold text-ink">
            Lorin AI Production Architecture Telemetry
          </h3>
        </div>

        {loading || !stats ? (
          <div className="py-12 text-center text-xs text-ink-2">Fetching live telemetry from Neon DB & Qdrant Cloud...</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-inset p-3 border border-line">
                <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">Qdrant Cloud Vectors</div>
                <div className="text-xl font-bold text-ink mt-1">{stats.vector_count}</div>
                <div className="text-[10px] text-ink-2 mt-0.5">2048-dim NVIDIA NeMo Embeddings</div>
              </div>

              <div className="rounded-xl bg-inset p-3 border border-line">
                <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">BM25 Sparse Chunks</div>
                <div className="text-xl font-bold text-ink mt-1">{stats.bm25_chunks}</div>
                <div className="text-[10px] text-ink-2 mt-0.5">Lexical Inverted Index (RRF k=60)</div>
              </div>

              <div className="rounded-xl bg-inset p-3 border border-line">
                <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">Total Chat Sessions</div>
                <div className="text-xl font-bold text-ink mt-1">{stats.total_sessions}</div>
                <div className="text-[10px] text-ink-2 mt-0.5">Neon Serverless PostgreSQL</div>
              </div>

              <div className="rounded-xl bg-inset p-3 border border-line">
                <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">Instant Cached Queries</div>
                <div className="text-xl font-bold text-ink mt-1">{stats.cached_queries}</div>
                <div className="text-[10px] text-ink-2 mt-0.5">Zero-token ~10ms synthesis cache</div>
              </div>
            </div>

            <div className="rounded-xl bg-inset p-3 border border-line">
              <div className="text-[11px] font-medium text-ink-3 uppercase tracking-wider mb-2">Available Models</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.models_available.map((m) => (
                  <span key={m} className="rounded-md bg-surface px-2.5 py-1 text-[11px] font-medium text-ink shadow-hairline">
                    ⚡ {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line text-[11px] text-ink-3">
              <span>Avg RAG Latency: {stats.average_latency_ms} ms</span>
              <span>RLHF Feedbacks: {stats.feedback_logged}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
