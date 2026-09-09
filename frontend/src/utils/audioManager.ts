type AudioStopCallback = () => void;

class GlobalAudioManager {
  private activeMessageId: string | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentStopCallback: AudioStopCallback | null = null;

  registerAudio(messageId: string, stopCallback: AudioStopCallback, audioElement?: HTMLAudioElement | null) {
    // Stop ANY and ALL existing audio immediately (both HTMLAudioElement and browser SpeechSynthesis)
    this.stopAll();

    this.activeMessageId = messageId;
    this.currentStopCallback = stopCallback;
    if (audioElement) {
      this.currentAudioElement = audioElement;
    }
  }

  setAudioElement(audioElement: HTMLAudioElement | null) {
    // If a different audio element is currently loaded/playing, stop and clear it first
    if (this.currentAudioElement && this.currentAudioElement !== audioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.removeAttribute("src");
        this.currentAudioElement.load();
      } catch (e) {
        // ignore
      }
    }
    this.currentAudioElement = audioElement;
  }

  stopAll() {
    // 1. Force cancel browser WebSpeech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }

    // 2. Force pause and reset active HTMLAudioElement
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.removeAttribute("src");
        this.currentAudioElement.load();
      } catch (err) {
        console.warn("[GlobalAudioManager] Error clearing currentAudioElement:", err);
      }
      this.currentAudioElement = null;
    }

    // 3. Trigger registered stop callback (UI cleanup, reset states)
    if (this.currentStopCallback) {
      try {
        this.currentStopCallback();
      } catch (err) {
        console.warn("[GlobalAudioManager] Error stopping active audio callback:", err);
      }
      this.currentStopCallback = null;
    }

    this.activeMessageId = null;
  }

  isPlaying(messageId: string): boolean {
    return this.activeMessageId === messageId;
  }

  unregister(messageId: string) {
    if (this.activeMessageId === messageId) {
      this.activeMessageId = null;
      this.currentStopCallback = null;
      this.currentAudioElement = null;
    }
  }
}

export const audioManager = new GlobalAudioManager();
