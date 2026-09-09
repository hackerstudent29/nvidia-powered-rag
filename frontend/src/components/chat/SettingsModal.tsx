import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { audioManager } from "../../utils/audioManager";
import {
  X,
  Volume2,
  Check,
  Play,
  Square,
  GraduationCap,
  Compass,
  Cpu,
  UserCheck,
  Zap,
  Save
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export interface AICharacterProfile {
  id: string;
  name: string;
  role: string;
  gender: "Female" | "Male";
  avatarOrb: string;
  icon: any;
  sampleText: string;
}

export default function SettingsModal({
  isOpen,
  onClose,
  isMobile = false,
}: SettingsModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartY = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);

  // TTS Voice State
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    return localStorage.getItem("lorin_tts_voice") || "flux-brooke-en";
  });

  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem("lorin_tts_voice", voiceId);
    window.dispatchEvent(new CustomEvent("lorin_voice_settings_changed"));
  };

  const handleSaveAndApply = () => {
    localStorage.setItem("lorin_tts_voice", selectedVoice);
    window.dispatchEvent(new CustomEvent("lorin_voice_settings_changed"));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 450);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Touch handlers for mobile bottom sheet swipe down
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || !isMobile) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    };
    const onTouchEnd = () => {
      if (touchDeltaY.current > 80) onClose();
      touchDeltaY.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, onClose, isOpen]);

  // Stop all audio immediately when drawer closes
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      audioManager.stopAll();
      setPreviewingVoice(null);
    }
  }, [isOpen]);

  const fallbackSpeech = (sampleText: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sampleText);
      u.onend = () => setPreviewingVoice(null);
      u.onerror = () => setPreviewingVoice(null);
      window.speechSynthesis.speak(u);
    } else {
      setPreviewingVoice(null);
    }
  };

  const handlePreview = async (charId: string, sampleText: string) => {
    if (previewingVoice === charId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setPreviewingVoice(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setPreviewingVoice(charId);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sampleText, voice: charId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          const a = new Audio(data.audio_base64);
          audioRef.current = a;
          a.onended = () => {
            setPreviewingVoice(null);
            audioRef.current = null;
          };
          a.onerror = () => {
            fallbackSpeech(sampleText);
          };
          await a.play();
          return;
        }
      }
      fallbackSpeech(sampleText);
    } catch (err) {
      fallbackSpeech(sampleText);
    }
  };

  // 6 Flux Category Voice Models: Brooke (Default), Cliff, Alexis, Priya, Bruce, Marcelo
  const characterProfiles: AICharacterProfile[] = [
    {
      id: "flux-brooke-en",
      name: "Brooke",
      role: "Academic Tutor (Recommended Default)",
      gender: "Female",
      avatarOrb: "from-[#10b981] via-teal-400 to-emerald-300 shadow-emerald-500/20",
      icon: GraduationCap,
      sampleText: "Hello! I am Brooke, your friendly default academic tutor for Mohamed Sathak A.J. College.",
    },
    {
      id: "flux-cliff-en",
      name: "Cliff",
      role: "American Masculine",
      gender: "Male",
      avatarOrb: "from-emerald-400 via-teal-500 to-cyan-500 shadow-emerald-500/20",
      icon: Cpu,
      sampleText: "Greetings. I am Cliff, an engineering specialist with a clear masculine tone.",
    },
    {
      id: "flux-alexis-en",
      name: "Alexis",
      role: "American Feminine",
      gender: "Female",
      avatarOrb: "from-amber-400 via-orange-500 to-red-500 shadow-orange-500/20",
      icon: UserCheck,
      sampleText: "Hello! I am Alexis. I can guide you through admissions, cut-offs, and campus details.",
    },
    {
      id: "flux-priya-en",
      name: "Priya",
      role: "Academic Counselor",
      gender: "Female",
      avatarOrb: "from-purple-600 via-indigo-500 to-cyan-400 shadow-purple-500/20",
      icon: Compass,
      sampleText: "Welcome! I am Priya, your academic advisor for course guidance and student support.",
    },
    {
      id: "flux-bruce-en",
      name: "Bruce",
      role: "Deep Authoritative",
      gender: "Male",
      avatarOrb: "from-blue-600 via-indigo-600 to-violet-600 shadow-blue-500/20",
      icon: Zap,
      sampleText: "Greetings. I am Bruce, providing authoritative technical and research assistance.",
    },
    {
      id: "flux-marcelo-en",
      name: "Marcelo",
      role: "Energetic Specialist",
      gender: "Male",
      avatarOrb: "from-rose-500 via-pink-500 to-amber-400 shadow-rose-500/20",
      icon: Zap,
      sampleText: "Hi there! I am Marcelo, your energetic placement preparation guide.",
    },
  ];

  // Exact reference layout matching screenshot
  const renderContent = () => (
    <>
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-line dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-accent dark:text-[#34d399]" />
          <h3 className="text-sm font-bold text-ink dark:text-[#f4f3ee]">Flux Category Models</h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-ink-3 dark:text-zinc-400 hover:text-ink dark:hover:text-white hover:bg-hover transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Subheader Counter */}
      <div className="pt-3 pb-1.5 px-0.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-3 dark:text-zinc-400">
          {characterProfiles.length} Flux Models (3 Female • 3 Male)
        </span>
      </div>

      {/* Body — Reference Item Rows with separate Play & Select */}
      <div className="flex-1 overflow-y-auto space-y-2.5 overscroll-contain pr-0.5">
        {characterProfiles.map((char) => {
          const isSelected = selectedVoice === char.id;
          const Icon = char.icon;
          const isPlaying = previewingVoice === char.id;

          return (
            <div
              key={char.id}
              onClick={() => handleSelectVoice(char.id)}
              className={`group flex items-center justify-between rounded-2xl px-3.5 py-3 transition-all cursor-pointer border ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:bg-emerald-500/15 dark:border-[#10b981] dark:text-[#34d399] shadow-sm"
                  : "bg-surface dark:bg-[#121318] border-line dark:border-white/10 hover:border-line-hover dark:hover:border-white/20 text-ink dark:text-zinc-200"
              }`}
            >
              {/* Left Side: Avatar + Name + Role */}
              <div className="flex items-center gap-3.5 min-w-0 truncate mr-2">
                {/* Glowing Orb Avatar */}
                <div className={`size-7 rounded-full bg-gradient-to-tr ${char.avatarOrb} shadow-sm shrink-0 flex items-center justify-center text-white text-[10px] font-bold`}>
                  <Icon className="size-3.5" />
                </div>

                {/* Name & Role Label */}
                <div className="flex items-baseline gap-2 min-w-0 truncate">
                  <span className="font-bold text-xs text-ink dark:text-white truncate">
                    {char.name}
                  </span>
                  <span className="text-[11px] text-ink-3 dark:text-zinc-400 truncate font-medium">
                    {char.role}
                  </span>
                </div>
              </div>

              {/* Right Side: Separate Play Preview Button & Selection Indicator */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Dedicated Play Preview Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(char.id, char.sampleText);
                  }}
                  className={`size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isPlaying
                      ? "bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/40"
                      : "bg-inset dark:bg-zinc-800 text-ink-2 dark:text-zinc-300 hover:bg-hover hover:text-ink dark:hover:text-white"
                  }`}
                  title={isPlaying ? "Stop audio preview" : "Listen to voice preview"}
                >
                  {isPlaying ? (
                    <Square className="size-3.5 fill-current text-rose-500" />
                  ) : (
                    <Play className="size-3.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Selection Radio / Checkmark Indicator */}
                <div
                  className={`size-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-emerald-500 dark:bg-[#10b981] text-zinc-950 scale-105 shadow-sm"
                      : "border border-line dark:border-white/20 text-transparent"
                  }`}
                >
                  <Check className="size-3 stroke-[3]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — Save Option Button */}
      <div className="pt-3 border-t border-line dark:border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] text-ink-3 dark:text-zinc-400 font-mono truncate mr-2">
          Selected: <strong className="text-ink dark:text-zinc-200">{selectedVoice}</strong>
        </span>

        <button
          type="button"
          onClick={handleSaveAndApply}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
            isSaved
              ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950"
              : "bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 hover:opacity-90 active:scale-95"
          }`}
        >
          {isSaved ? (
            <>
              <Check className="size-3.5 stroke-[3]" />
              <span>Saved & Applied!</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>Save Voice</span>
            </>
          )}
        </button>
      </div>
    </>
  );

  // ── Mobile: Full-width Bottom Sheet (Matching SessionDrawer) ──
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              ref={sheetRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.38 }}
              onClick={(e) => e.stopPropagation()}
              className="bottom-sheet relative w-full bg-surface shadow-2xl border-t border-line flex flex-col max-h-[80dvh] p-4"
              style={{ maxHeight: "80dvh" }}
            >
              <div className="pb-2 pt-1">
                <div className="bottom-sheet-handle" />
              </div>
              {renderContent()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Desktop: Side Drawer (Exact match to SessionDrawer: max-w-sm, p-5) ──
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="relative h-full w-full max-w-sm bg-surface dark:bg-[#14151a] p-5 shadow-2xl border-l border-line dark:border-white/[0.06] flex flex-col cursor-default"
          >
            {renderContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}





