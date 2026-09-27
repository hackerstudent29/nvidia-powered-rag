import { FC } from "react";
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

export const JellyBlobMascot: FC<JellyBlobMascotProps> = ({
  emotion,
  mood: moodProp = "idle",
  size = 48,
  eyeStyle = "v1",
  gaze,
  onOverpoke,
  onWake,
  onPoke,
  className = "",
  onClick,
  showSubtitle = false,
  messages,
}) => {
  const activeEmotion = emotion || moodProp || "idle";
  const mappedMood: JellyBlobMood = EMOTION_MAP[activeEmotion] || "neutral";

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        // Override feral-blob palette to MSAJCE Emerald Green
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
        <div className="absolute -top-14 z-30 pointer-events-none">
          <BlobSpeech mood={mappedMood} messages={messages} />
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center pointer-events-auto">
        <FeralBlobMascot
          mood={mappedMood}
          eyeStyle={eyeStyle}
          gaze={gaze}
          onOverpoke={onOverpoke}
          onWake={onWake}
          onPoke={onPoke}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default JellyBlobMascot;
