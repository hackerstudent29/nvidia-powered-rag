import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Square, Play, Pause, Volume2, Sparkles, X } from "lucide-react";
import { audioManager } from "../../utils/audioManager";

interface TeleprompterPayload {
  messageId: string;
  fullText: string;
  displayWords: string[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  stopAudio: () => void;
  voiceName?: string;
  speed?: number;
}

export default function VoiceCinemaOverlay() {
  const [payload, setPayload] = useState<TeleprompterPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeWordIdx, setActiveWordIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<number | null>(null);

  // Listen for start-voice-teleprompter event
  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvt = e as CustomEvent<TeleprompterPayload>;
      if (customEvt.detail) {
        setPayload(customEvt.detail);
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(0);
        setActiveWordIdx(0);
      }
    };

    const handleStopAll = () => {
      setPayload(null);
      setIsPlaying(false);
    };

    window.addEventListener("start-voice-teleprompter", handleStart);
    window.addEventListener("stop-all-audio", handleStopAll);

    return () => {
      window.removeEventListener("start-voice-teleprompter", handleStart);
      window.removeEventListener("stop-all-audio", handleStopAll);
    };
  }, []);

  // Keyboard shortcut listener (ESC to stop & close, Space to pause/resume)
  useEffect(() => {
    if (!payload) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === " " && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [payload, isPlaying]);

  // High-frequency animation loop to sync audio currentTime & calculate active word index
  useEffect(() => {
    if (!payload || !payload.audioRef.current) return;

    const audioEl = payload.audioRef.current;

    const loop = () => {
      if (audioEl) {
        const cur = audioEl.currentTime || 0;
        const dur = audioEl.duration || 0;
        setCurrentTime(cur);
        setDuration(dur);
        setIsPlaying(!audioEl.paused);

        if (dur > 0 && payload.displayWords.length > 0) {
          const progress = cur / dur;
          const targetIndex = Math.min(
            payload.displayWords.length - 1,
            Math.floor(progress * payload.displayWords.length)
          );
          setActiveWordIdx(targetIndex);
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [payload]);

  // Smooth autoscroll to keep active speaking word centered vertically
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [activeWordIdx]);

  const handleClose = () => {
    if (payload?.stopAudio) {
      payload.stopAudio();
    }
    audioManager.stopAll();
    window.dispatchEvent(new CustomEvent("stop-all-audio"));
    setPayload(null);
  };

  const togglePlayPause = () => {
    if (!payload?.audioRef.current) return;
    const audioEl = payload.audioRef.current;
    if (audioEl.paused) {
      audioEl.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audioEl.pause();
      setIsPlaying(false);
    }
  };

  if (!payload) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[999999] bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none font-sans"
      >
        {/* ── Top Header Control Bar ── */}
        <div className="w-full px-6 py-5 sm:px-10 sm:py-6 flex items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-md shrink-0">
          {/* Left: Active Voice Badge & Animated Soundwave */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{payload.voiceName || "Lorin AI Neural Voice"}</span>
            </div>

            {/* Audio Wave Visualizer Bars */}
            <div className="flex items-center gap-1 h-4 px-2">
              <span className={`w-1 rounded-full bg-[#10b981] transition-all duration-150 ${isPlaying ? "h-4 animate-bounce" : "h-1"}`} />
              <span className={`w-1 rounded-full bg-[#10b981] transition-all duration-150 ${isPlaying ? "h-3 animate-bounce delay-75" : "h-1"}`} />
              <span className={`w-1 rounded-full bg-[#10b981] transition-all duration-150 ${isPlaying ? "h-5 animate-bounce delay-150" : "h-1"}`} />
              <span className={`w-1 rounded-full bg-[#10b981] transition-all duration-150 ${isPlaying ? "h-2 animate-bounce delay-100" : "h-1"}`} />
            </div>
          </div>

          {/* Right: Live Playback Timer & Primary Red Stop Button */}
          <div className="flex items-center gap-4">
            <div className="font-mono text-xs sm:text-sm text-zinc-400 font-medium">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="mx-1 text-zinc-600">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm shadow-lg hover:shadow-red-500/30 transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />
              <span>Stop Voice</span>
              <span className="ml-1 px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-white/80">ESC</span>
            </button>
          </div>
        </div>

        {/* ── Center Teleprompter View ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-12 sm:px-16 sm:py-20 flex flex-col items-center justify-start scrollbar-none"
        >
          <div className="max-w-4xl w-full text-center sm:text-left leading-relaxed tracking-wide text-2xl sm:text-3xl lg:text-4xl font-medium font-ui">
            {payload.displayWords.map((word, idx) => {
              const isPast = idx < activeWordIdx;
              const isCurrent = idx === activeWordIdx;
              const isFuture = idx > activeWordIdx;

              return (
                <span
                  key={idx}
                  ref={isCurrent ? activeWordRef : null}
                  className={`inline-block mx-1.5 my-1 transition-all duration-150 ${
                    isCurrent
                      ? "text-[#10b981] font-extrabold scale-110 drop-shadow-[0_0_16px_rgba(16,185,129,0.9)] underline decoration-[#10b981]/50 underline-offset-8"
                      : isPast
                      ? "text-white/40 font-medium"
                      : "text-white/15 font-normal"
                  }`}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>

        {/* ── Bottom Floating Progress & Controls Bar ── */}
        <div className="w-full px-6 py-4 sm:px-12 sm:py-6 bg-black/90 border-t border-white/10 flex flex-col items-center gap-3 shrink-0 backdrop-blur-md">
          {/* Progress Bar */}
          <div className="w-full max-w-3xl h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-[#10b981] transition-all duration-100 rounded-full shadow-[0_0_10px_#10b981]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Action Pills */}
          <div className="flex items-center justify-between w-full max-w-3xl pt-1">
            <div className="text-xs text-zinc-500 font-mono">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Space</kbd> to Pause/Play
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Exit Cinema View</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
