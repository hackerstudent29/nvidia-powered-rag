import { useState } from "react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  rating: number; // 1 or -1
  sessionId: string;
  messageId: string;
  queryText: string;
  responseText: string;
  onSubmit: (data: {
    message_id: string;
    session_id: string;
    query_text: string;
    response_text: string;
    rating: number;
    category: string;
    user_comment: string;
  }) => Promise<void>;
  onRegenerateWithNeMo?: () => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  rating,
  sessionId,
  messageId,
  queryText,
  responseText,
  onSubmit,
  onRegenerateWithNeMo,
}: FeedbackModalProps) {
  const [category, setCategory] = useState(rating > 0 ? "accurate" : "incomplete");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        message_id: messageId,
        session_id: sessionId,
        query_text: queryText,
        response_text: responseText,
        rating,
        category,
        user_comment: comment,
      });
      setSubmitted(true);
      if (rating < 0 && onRegenerateWithNeMo) {
        onRegenerateWithNeMo();
      }
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-line">
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

        <h3 className="text-base font-semibold text-ink flex items-center gap-2">
          {rating > 0 ? (
            <span className="text-green flex items-center gap-1">👍 Positive Feedback</span>
          ) : (
            <span className="text-red flex items-center gap-1">👎 Help Us Improve</span>
          )}
        </h3>

        <p className="text-xs text-ink-2 mt-1">
          Your feedback directly trains the precision retrieval layer in Neon PostgreSQL.
        </p>

        {submitted ? (
          <div className="py-6 text-center text-sm font-medium text-green">
            ✓ Thank you! Feedback recorded into Neon DB.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Feedback Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(rating > 0
                  ? [
                      { id: "accurate", label: "Very Accurate" },
                      { id: "fast", label: "Fast & Helpful" },
                      { id: "clear", label: "Clear Formatting" },
                      { id: "cited", label: "Great Citations" },
                    ]
                  : [
                      { id: "incomplete", label: "Incomplete Details" },
                      { id: "hallucination", label: "Factually Inaccurate" },
                      { id: "wrong_link", label: "Irrelevant Source Link" },
                      { id: "outdated", label: "Outdated Data" },
                    ]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium border text-left transition-all ${
                      category === opt.id
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-line bg-inset hover:bg-hover text-ink-2"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1.5">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What was good or what should be corrected?"
                rows={3}
                className="w-full rounded-lg border border-line bg-inset p-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
              />
            </div>

            {rating < 0 && onRegenerateWithNeMo && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onRegenerateWithNeMo();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 transition-all cursor-pointer"
                >
                  <span>⚡ Re-evaluate with NVIDIA Nemotron Neural Re-ranker</span>
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-ink-2 hover:bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
