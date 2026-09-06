import { useState } from "react";
import { ReasoningStep } from "../../types/chat";

interface ThinkingStateProps {
  variant?: string;
  isLiveStreaming?: boolean;
  liveSteps?: (string | ReasoningStep)[];
  durationSeconds?: number;
}

export default function ThinkingState({
  isLiveStreaming = false,
  liveSteps = [],
  durationSeconds = 2,
}: ThinkingStateProps) {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);

  // Normalize steps to strings and filter empty steps
  let steps: string[] = liveSteps
    ? liveSteps
        .map((s) => (typeof s === "string" ? s : s?.primary || ""))
        .filter((s) => s && s.trim().length > 0)
    : [];

  // If no steps received yet and not streaming, hide thinking block
  if (steps.length === 0 && !isLiveStreaming) {
    return null;
  }

  // Steps are open by default during live streaming, but automatically collapse when streaming finishes unless user explicitly toggles it
  const isOpen = userToggled !== null ? userToggled : isLiveStreaming;

  const label = isLiveStreaming
    ? "Thinking..."
    : `Thought for ${Math.max(1, durationSeconds)}s`;

  return (
    <div className="w-full max-w-xl my-1.5 font-sans">
      <button
        type="button"
        onClick={() => setUserToggled((prev) => (prev === null ? false : !prev))}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-ink-3 hover:text-ink hover:bg-hover transition-colors text-[12px] font-medium"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isLiveStreaming ? "text-accent animate-spin duration-700" : "text-ink-3"}
        >
          <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
        </svg>

        <span className={isLiveStreaming ? "text-accent font-semibold" : "text-ink-2"}>
          {label}
        </span>

        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-ink-3 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Real-time reasoning steps - Open by default during streaming */}
      {isOpen && steps.length > 0 && (
        <div className="mt-1.5 ml-2 pl-3 border-l-2 border-accent/40 dark:border-accent/60 space-y-1.5 py-0.5 animate-in fade-in duration-200">
          {steps.map((stepText, idx) => {
            const isLast = idx === steps.length - 1;
            const isActive = isLiveStreaming && isLast;

            return (
              <div
                key={stepText + idx}
                className="flex items-center gap-2 text-[12px] text-ink-2 animate-in fade-in slide-in-from-left-2 duration-200"
              >
                {isActive ? (
                  <div className="size-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                ) : (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span className={`truncate ${isActive ? "text-accent font-medium" : "text-ink-2"}`}>
                  {stepText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
