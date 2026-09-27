import { useState, useEffect, FC, MouseEvent as ReactMouseEvent } from "react";
import { motion, AnimatePresence, TargetAndTransition, Easing } from "framer-motion";

export type JellyEmotion =
  | "idle"
  | "curious"
  | "happy"
  | "surprised"
  | "love"
  | "shy"
  | "sleepy"
  | "wave"
  | "hmm"
  | "side_eye"
  | "sad"
  | "angry";

export interface JellyBlobMascotProps {
  emotion?: JellyEmotion;
  size?: number; // Size in px (default 48)
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  showSubtitle?: boolean;
}

const EMOTION_SUBTITLES: Record<JellyEmotion, string> = {
  idle: "A little breathing room.",
  curious: "Hey. I'm all ears.",
  happy: "Feelin' great!",
  surprised: "Whoa, awesome!",
  love: "So glad to help!",
  shy: "A bit bashful...",
  sleepy: "Catching some Zzz's",
  wave: "Hello there!",
  hmm: "Thinking deeply...",
  side_eye: "Hmm, really?",
  sad: "Oh no...",
  angry: "Hey now!",
};

export const JellyBlobMascot: FC<JellyBlobMascotProps> = ({
  emotion: externalEmotion = "idle",
  size = 48,
  interactive = true,
  className = "",
  onClick,
  showSubtitle = false,
}) => {
  const [internalEmotion, setInternalEmotion] = useState<JellyEmotion>(externalEmotion);
  const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  // Sync external emotion prop if controlled
  useEffect(() => {
    setInternalEmotion(externalEmotion);
  }, [externalEmotion]);

  const emotion = internalEmotion;

  // Eye movement tracking when interactive
  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    const clamp = Math.min(dist, maxDist) / maxDist;
    const angle = Math.atan2(dy, dx);

    const maxEyeOffset = 4.5;
    setPupilPos({
      x: Math.cos(angle) * clamp * maxEyeOffset,
      y: Math.sin(angle) * clamp * maxEyeOffset,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPupilPos({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleTap = () => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 450);
    if (onClick) onClick();
  };

  // Dynamic squish animation parameters per emotion
  const getSquishVariant = (): TargetAndTransition => {
    if (isTapped) {
      return {
        scaleX: [1, 1.25, 0.85, 1.08, 1],
        scaleY: [1, 0.78, 1.2, 0.94, 1],
        rotate: [0, -8, 8, -3, 0],
        transition: { duration: 0.45, ease: "easeOut" as Easing },
      };
    }

    switch (emotion) {
      case "happy":
      case "wave":
        return {
          y: [0, -4, 0, -2, 0],
          scaleX: [1, 1.05, 0.96, 1.02, 1],
          scaleY: [1, 0.95, 1.04, 0.98, 1],
          rotate: emotion === "wave" ? [0, -6, 6, -4, 0] : [0, 2, -2, 0],
          transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" as Easing },
        };
      case "surprised":
        return {
          scaleY: [1, 1.15, 1.08],
          scaleX: [1, 0.9, 0.95],
          y: [0, -6, -4],
          transition: { duration: 0.35, ease: "backOut" as Easing },
        };
      case "shy":
        return {
          scaleY: [1, 0.88, 0.92],
          scaleX: [1, 1.12, 1.06],
          rotate: [0, -5, -4],
          transition: { duration: 0.4, ease: "easeOut" as Easing },
        };
      case "sleepy":
        return {
          scaleY: [1, 0.92, 1],
          scaleX: [1, 1.06, 1],
          y: [0, 2, 0],
          transition: { repeat: Infinity, duration: 4.5, ease: "easeInOut" as Easing },
        };
      case "angry":
        return {
          x: [0, -2.5, 2.5, -2, 2, 0],
          scaleX: [1, 1.04, 0.96, 1],
          rotate: [0, -3, 3, 0],
          transition: { repeat: Infinity, duration: 0.6, ease: "easeInOut" as Easing },
        };
      case "sad":
        return {
          scaleY: [1, 0.86, 0.9],
          scaleX: [1, 1.1, 1.05],
          y: [0, 3, 2],
          transition: { duration: 0.5, ease: "easeOut" as Easing },
        };
      case "curious":
        return {
          rotate: [0, 10, 8],
          scaleX: [1, 0.96, 0.98],
          scaleY: [1, 1.04, 1.02],
          transition: { duration: 0.4, ease: "easeOut" as Easing },
        };
      case "hmm":
        return {
          rotate: [0, -8, -6],
          scaleY: [1, 0.98, 1],
          transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" as Easing },
        };
      case "side_eye":
        return {
          rotate: [0, -6, -5],
          scaleX: [1, 1.04, 1.02],
          transition: { duration: 0.35, ease: "easeOut" as Easing },
        };
      case "love":
        return {
          scale: [1, 1.12, 0.98, 1.06, 1],
          y: [0, -3, 0],
          transition: { repeat: Infinity, duration: 1.6, ease: "easeInOut" as Easing },
        };
      case "idle":
      default:
        return {
          scaleY: [1, 1.03, 0.98, 1],
          scaleX: [1, 0.98, 1.02, 1],
          transition: { repeat: Infinity, duration: 3.2, ease: "easeInOut" as Easing },
        };
    }
  };

  // Color scheme: Signature Radiant Emerald Green (#10b981 / #059669)
  const isAngry = emotion === "angry";

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
      style={{ width: size, height: size }}
    >
      {/* ── Subtitle Tooltip if requested ── */}
      {showSubtitle && (
        <span className="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900/90 text-emerald-300 text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none z-30 animate-in fade-in slide-in-from-bottom-1">
          {EMOTION_SUBTITLES[emotion]}
        </span>
      )}

      {/* ── Floating Particle Extras (Hearts, Zzz, Sparkles, Tears, Anger aura) ── */}
      <AnimatePresence>
        {emotion === "love" && (
          <motion.div
            key="love-particle"
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -18, scale: [0.6, 1.2, 0.8] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
            className="absolute -top-2 text-rose-500 text-xs pointer-events-none z-20"
          >
            ♥
          </motion.div>
        )}

        {emotion === "sleepy" && (
          <motion.div
            key="sleepy-particle"
            initial={{ opacity: 0, y: 0, x: 2, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -20, x: 10, scale: [0.6, 1.1, 0.8] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
            className="absolute -top-3 right-0 text-emerald-300/90 font-mono font-bold text-[10px] pointer-events-none z-20"
          >
            Zzz
          </motion.div>
        )}

        {emotion === "curious" && (
          <motion.div
            key="curious-particle"
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-3 -right-1 text-emerald-300 font-mono font-black text-[12px] pointer-events-none z-20"
          >
            ?
          </motion.div>
        )}

        {emotion === "sad" && (
          <motion.div
            key="sad-particle"
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: [0, 1, 0], y: 12 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeIn" }}
            className="absolute top-5 right-2 w-1.5 h-2.5 rounded-full bg-cyan-300/90 pointer-events-none z-20"
          />
        )}
      </AnimatePresence>

      {/* ── Outer Drop Shadow ── */}
      <div
        className="absolute bottom-0 w-[78%] h-[18%] rounded-[100%] bg-black/25 dark:bg-black/50 blur-[3px] transition-all duration-300 pointer-events-none"
        style={{
          transform: isHovered ? "scale(1.15)" : "scale(1)",
        }}
      />

      {/* ── Helmet 3D Green Jelly Canvas SVG Body ── */}
      <motion.svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible cursor-pointer drop-shadow-[0_6px_16px_rgba(16,185,129,0.35)]"
        animate={getSquishVariant()}
      >
        <defs>
          {/* Main Jelly Green Gradient */}
          <radialGradient id="jellyGreenGrad" cx="35%" cy="30%" r="68%">
            <stop offset="0%" stopColor={isAngry ? "#ef4444" : "#34d399"} />
            <stop offset="50%" stopColor={isAngry ? "#dc2626" : "#10b981"} />
            <stop offset="85%" stopColor={isAngry ? "#991b1b" : "#059669"} />
            <stop offset="100%" stopColor={isAngry ? "#7f1d1d" : "#047857"} />
          </radialGradient>

          {/* Gloss Specular Highlight Gradient */}
          <linearGradient id="glossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Inner Glass Glow */}
          <radialGradient id="innerGlow" cx="50%" cy="80%" r="50%">
            <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>

          {/* Cheeks Rosy Glow */}
          <radialGradient id="cheekGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── 1. Top Helmet Crest / Nub ── */}
        <path
          d="M 50,8 Q 53,1 48,15 Z"
          fill="url(#jellyGreenGrad)"
          className="transition-colors duration-300"
        />
        <circle cx="50" cy="8" r="4.5" fill="url(#jellyGreenGrad)" />
        <circle cx="48.5" cy="6.5" r="1.5" fill="#ffffff" opacity="0.7" />

        {/* ── 2. Waving Arm / Nub (When emotion === 'wave' or 'hmm') ── */}
        {emotion === "wave" && (
          <motion.path
            d="M 80,52 C 92,42 96,28 88,26 C 82,24 76,40 76,50 Z"
            fill="url(#jellyGreenGrad)"
            animate={{ rotate: [0, 15, -10, 15, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{ transformOrigin: "76px 50px" }}
          />
        )}

        {emotion === "hmm" && (
          <path
            d="M 68,66 C 76,64 78,52 64,54 Z"
            fill="url(#jellyGreenGrad)"
          />
        )}

        {/* ── 3. Main Squishy Jelly Body (Smooth rounded dome helmet shape) ── */}
        <path
          d={
            emotion === "sad"
              ? "M 15,82 C 12,94 88,94 85,82 C 94,62 86,18 50,18 C 14,18 6,62 15,82 Z"
              : emotion === "surprised"
              ? "M 20,86 C 16,92 84,92 80,86 C 90,66 84,14 50,14 C 16,14 10,66 20,86 Z"
              : "M 16,84 C 12,92 88,92 84,84 C 92,64 84,16 50,16 C 16,16 8,64 16,84 Z"
          }
          fill="url(#jellyGreenGrad)"
          stroke={isAngry ? "#7f1d1d" : "#047857"}
          strokeWidth="1.5"
          className="transition-colors duration-300"
        />

        {/* ── 4. Inner Ambient Glass Glow ── */}
        <ellipse cx="50" cy="72" rx="30" ry="14" fill="url(#innerGlow)" />

        {/* ── 5. Top Left Gloss Specular Reflection (Glassy 3D Look) ── */}
        <path
          d="M 28,26 C 36,20 62,20 66,24 C 54,26 36,32 30,42 C 26,36 26,30 28,26 Z"
          fill="url(#glossGrad)"
        />
        <circle cx="32" cy="28" r="3" fill="#ffffff" opacity="0.9" />

        {/* ── 6. Rosy Blush Cheeks (for Happy, Love, Shy, Wave) ── */}
        {(emotion === "happy" ||
          emotion === "love" ||
          emotion === "shy" ||
          emotion === "wave") && (
          <>
            <ellipse cx="28" cy="58" rx="6" ry="4" fill="url(#cheekGlow)" />
            <ellipse cx="72" cy="58" rx="6" ry="4" fill="url(#cheekGlow)" />
          </>
        )}

        {/* ── 7. Angry Furrowed Eyebrows ── */}
        {emotion === "angry" && (
          <>
            <line x1="26" y1="40" x2="42" y2="46" stroke="#450a0a" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="74" y1="40" x2="58" y2="46" stroke="#450a0a" strokeWidth="3.5" strokeLinecap="round" />
          </>
        )}

        {/* ── 8. EYES & PUPILS (Rendered for all 12 expressions) ── */}
        <g className="transition-transform duration-200">
          {/* A. LOVE: Animated Heart Eyes */}
          {emotion === "love" ? (
            <>
              <path d="M 32,44 C 28,38 22,44 32,52 C 42,44 36,38 32,44 Z" fill="#f43f5e" />
              <path d="M 68,44 C 64,38 58,44 68,52 C 78,44 72,38 68,44 Z" fill="#f43f5e" />
            </>
          ) : emotion === "happy" || emotion === "wave" ? (
            /* B. HAPPY / WAVE: Joyful Arcs ^ ^ */
            <>
              <path d="M 26,48 Q 34,38 42,48" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 58,48 Q 66,38 74,48" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
            </>
          ) : emotion === "sleepy" ? (
            /* C. SLEEPY: Eyelids Closed - - */
            <>
              <path d="M 26,48 Q 34,54 42,48" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <path d="M 58,48 Q 66,54 74,48" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </>
          ) : emotion === "shy" ? (
            /* D. SHY: Looking Down Eyes > < */
            <>
              <path d="M 28,44 L 38,52 L 28,54" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M 72,44 L 62,52 L 72,54" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </>
          ) : (
            /* E. STANDARD / CURIOUS / SURPRISED / HMM / SIDE EYE / SAD / ANGRY / IDLE */
            <>
              {/* Left Eye Sclera */}
              <ellipse
                cx={emotion === "curious" ? "33" : emotion === "side_eye" ? "30" : "34"}
                cy={emotion === "surprised" ? "45" : "48"}
                rx={emotion === "surprised" ? "9" : "7.5"}
                ry={emotion === "surprised" ? "11" : "9"}
                fill="#ffffff"
              />
              {/* Left Pupil */}
              <circle
                cx={
                  (emotion === "curious" ? 33 : emotion === "side_eye" ? 28 : 34) +
                  (emotion === "side_eye" ? 3 : pupilPos.x)
                }
                cy={
                  (emotion === "surprised" ? 45 : 48) +
                  (emotion === "hmm" ? -3 : emotion === "sad" ? 3 : pupilPos.y)
                }
                r={emotion === "surprised" ? "3.5" : emotion === "angry" ? "3" : "4.5"}
                fill="#0f172a"
              />
              {/* Left Pupil Catchlight Gloss */}
              <circle
                cx={
                  (emotion === "curious" ? 33 : emotion === "side_eye" ? 28 : 34) +
                  (emotion === "side_eye" ? 3 : pupilPos.x) -
                  1.5
                }
                cy={
                  (emotion === "surprised" ? 45 : 48) +
                  (emotion === "hmm" ? -3 : emotion === "sad" ? 3 : pupilPos.y) -
                  1.5
                }
                r="1.5"
                fill="#ffffff"
              />

              {/* Right Eye Sclera */}
              <ellipse
                cx={emotion === "curious" ? "69" : emotion === "side_eye" ? "66" : "66"}
                cy={emotion === "surprised" ? "45" : emotion === "curious" ? "46" : "48"}
                rx={emotion === "surprised" ? "9" : "7.5"}
                ry={emotion === "surprised" ? "11" : "9"}
                fill="#ffffff"
              />
              {/* Right Pupil */}
              <circle
                cx={
                  (emotion === "curious" ? 69 : emotion === "side_eye" ? 64 : 66) +
                  (emotion === "side_eye" ? 3 : pupilPos.x)
                }
                cy={
                  (emotion === "surprised" ? 45 : emotion === "curious" ? 46 : 48) +
                  (emotion === "hmm" ? -3 : emotion === "sad" ? 3 : pupilPos.y)
                }
                r={emotion === "surprised" ? "3.5" : emotion === "angry" ? "3" : "4.5"}
                fill="#0f172a"
              />
              {/* Right Pupil Catchlight Gloss */}
              <circle
                cx={
                  (emotion === "curious" ? 69 : emotion === "side_eye" ? 64 : 66) +
                  (emotion === "side_eye" ? 3 : pupilPos.x) -
                  1.5
                }
                cy={
                  (emotion === "surprised" ? 45 : emotion === "curious" ? 46 : 48) +
                  (emotion === "hmm" ? -3 : emotion === "sad" ? 3 : pupilPos.y) -
                  1.5
                }
                r="1.5"
                fill="#ffffff"
              />
            </>
          )}
        </g>

        {/* ── 9. MOUTHS (Mapped for all 12 expressions) ── */}
        <g>
          {emotion === "surprised" ? (
            /* Surprised O Mouth */
            <circle cx="50" cy="66" r="5.5" fill="#0f172a" />
          ) : emotion === "happy" || emotion === "love" ? (
            /* Open Bouncing Happy Smile with tongue */
            <g>
              <path d="M 40,62 Q 50,74 60,62 Z" fill="#0f172a" />
              <path d="M 44,67 Q 50,72 56,67 Z" fill="#f43f5e" />
            </g>
          ) : emotion === "sad" ? (
            /* Downturned Sad Mouth */
            <path d="M 42,68 Q 50,60 58,68" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          ) : emotion === "angry" ? (
            /* Angry Pout Mouth */
            <path d="M 42,66 L 50,63 L 58,66" stroke="#450a0a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : emotion === "hmm" || emotion === "side_eye" ? (
            /* Tilted Thinking Line */
            <path d="M 44,65 L 56,63" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
          ) : emotion === "curious" ? (
            /* Cute Open Smile */
            <path d="M 44,63 Q 50,69 56,63" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          ) : (
            /* Idle Default Soft Smile */
            <path d="M 43,64 Q 50,70 57,64" stroke="#0f172a" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          )}
        </g>
      </motion.svg>
    </div>
  );
};

export default JellyBlobMascot;
