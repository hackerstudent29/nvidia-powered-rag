"use client";

import React, { useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
  isListening?: boolean;
  activeDuration?: number;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className,
  isListening: externalIsListening,
  activeDuration
}: AIVoiceInputProps) {
  const [internalSubmitted, setInternalSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  // Sync external listening state if provided
  const submitted = externalIsListening !== undefined ? externalIsListening : internalSubmitted;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (activeDuration !== undefined) {
      setTime(activeDuration);
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    if (submitted) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      if (time > 0) {
        onStop?.(time);
      }
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, activeDuration]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      setInternalSubmitted(true);
      onStart?.();
      timeoutId = setTimeout(() => {
        setInternalSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval, onStart]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setInternalSubmitted(false);
    } else {
      if (!submitted) {
        onStart?.();
        setInternalSubmitted(true);
      } else {
        onStop?.(time);
        setInternalSubmitted(false);
      }
    }
  };

  return (
    <div className={cn("w-full py-4 select-none", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-3">
        {/* Animated Outer Pulse Ring */}
        <div className="relative flex items-center justify-center">
          {submitted && (
            <span className="absolute size-20 rounded-2xl bg-emerald-500/20 dark:bg-[#10b981]/25 animate-ping pointer-events-none" />
          )}

          <button
            className={cn(
              "group relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer border",
              submitted
                ? "bg-emerald-600 dark:bg-[#10b981] text-white dark:text-zinc-950 border-emerald-400 dark:border-[#10b981] shadow-emerald-500/30 scale-105"
                : "bg-black/[0.04] dark:bg-white/[0.08] hover:bg-emerald-500/10 dark:hover:bg-[#10b981]/20 border-black/10 dark:border-white/10 hover:border-emerald-500/40 text-ink dark:text-[#f4f3ee]"
            )}
            type="button"
            onClick={handleClick}
            title={submitted ? "Stop Voice Input" : "Start Voice Input"}
          >
            {submitted ? (
              <Square className="w-6 h-6 fill-current animate-pulse cursor-pointer" />
            ) : (
              <Mic className="w-6 h-6 transition-transform group-hover:scale-110" />
            )}
          </button>
        </div>

        {/* Timer Display */}
        <span
          className={cn(
            "font-mono text-sm font-semibold tracking-wider transition-all duration-300",
            submitted
              ? "text-emerald-600 dark:text-[#10b981] scale-105"
              : "text-black/40 dark:text-white/40"
          )}
        >
          {formatTime(time)}
        </span>

        {/* Audio Visualizer Bars */}
        <div className="h-6 w-full max-w-xs flex items-center justify-center gap-0.5 px-2">
          {[...Array(visualizerBars)].map((_, i) => {
            // Pseudo-random bar height calculation for realistic audio wave feel
            const pseudoRand = Math.sin(i * 0.4 + time * 2) * 0.4 + 0.6;
            const barHeight = submitted && isClient ? Math.max(15, Math.floor(pseudoRand * 85)) : 10;

            return (
              <div
                key={i}
                className={cn(
                  "w-0.5 rounded-full transition-all duration-200",
                  submitted
                    ? "bg-emerald-500 dark:bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                    : "bg-black/15 dark:bg-white/15 h-1"
                )}
                style={{
                  height: `${barHeight}%`,
                  transitionDelay: `${(i % 10) * 0.02}s`
                }}
              />
            );
          })}
        </div>

        {/* Action Status Label */}
        <p className="h-4 text-xs font-medium text-black/70 dark:text-white/70">
          {submitted ? "Listening... Speak now" : "Click mic to speak"}
        </p>
      </div>
    </div>
  );
}

export function AIVoiceInputDemo() {
  const [recordings, setRecordings] = useState<{ duration: number; timestamp: Date }[]>([]);

  const handleStop = (duration: number) => {
    if (duration > 0) {
      setRecordings((prev) => [...prev.slice(-4), { duration, timestamp: new Date() }]);
    }
  };

  return (
    <div className="space-y-6 p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#14151a]/50 backdrop-blur-md">
      <div className="space-y-4">
        <AIVoiceInput
          onStart={() => console.log("Recording started")}
          onStop={handleStop}
        />
      </div>

      {recordings.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-ink-3 dark:text-zinc-400">
            Recent Voice Recordings:
          </p>
          <div className="flex flex-wrap gap-2">
            {recordings.map((rec, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-[#10b981] border border-emerald-500/20"
              >
                {rec.duration}s ({rec.timestamp.toLocaleTimeString()})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
