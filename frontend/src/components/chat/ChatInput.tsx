import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "../Tooltip";
import { RateLimitInfo } from "../../types/chat";
import { cn } from "../../lib/utils";

// ----------------------------------------------------------------------
// Physics & Animation Constants
// ----------------------------------------------------------------------
const SPRING_TRANSITION = "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
const SMOOTH_HEIGHT_TRANSITION = "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), height 0.15s ease-out";

// ----------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------
function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = useState<number | "auto">("auto");
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current) {
      setWidth(spanRef.current.offsetWidth);
    }
  }, [text]);

  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
      style={{ width }}
    >
      <span ref={spanRef} className="invisible whitespace-nowrap px-0.5">
        {text}
      </span>
      <span
        key={text}
        className="absolute inset-0 flex items-center justify-center whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
      >
        {text}
      </span>
    </span>
  );
}

function ModelIcon({ model, className }: { model: string; className?: string }) {
  if (model.includes("Minimax")) {
    return (
      <span className={cn("flex size-3.5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-mono font-bold text-[9px]", className)}>
        M
      </span>
    );
  }
  if (model.includes("Gemini")) {
    return (
      <span className={cn("flex size-3.5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-mono font-bold text-[9px]", className)}>
        G
      </span>
    );
  }
  if (model.includes("ZAI") || model.includes("GLM")) {
    return (
      <span className={cn("flex size-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[9px]", className)}>
        Z
      </span>
    );
  }
  return (
    <span className={cn("flex size-3.5 items-center justify-center rounded-full bg-[#2E6B5E]/30 text-[#10b981] font-mono font-bold text-[9px]", className)}>
      A
    </span>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.75 6.5V7a4.25 4.25 0 0 0 8.5 0v-.5M7 11.25V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function DynamicBarsIcon({ level }: { level: string }) {
  const isMediumOrHigh = level === "Medium" || level === "Max Effort";
  const isHigh = level === "Max Effort";

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="8" width="2.5" height="4.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={1} />
      <rect x="5.75" y="5" width="2.5" height="7.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={isMediumOrHigh ? 1 : 0.3} />
      <rect x="10" y="2" width="2.5" height="10.5" rx="1" fill="currentColor" className="transition-opacity duration-300" opacity={isHigh ? 1 : 0.3} />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ----------------------------------------------------------------------
// Constants & Types
// ----------------------------------------------------------------------
interface ChatInputProps {
  inputValue: string;
  onInputChange: (val: string) => void;
  onSendMessage: (message: string, effort?: string) => void;
  onStopStreaming?: () => void;
  isStreaming: boolean;
  showChips?: boolean;
  rateLimitInfo?: RateLimitInfo | null;
  onClearRateLimit?: () => void;
  isMobile?: boolean;
}

const MODELS_LIST = [
  { id: "auto", name: "Auto (Router)", description: "Auto-routes between Minimax, Gemini & ZAI" },
  { id: "minimax", name: "Minimax (MiniMax-M3)", description: "Auto-selected for reasoning" },
  { id: "gemini", name: "Gemini (Gemini 2.5 Flash)", description: "Auto-selected for speed" },
  { id: "zai", name: "ZAI (GLM-5.3 Flash)", description: "Auto-selected for general queries" },
];

const EFFORTS = ["Low", "Medium", "Max Effort"];

const DISCLAIMER_SENTENCES = [
  "Lorin AI is grounded on official Mohamed Sathak A.J. College of Engineering and Architecture records.",
  "AI models can occasionally make mistakes — answers are not guaranteed to be 100% accurate.",
  "Please verify critical fee structures, admission criteria, and scholarship policies directly with official MSAJCEA Admission Office.",
  "Lorin AI assumes no legal liability for admission decisions or financial commitments made based solely on generated responses.",
  "Official college circulars, Anna University regulations, and MSAJCEA administrative notices override AI content."
];

const QUICK_CHIPS = [
  { label: "Admission Guide", query: "What are the admission criteria, pathways, TNEA code, and document requirements for MSAJCEA?" },
  { label: "Courses Offered", query: "What are all the 12 UG & 2 PG degree courses, intake capacity, and departments offered at MSAJCEA?" },
  { label: "Campus Placements", query: "Who are the top recruiters, placement statistics, and highest salary package at MSAJCEA?" },
  { label: "Scholarships", query: "What scholarships, including government aid, 7.5% quota, and merit schemes, are available at MSAJCEA?" },
  { label: "Boys Hostel", query: "What are the hostel facilities, room capacity, mess menu, and rules for the Boys Hostel at MSAJCEA?" },
  { label: "Girls Hostel", query: "What safety features, capacity, room amenities, and location details apply to the Girls Hostel at MSAJCEA?" },
  { label: "Bus Routes", query: "What are the college bus routes, pickup points, timings, and transport coverage for MSAJCEA?" },
  { label: "Mess & Canteen", query: "What is the mess food menu, dining hall capacity, canteen facilities, and timings at MSAJCEA?" },
  { label: "Central Library", query: "Tell me about the Central Library facilities, book collection, digital library, and working hours at MSAJCEA." },
  { label: "Lab Facilities", query: "What engineering lab facilities, computer centers, and specialized workshops are available at MSAJCEA?" },
  { label: "Campus Life", query: "What sports facilities, athletic infrastructure, and student clubs are active at MSAJCEA?" },
  { label: "Contact Info", query: "What is the official contact info, phone numbers, email addresses, and location map for MSAJCEA?" },
];

export interface VoiceOption {
  id: string;
  name: string;
  gender: "Feminine" | "Masculine";
  accent: "American" | "British" | "Irish";
  description: string;
  gradient: string;
}

const AURA_VOICES: VoiceOption[] = [
  { id: "aura-alexis-en", name: "Alexis", gender: "Feminine", accent: "American", description: "American Feminine", gradient: "from-amber-400 via-orange-500 to-red-500" },
  { id: "aura-asteria-en", name: "Asteria", gender: "Feminine", accent: "American", description: "American Feminine (Warm)", gradient: "from-emerald-400 via-teal-500 to-green-600" },
  { id: "aura-cliff-en", name: "Cliff", gender: "Masculine", accent: "American", description: "American Masculine", gradient: "from-emerald-400 via-cyan-500 to-blue-600" },
  { id: "aura-sienna-en", name: "Sienna", gender: "Feminine", accent: "American", description: "American Feminine", gradient: "from-orange-400 via-amber-500 to-yellow-600" },
  { id: "aura-cole-en", name: "Cole", gender: "Masculine", accent: "American", description: "American Masculine", gradient: "from-blue-400 via-indigo-500 to-purple-600" },
  { id: "aura-colin-en", name: "Colin", gender: "Masculine", accent: "British", description: "British Masculine", gradient: "from-cyan-400 via-blue-500 to-indigo-600" },
  { id: "aura-gemma-en", name: "Gemma", gender: "Feminine", accent: "British", description: "British Feminine", gradient: "from-purple-400 via-fuchsia-500 to-pink-600" },
  { id: "aura-haley-en", name: "Haley", gender: "Feminine", accent: "American", description: "American Feminine", gradient: "from-pink-400 via-purple-500 to-indigo-600" },
  { id: "aura-luna-en", name: "Luna", gender: "Feminine", accent: "American", description: "American Feminine (Soft)", gradient: "from-teal-300 via-cyan-400 to-blue-500" },
  { id: "aura-stella-en", name: "Stella", gender: "Feminine", accent: "American", description: "American Feminine (Pro)", gradient: "from-indigo-400 via-purple-500 to-violet-600" },
  { id: "aura-athena-en", name: "Athena", gender: "Feminine", accent: "British", description: "British Feminine (Elegant)", gradient: "from-violet-400 via-purple-500 to-indigo-600" },
  { id: "aura-hera-en", name: "Hera", gender: "Feminine", accent: "American", description: "American Feminine (Expressive)", gradient: "from-rose-400 via-pink-500 to-red-600" },
  { id: "aura-orion-en", name: "Bruce", gender: "Masculine", accent: "American", description: "American Masculine (Deep)", gradient: "from-sky-400 via-blue-600 to-indigo-700" },
  { id: "aura-zeus-en", name: "Zeus", gender: "Masculine", accent: "American", description: "American Masculine (Strong)", gradient: "from-amber-300 via-yellow-500 to-amber-600" },
  { id: "aura-arcas-en", name: "Arcas", gender: "Masculine", accent: "American", description: "American Masculine (Clear)", gradient: "from-cyan-300 via-sky-500 to-blue-600" },
  { id: "aura-helios-en", name: "Helios", gender: "Masculine", accent: "British", description: "British Masculine (Warm)", gradient: "from-yellow-400 via-amber-500 to-orange-600" },
  { id: "aura-angus-en", name: "Angus", gender: "Masculine", accent: "Irish", description: "Irish Masculine", gradient: "from-green-400 via-emerald-500 to-teal-600" },
  { id: "aura-orpheus-en", name: "Orpheus", gender: "Masculine", accent: "American", description: "American Masculine (Confident)", gradient: "from-blue-500 via-indigo-600 to-slate-700" },
];


export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue = "",
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  showChips = true,
  rateLimitInfo,
  onClearRateLimit,
  isMobile = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isSmoothResize, setIsSmoothResize] = useState(false);
  const [text, setText] = useState(inputValue || "");
  const [effortIndex, setEffortIndex] = useState(1); // Default "Medium"
  const [selectedModel, setSelectedModel] = useState("Auto (Router)");
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);
  const [showLockedToast, setShowLockedToast] = useState(false);

  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem("lorin_tts_voice") || "aura-orion-en";
  });
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem("lorin_tts_voice", voiceId);
    setIsVoiceMenuOpen(false);
  };

  const handlePlayPreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewingVoiceId === voice.id) {
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      const apiBase = (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
        ? "http://localhost:8000/api"
        : import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : "/api";

      const res = await fetch(`${apiBase}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hello! I am ${voice.name}, your AI voice assistant.`,
          voice: voice.id
        })
      });
      const data = await res.json();
      if (data.audio_base64) {
        const audio = new Audio(data.audio_base64);
        previewAudioRef.current = audio;
        audio.onended = () => setPreviewingVoiceId(null);
        audio.onerror = () => setPreviewingVoiceId(null);
        await audio.play();
      } else {
        setPreviewingVoiceId(null);
      }
    } catch (err) {
      console.error("Preview voice error:", err);
      setPreviewingVoiceId(null);
    }
  };



  const [disclaimerIdx, setDisclaimerIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Audio / Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0.1));

  // Hover sliding background for model dropdown
  const [hoverStyle, setHoverStyle] = useState({ opacity: 0, transform: "translateY(0px) scale(0.95)", transition: "none" });
  const [containerHeight, setContainerHeight] = useState(112);
  const [textareaHeight, setTextareaHeight] = useState(56);
  const [isScrolling, setIsScrolling] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(inputValue || "");
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const demoIntervalRef = useRef<number | null>(null);

  // Sync textRef for callbacks
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Sync external inputValue prop
  useEffect(() => {
    if (inputValue !== undefined && inputValue !== text) {
      setText(inputValue);
      if (inputValue.trim() !== "" && !expanded) {
        setIsSmoothResize(false);
        setExpanded(true);
      }
    }
  }, [inputValue, text, expanded]);

  // Expand helper
  const expand = useCallback(() => {
    setIsSmoothResize(false);
    setExpanded(true);
  }, []);

  const handleValueChange = useCallback((val: string) => {
    setIsSmoothResize(true);
    setText(val);
    onInputChange?.(val);
    if (val.trim() !== "" && !expanded) {
      setIsSmoothResize(false);
      setExpanded(true);
    }
  }, [onInputChange, expanded]);

  // Global Keyboard listener — typing anywhere auto-expands and focuses prompt box
  useEffect(() => {
    const handleGlobalTyping = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === "Escape" || e.key === "Tab") return;

      // Printable single character keypresses
      if (e.key.length === 1) {
        expand();
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalTyping);
    return () => window.removeEventListener("keydown", handleGlobalTyping);
  }, [expand]);

  // Auto-expand if text typed or streaming
  useEffect(() => {
    if ((text.trim() !== "" || isStreaming) && !expanded) {
      setIsSmoothResize(false);
      setExpanded(true);
    }
  }, [text, expanded, isStreaming]);

  // Auto focus when expanded
  useEffect(() => {
    if (expanded && !isRecording) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [expanded, isRecording]);

  // Dynamic visualizer animation loop whenever recording is active
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setAudioData(Array.from({ length: 5 }, () => Math.min(1, Math.max(0.18, Math.random() * 0.85))));
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Dynamic textarea height calculation
  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    
    const currentHeight = el.style.height;
    el.style.transition = 'none';
    el.style.height = "0px";
    const scrollHeight = el.scrollHeight;
    el.style.height = currentHeight;
    void el.offsetHeight; 
    el.style.transition = '';
    
    const newHeight = Math.max(52, Math.min(scrollHeight, 160));
    el.style.height = `${newHeight}px`;
    
    setTextareaHeight(newHeight);
    setIsScrolling(scrollHeight > 160);
  }, [text, expanded]);

  useEffect(() => {
    setContainerHeight(Math.max(104, textareaHeight + 44));
  }, [textareaHeight]);

  // Handle blur to collapse when empty
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (internalContainerRef.current && internalContainerRef.current.contains(e.relatedTarget as Node)) return;
    if (text.trim() === "" && !isRecording && !isStreaming) {
      setIsSmoothResize(false);
      setExpanded(false);
      setIsModelSelectOpen(false);
    }
  };

  // Rotate disclaimer sentences
  useEffect(() => {
    const timer = setInterval(() => {
      setDisclaimerIdx((prev) => (prev + 1) % DISCLAIMER_SENTENCES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Rate limit countdown
  useEffect(() => {
    if (!rateLimitInfo?.untilTimestamp) return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((rateLimitInfo.untilTimestamp - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0 && onClearRateLimit) {
        onClearRateLimit();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo, onClearRateLimit]);

  const formatCountdown = (totalSecs: number) => {
    if (totalSecs <= 0) return "0s";
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Audio processing helpers for AssemblyAI Realtime (16kHz PCM16)
  const downsampleBuffer = (buffer: Float32Array, inputSampleRate: number, outputSampleRate = 16000): Float32Array => {
    if (inputSampleRate === outputSampleRate) return buffer;
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const convertFloat32ToPCM16 = (float32Array: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const wsRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const baseTextRef = useRef<string>("");

  // Voice recording stop handler — AssemblyAI Session Termination
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          // Send explicit Terminate event to stop session billing
          wsRef.current.send(JSON.stringify({ type: "Terminate" }));
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null;
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioData(new Array(5).fill(0.1));
  }, []);

  // Voice recording start handler — Primary: Deepgram Nova-2, Fallback: AssemblyAI Universal-3.5 Pro
  const startRecording = useCallback(async () => {
    setIsSmoothResize(false);
    setExpanded(true);
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      const baseText = textRef.current;
      baseTextRef.current = baseText;

      // 2. Connect to STT Proxy WebSocket Endpoint on Backend
      const envUrl = import.meta.env.VITE_API_URL;
      let wsProxyUrl: string;
      if (envUrl) {
        const wsProto = envUrl.startsWith("https") ? "wss" : "ws";
        const host = envUrl.replace(/^https?:\/\//, "");
        wsProxyUrl = `${wsProto}://${host}/ws/stt`;
      } else {
        const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsProxyUrl = `${wsProto}//${window.location.host}/ws/stt`;
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(wsProxyUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[STT Engine] Connected to backend STT proxy.");
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "engine_info") {
              console.log(`[STT Engine] Active provider: ${msg.provider}`);
            } else if (msg.type === "transcript") {
              const transcript = msg.transcript ? msg.transcript.trim() : "";
              if (transcript) {
                const currentBase = baseTextRef.current;
                const combined = (currentBase ? currentBase.trim() + " " : "") + transcript;
                handleValueChange(combined);
                
                if (msg.is_final) {
                  baseTextRef.current = combined;
                }
              }
            }
          } catch (e) {
            console.error("[STT Engine] Message parsing error:", e);
          }
        };

        ws.onerror = (err) => {
          console.error("[STT Engine] Proxy WS error:", err);
        };
      } catch (proxyErr) {
        console.warn("[STT Engine] Proxy connection error, dropping to AssemblyAI direct:", proxyErr);
        const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";
        const tokenRes = await fetch(`${apiBase}/assemblyai/token`);
        const { token } = await tokenRes.json();
        const aaiUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=universal-3-5-pro&mode=balanced&token=${token}`;
        ws = new WebSocket(aaiUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "Turn" && msg.transcript?.trim()) {
              const combined = (baseTextRef.current ? baseTextRef.current.trim() + " " : "") + msg.transcript.trim();
              handleValueChange(combined);
              if (msg.end_of_turn) baseTextRef.current = combined;
            }
          } catch (e) {}
        };
      }


      // 4. Setup AudioContext and Audio Processor
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // Visualizer node for mic bars animation
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVisualizer = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const bands = new Array(5).fill(0);
        const step = Math.floor(dataArray.length / 5);
        for (let i = 0; i < 5; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j];
          }
          bands[i] = Math.min(1, Math.max(0.2, sum / step / 180));
        }
        setAudioData(bands);
        rafRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

      // Audio Processor for streaming 16kHz PCM16 audio chunks to AssemblyAI
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
        const pcm16 = convertFloat32ToPCM16(downsampled);
        wsRef.current.send(pcm16);
      };

    } catch (err: any) {
      console.error("[AssemblyAI STT] Start recording error:", err);
      alert(`Speech-to-Text Error: ${err.message || "Failed to connect to AssemblyAI"}`);
      stopRecording();
    }
  }, [handleValueChange, stopRecording]);


  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setIsSmoothResize(false);
    onSendMessage(trimmed, EFFORTS[effortIndex]);
    handleValueChange("");
    setExpanded(false);
    setIsModelSelectOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && text.trim() === "") {
      setIsSmoothResize(false);
      setExpanded(false);
      setIsModelSelectOpen(false);
    }
  };

  const cycleEffort = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEffortIndex((prev) => (prev + 1) % EFFORTS.length);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isModelSelectOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (internalContainerRef.current && !internalContainerRef.current.contains(e.target as Node)) {
        setIsModelSelectOpen(false);
        setShowLockedToast(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isModelSelectOpen]);

  const handleModelClick = () => {
    setShowLockedToast(true);
    setTimeout(() => {
      setShowLockedToast(false);
    }, 2800);
  };

  const hasValue = text.trim() !== "";
  const showArrow = hasValue && !isRecording && !isStreaming;
  const showStop = isRecording || isStreaming;
  const showMic = !hasValue && !isRecording && !isStreaming;

  const handleActionButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isStreaming) {
      onStopStreaming?.();
    } else if (isRecording) {
      stopRecording();
    } else if (hasValue) {
      handleSubmit();
    } else {
      startRecording();
    }
  };

  return (
    <div
      className="sticky bottom-0 z-20 pb-2.5 pt-1 bg-gradient-to-t from-[#F7F6ED] dark:from-[#0b0c0e] via-[#F7F6ED]/95 dark:via-[#0b0c0e]/95 to-transparent w-full"
      style={{ paddingBottom: `max(10px, calc(10px + var(--keyboard-offset, 0px)))` }}
    >
      <div className="mx-auto max-w-4xl w-full min-w-0 px-3 sm:px-6 box-border">
        {/* Rate Limit Alert Banner Tab */}
        <AnimatePresence>
          {rateLimitInfo && rateLimitInfo.isLimited && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="mb-2.5 w-full rounded-2xl border bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-100 p-3.5 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-amber-900 dark:text-amber-100">
                      {rateLimitInfo.message}
                    </span>
                  </div>
                  <p className="text-[11.5px] sm:text-[12px] text-amber-800/90 dark:text-amber-200/90 mt-0.5 font-medium">
                    Lorin AI will be available again{" "}
                    <strong className="text-amber-950 dark:text-white underline">
                      {rateLimitInfo.resetTimeString}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5 border border-amber-500/30">
                  <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-100">
                    {formatCountdown(secondsLeft)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Chips Marquee */}
        {showChips && (
          isMobile ? (
            <div className="w-full overflow-x-auto pb-1.5 animate-in fade-in duration-200" style={{ scrollbarWidth: 'none' }}>
              <div className="flex items-center gap-1.5 w-max pr-3">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      expand();
                      onSendMessage(chip.query, EFFORTS[effortIndex]);
                    }}
                    disabled={isStreaming || !!rateLimitInfo?.isLimited}
                    className="rounded-full px-3 py-1 text-[11px] font-medium shrink-0 border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#14151a] text-ink dark:text-[#f4f3ee] hover:border-[#2E6B5E] dark:hover:border-[#10b981] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden pb-1.5 group animate-in fade-in duration-200">
              <div className="overflow-hidden w-full relative [mask-image:linear-gradient(to_right,transparent_0%,black_4%,black_96%,transparent_100%)]">
                <div className="animate-marquee flex items-center gap-1.5">
                  {[...QUICK_CHIPS, ...QUICK_CHIPS].map((chip, idx) => (
                    <button
                      key={`${chip.label}-${idx}`}
                      type="button"
                      onClick={() => {
                        expand();
                        onSendMessage(chip.query, EFFORTS[effortIndex]);
                      }}
                      disabled={isStreaming || !!rateLimitInfo?.isLimited}
                      className="rounded-full px-2.5 py-0.5 text-[10.5px] font-medium shrink-0 border border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#14151a]/90 text-ink dark:text-[#f4f3ee] hover:border-[#2E6B5E] dark:hover:border-[#10b981] hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Prompt Input Container (Maintains full lengthy width in idle state) ── */}
        <div
          ref={internalContainerRef}
          onBlur={handleBlur}
          className="relative flex flex-col w-full mx-auto"
          style={{
            maxWidth: 672,
            transition: isSmoothResize
              ? "max-width 0.15s ease-out"
              : "max-width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          {/* Main Input Card */}
          <div
            onMouseDown={(e) => {
              const isTextarea = e.target === textareaRef.current;
              if (expanded && !isTextarea && !isRecording) {
                e.preventDefault();
                textareaRef.current?.focus();
              }
            }}
            style={{
              borderRadius: 24,
              height: expanded ? containerHeight : 48,
              transition: isSmoothResize ? SMOOTH_HEIGHT_TRANSITION : SPRING_TRANSITION,
              overflow: expanded ? "visible" : "hidden",
            }}
            className={cn(
              "relative w-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#14151a] shadow-lg transition-colors z-10 focus-within:border-[#2E6B5E]/50 dark:focus-within:border-[#10b981]/50",
              expanded ? "cursor-text" : "cursor-pointer hover:border-[#2E6B5E]/30 dark:hover:border-[#10b981]/30"
            )}
          >
            {/* Expanded Textarea Input */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about MSAJCEA..."
              disabled={isStreaming}
              style={{
                transition: isSmoothResize
                  ? "height 0.15s ease-out"
                  : "opacity 0.3s ease-out, transform 0.3s ease-out, height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              }}
              className={cn(
                "absolute top-0 inset-x-0 z-[1] w-full resize-none bg-transparent pl-4 pr-12 py-3 text-sm leading-[22px] text-ink dark:text-[#f4f3ee] outline-none placeholder:font-medium placeholder:text-ink-3/60 dark:placeholder:text-zinc-500 cursor-text",
                expanded ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1 pointer-events-none",
                isScrolling ? "overflow-y-auto" : "overflow-y-hidden"
              )}
            />

            {/* Collapsed Placeholder Button */}
            <button
              type="button"
              onClick={expand}
              style={{ transition: isSmoothResize ? "none" : "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
              className={cn(
                "absolute inset-x-0 top-0 z-[1] cursor-pointer pl-4 pr-12 py-[14px] text-left text-sm font-medium leading-[17px] text-ink-3/80 dark:text-[#b1ada1]/80 outline-none flex items-center justify-between",
                !expanded ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-105 translate-y-1 pointer-events-none"
              )}
              aria-label="Open prompt input"
            >
              <span className="truncate">Ask anything about MSAJCEA...</span>
            </button>

            {/* Bottom Actions Bar (Model Dropdown & Effort Selector) */}
            <div
              className={cn(
                "absolute bottom-2 left-3 right-12 z-[10] flex items-center gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                expanded && !isRecording ? "opacity-100 blur-0 translate-y-0 pointer-events-auto" : "opacity-0 blur-sm translate-y-2 pointer-events-none"
              )}
            >
              {/* Model Select Button & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModelSelectOpen((prev) => !prev);
                  }}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 outline-none cursor-pointer border",
                    isModelSelectOpen
                      ? "bg-[#E1EED7] dark:bg-[#2E6B5E]/30 text-[#2E6B5E] dark:text-[#10b981] border-[#2E6B5E]/40"
                      : "bg-[#E1EED7]/70 dark:bg-[#2E6B5E]/20 text-[#2E6B5E] dark:text-[#10b981] border-[#2E6B5E]/20 dark:border-[#10b981]/30 hover:bg-[#E1EED7]"
                  )}
                >
                  <ModelIcon model={selectedModel} />
                  <span>
                    <MorphingText text={selectedModel} />
                  </span>
                  <LockIcon />
                </button>

                {/* Model Popover */}
                <div
                  style={{ transformOrigin: "bottom left" }}
                  onMouseLeave={() => {
                    setHoverStyle((prev) => ({
                      ...prev,
                      opacity: 0,
                      transform: prev.transform.replace("scale(1)", "scale(0.95)"),
                      transition: "opacity 0.2s ease-in, transform 0.2s ease-out",
                    }));
                  }}
                  className={cn(
                    "absolute bottom-full left-0 mb-2.5 z-50 w-72 sm:w-80 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#1c1d24]/95 p-2 shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all duration-300 cursor-default",
                    isModelSelectOpen
                      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                      : "opacity-0 scale-95 translate-y-3 pointer-events-none ease-[cubic-bezier(0.175,0.885,0.32,1.275)]"
                  )}
                >
                  <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-ink-3 dark:text-[#b1ada1]">
                      Model Auto-Router
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#10b981] text-[9.5px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      AUTO ACTIVE
                    </span>
                  </div>

                  {showLockedToast && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-medium leading-tight animate-in fade-in flex items-center gap-1.5">
                      <LockIcon />
                      <span>Auto-routing automatically selects model based on query type.</span>
                    </div>
                  )}

                  <div className="relative flex flex-col gap-1.5">
                    {/* Hover highlight background slider */}
                    <div style={hoverStyle} className="absolute left-0 right-0 top-0 h-[48px] -z-10 rounded-xl bg-black/[0.05] dark:bg-white/[0.08] pointer-events-none" />
                    
                    {MODELS_LIST.map((mItem, idx) => {
                      const isAuto = mItem.id === "auto";
                      return (
                        <button
                          key={mItem.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => {
                            setHoverStyle((prev) => ({
                              opacity: 1,
                              transform: `translateY(${idx * 54}px) scale(1)`,
                              transition: prev.opacity === 0 ? "opacity 0.15s ease-out" : "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.15s ease",
                            }));
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModelClick();
                          }}
                          className={cn(
                            "group relative flex h-[48px] w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-all duration-200 outline-none cursor-pointer border border-transparent",
                            isAuto
                              ? "text-ink dark:text-[#f4f3ee] opacity-100 font-semibold"
                              : "text-ink-2/70 dark:text-[#b1ada1]/70 opacity-60 hover:opacity-90"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <ModelIcon model={mItem.name} className={cn(!isAuto && "grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100 transition-all")} />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs leading-tight truncate">{mItem.name}</span>
                                {!isAuto && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/[0.06] dark:bg-white/[0.08] text-ink-3 dark:text-zinc-400 font-normal">
                                    Auto-routed
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-ink-3 dark:text-[#b1ada1] truncate">{mItem.description}</span>
                            </div>
                          </div>

                          {isAuto ? (
                            <span className="flex size-4 items-center justify-center rounded-full bg-[#10b981]/20 text-[#10b981] shrink-0">
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="2 6 5 9 10 3" />
                              </svg>
                            </span>
                          ) : (
                            <span className="text-ink-3/40 dark:text-zinc-600 group-hover:text-amber-500 transition-colors shrink-0">
                              <LockIcon />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Effort Selector Button */}
              <Tooltip content="Adjust reasoning token budget (Low, Medium, Max Effort)">
                <button
                  type="button"
                  onClick={cycleEffort}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-ink dark:text-[#f4f3ee] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold transition-all cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
                >
                  <DynamicBarsIcon level={EFFORTS[effortIndex]} />
                  <span>
                    <MorphingText text={EFFORTS[effortIndex]} />
                  </span>
                </button>
              </Tooltip>
            </div>

            {/* Right side controls container (Listening Waveform + Voice Selector + Mic Action Button) */}
            <div className="absolute right-2 bottom-2 z-[10] flex items-center gap-2">
              {/* Dynamic Animated Soundwave Visualizer */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[#10b981] dark:text-[#10b981] backdrop-blur-md shadow-sm"
                  >
                    <div className="flex items-center gap-1 h-4">
                      {audioData.map((val, i) => (
                        <motion.span
                          key={i}
                          className="w-1 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          animate={{
                            height: [
                              Math.max(4, val * 16),
                              Math.max(6, val * 26),
                              Math.max(4, val * 16)
                            ]
                          }}
                          transition={{
                            repeat: Infinity,
                            repeatType: "mirror",
                            duration: 0.18 + i * 0.04,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-[#10b981] uppercase">
                      Listening
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Voice & STT Engine Selector (Placed right beside mic button) */}
              <div className="relative">
                <Tooltip content="Select Speech Voice & AI STT Model">
                  <button
                    type="button"
                    onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-ink dark:text-[#f4f3ee] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] text-xs font-semibold transition-all cursor-pointer border border-black/[0.06] dark:border-white/[0.06]"
                  >
                    <span className="text-[11px]">🎙️</span>
                    <span>
                      {AURA_VOICES.find(v => v.id === selectedVoice)?.name || "Asteria"}
                    </span>
                  </button>
                </Tooltip>

                {isVoiceMenuOpen && (
                  <div
                    className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl bg-white/95 dark:bg-[#121417]/95 backdrop-blur-xl p-2.5 shadow-2xl border border-black/[0.1] dark:border-white/[0.1] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold text-ink dark:text-zinc-200 border-b border-black/[0.06] dark:border-white/[0.06] mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">{AURA_VOICES.length} Voices</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-[#10b981] font-mono">Deepgram Aura</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVoiceMenuOpen(false)}
                        className="text-ink-3 dark:text-zinc-500 hover:text-ink text-xs p-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {AURA_VOICES.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => handleVoiceSelect(v.id)}
                          className={cn(
                            "group relative flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
                            selectedVoice === v.id
                              ? "bg-black/[0.04] dark:bg-white/[0.08] border-[#10b981]/50 shadow-sm"
                              : "bg-black/[0.02] dark:bg-white/[0.03] border-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Play Preview Button */}
                            <button
                              type="button"
                              onClick={(e) => handlePlayPreview(e, v)}
                              title="Play voice preview"
                              className={cn(
                                "size-6 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm",
                                previewingVoiceId === v.id
                                  ? "bg-[#10b981] text-white animate-pulse"
                                  : "bg-black/10 dark:bg-white/10 text-ink dark:text-zinc-200 hover:bg-[#10b981] hover:text-white"
                              )}
                            >
                              {previewingVoiceId === v.id ? (
                                <span className="text-[10px]">⏸</span>
                              ) : (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                              )}
                            </button>

                            {/* 3D Gradient Orb Avatar */}
                            <div className={cn("size-6 rounded-full bg-gradient-to-tr shadow-md shrink-0 ring-1 ring-white/20", v.gradient)} />

                            {/* Voice Name & Accent */}
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs leading-tight text-ink dark:text-zinc-100 truncate">{v.name}</span>
                              <span className="text-[10px] text-ink-3 dark:text-zinc-400 truncate">{v.description}</span>
                            </div>
                          </div>

                          {selectedVoice === v.id && (
                            <span className="text-[#10b981] font-bold text-xs shrink-0 pl-1">
                              ✓
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Single Unified Action Button (Mic -> ArrowUp -> Stop) */}
              <Tooltip
                content={
                  isStreaming
                    ? "Stop generating"
                    : isRecording
                    ? "Stop recording"
                    : hasValue
                    ? "Send message (Enter)"
                    : "Voice Input (Speech to text)"
                }
              >
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={handleActionButtonClick}
                  disabled={!hasValue && !isRecording && !isStreaming && !!rateLimitInfo?.isLimited}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full text-white transition-all duration-300 cursor-pointer shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
                    showStop
                      ? "bg-red-500 hover:bg-red-600 shadow-red-500/30 animate-pulse ring-2 ring-red-400"
                      : showArrow
                      ? "bg-[#2E6B5E] dark:bg-[#10b981] dark:text-zinc-950 hover:opacity-90"
                      : "bg-[#E1EED7] dark:bg-[#2E6B5E]/30 text-[#2E6B5E] dark:text-[#10b981] hover:bg-[#2E6B5E] hover:text-white dark:hover:bg-[#10b981] dark:hover:text-zinc-950"
                  )}
                >
                  <span className="relative flex h-full w-full items-center justify-center">
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        showArrow ? "opacity-100 scale-100 rotate-0 blur-none" : "opacity-0 scale-50 rotate-45 blur-[1px] pointer-events-none"
                      )}
                    >
                      <ArrowUpIcon />
                    </span>
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        showMic ? "opacity-100 scale-100 rotate-0 blur-none" : "opacity-0 scale-50 -rotate-45 blur-[1px] pointer-events-none"
                      )}
                    >
                      <MicIcon />
                    </span>
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                        showStop ? "opacity-100 scale-100 rotate-0 blur-none" : "opacity-0 scale-50 rotate-45 blur-[1px] pointer-events-none"
                      )}
                    >
                      <StopIcon />
                    </span>
                  </span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 1-Sentence Rotating Disclaimer Banner */}
        {!isMobile && (
          <div className="mt-1.5 h-4 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={disclaimerIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] text-ink-3/80 dark:text-[#b1ada1]/80 font-medium text-center truncate max-w-2xl px-2"
              >
                {DISCLAIMER_SENTENCES[disclaimerIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatInput);


