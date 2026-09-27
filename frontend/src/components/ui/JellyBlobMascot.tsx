import React, { FC, useState, useEffect, useRef, useCallback } from "react";
import {
  JellyBlobMascot as FeralBlobMascot,
  BlobSpeech,
  type JellyBlobMood,
  type JellyBlobEyeStyle,
} from "feral-blob";
import "feral-blob/blob.css";

export type JellyEmotion =
  | "idle"
  | "neutral"
  | "curious"
  | "happy"
  | "surprised"
  | "love"
  | "shy"
  | "sleepy"
  | "wave"
  | "hmm"
  | "side_eye"
  | "sideEye"
  | "sad"
  | "angry";

export interface JellyBlobMascotProps {
  emotion?: JellyEmotion;
  mood?: JellyEmotion;
  size?: number; // Size in px
  eyeStyle?: JellyBlobEyeStyle;
  gaze?: { x: number; y: number };
  onOverpoke?: () => void;
  onWake?: () => void;
  onPoke?: () => void;
  className?: string;
  onClick?: () => void;
  showSubtitle?: boolean;
  interactive?: boolean;
  autoIdle?: boolean;
  autoLoop?: boolean;
  messages?: Partial<Record<JellyBlobMood, string>>;
}

const EMOTION_MAP: Record<JellyEmotion, JellyBlobMood> = {
  idle: "neutral",
  neutral: "neutral",
  curious: "curious",
  happy: "happy",
  surprised: "surprised",
  love: "love",
  shy: "shy",
  sleepy: "sleepy",
  wave: "wave",
  hmm: "hmm",
  side_eye: "sideEye",
  sideEye: "sideEye",
  sad: "sad",
  angry: "angry",
};

const POKE_CYCLES: Array<{ mood: JellyBlobMood; msg: string }> = [
  { mood: "curious", msg: "Ooh! What are you asking today?" },
  { mood: "happy", msg: "MSAJCE TNEA Code is 1301!" },
  { mood: "surprised", msg: "Whoa! You poked me!" },
  { mood: "love", msg: "Explore 12 UG & 2 PG degrees!" },
  { mood: "wave", msg: "Hello! I am Lorin AI assistant." },
  { mood: "shy", msg: "Hehe! Tap any quick card below." },
  { mood: "hmm", msg: "Top recruiters visit campus every year!" },
  { mood: "sideEye", msg: "Hey, stop poking me!" },
];

const DEFAULT_MESSAGES: Partial<Record<JellyBlobMood, string>> = {
  neutral: "Hey there! I am Lorin AI.",
  curious: "Ooh! What are you asking?",
  happy: "Glad to help with MSAJCE info!",
  surprised: "Whoa! You poked me!",
  love: "MSAJCE TNEA 1301 is awesome!",
  shy: "Hehe, welcome to Lorin AI!",
  sleepy: "Zzz... tap me to wake up!",
  wave: "Hello there! Ask me anything.",
  hmm: "Searching campus records...",
  sideEye: "Hey! Stop poking me!",
  sad: "Aww... let me try again!",
  angry: "Ouch! Overpoked limit reached!",
};

export const JellyBlobMascot: FC<JellyBlobMascotProps> = ({
  emotion,
  mood: moodProp,
  size = 48,
  eyeStyle = "v1",
  gaze: customGaze,
  onOverpoke,
  onWake,
  onPoke,
  className = "",
  onClick,
  showSubtitle = false,
  interactive = true,
  autoIdle = true,
  autoLoop = true,
  messages,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [tempMood, setTempMood] = useState<JellyBlobMood | null>(null);
  const [customMsg, setCustomMsg] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [computedGaze, setComputedGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const baseEmotion = emotion || moodProp || "idle";
  const mappedBaseMood: JellyBlobMood = EMOTION_MAP[baseEmotion] || "neutral";

  // Throttle idle timer reset to eliminate CPU event lag
  const lastResetTimeRef = useRef<number>(0);
  const resetIdleTimer = useCallback(() => {
    if (!autoIdle) return;
    const now = Date.now();
    if (now - lastResetTimeRef.current < 4000) return;
    lastResetTimeRef.current = now;

    if (isIdle) {
      setIsIdle(false);
      if (onWake) onWake();
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 20000);
  }, [autoIdle, isIdle, onWake]);

  useEffect(() => {
    resetIdleTimer();
    const handleGlobalPointer = () => resetIdleTimer();
    window.addEventListener("pointermove", handleGlobalPointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Automatic looping through emotions and messages every 5.5 seconds
  useEffect(() => {
    if (!autoLoop || isIdle) return;
    loopIntervalRef.current = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % POKE_CYCLES.length);
    }, 5500);

    return () => {
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, [autoLoop, isIdle]);

  // Handle dynamic cursor gaze tracking with requestAnimationFrame for 60-120fps smoothness
  const rafIdRef = useRef<number | null>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const gazeX = Math.max(-25, Math.min(25, Math.round(dx / 3.5)));
      const gazeY = Math.max(-20, Math.min(20, Math.round(dy / 3.5)));

      setComputedGaze((prev) => (prev.x === gazeX && prev.y === gazeY ? prev : { x: gazeX, y: gazeY }));
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    resetIdleTimer();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setComputedGaze({ x: 0, y: 0 });
  };

  // Handle poke reaction: cycle to next emotion & speech message on every click
  const triggerPokeReaction = () => {
    resetIdleTimer();
    const nextItem = POKE_CYCLES[(cycleIndex + 1) % POKE_CYCLES.length];
    setCycleIndex((prev) => (prev + 1) % POKE_CYCLES.length);
    setTempMood(nextItem.mood);
    setCustomMsg(nextItem.msg);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTempMood(null);
      setCustomMsg(null);
    }, 2800);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (interactive) {
      triggerPokeReaction();
    }
    if (onPoke) onPoke();
    if (onClick) onClick();
  };

  const handleOverpoke = () => {
    setTempMood("angry");
    setCustomMsg("Ouch! Overpoked limit reached!");
    if (onOverpoke) onOverpoke();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTempMood(null);
      setCustomMsg(null);
    }, 2800);
  };

  // Determine effective mood
  const currentLoopItem = POKE_CYCLES[cycleIndex];
  let activeMood: JellyBlobMood = mappedBaseMood;

  if (tempMood) {
    activeMood = tempMood;
  } else if (isIdle && activeMood === "neutral") {
    activeMood = "sleepy";
  } else if (isHovered && activeMood === "neutral") {
    activeMood = "curious";
  } else if (autoLoop && baseEmotion === "curious") {
    activeMood = currentLoopItem.mood;
  }

  const activeMessage = customMsg || (autoLoop && baseEmotion === "curious" ? currentLoopItem.msg : undefined);

  const mergedMessages = { ...DEFAULT_MESSAGES, ...messages };
  if (activeMessage) {
    mergedMessages[activeMood] = activeMessage;
  }

  const finalGaze = customGaze || computedGaze;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex flex-col items-center justify-center select-none group cursor-pointer transition-transform duration-200 active:scale-95 ${className}`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: size,
        height: size,
        // MSAJCE Emerald Green 3D Jelly Palette
        ["--jelly-body-top" as any]: "#6ee7b7",
        ["--jelly-body-mid" as any]: "#34d399",
        ["--jelly-body-deep" as any]: "#10b981",
        ["--jelly-body-rim" as any]: "#a7f3d0",
        ["--jelly-outline" as any]: "#047857",
        ["--jelly-outline-light" as any]: "#10b981",
        ["--jelly-arm-light" as any]: "#a7f3d0",
        ["--jelly-arm-mid" as any]: "#34d399",
        ["--jelly-arm-deep" as any]: "#059669",
      }}
    >
      {showSubtitle && (
        <div className="absolute -top-12 z-30 pointer-events-none transition-all duration-300 transform group-hover:-translate-y-1">
          <BlobSpeech mood={activeMood} messages={mergedMessages} />
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center pointer-events-auto">
        <FeralBlobMascot
          mood={activeMood}
          eyeStyle={eyeStyle}
          gaze={finalGaze}
          onOverpoke={handleOverpoke}
          onWake={onWake}
          onPoke={onPoke}
          className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)]"
        />
      </div>
    </div>
  );
};

export default JellyBlobMascot;
