type AudioStopCallback = () => void;

class GlobalAudioManager {
  private activeMessageId: string | null = null;
  private currentStopCallback: AudioStopCallback | null = null;

  registerAudio(messageId: string, stopCallback: AudioStopCallback) {
    // If another message is currently playing audio, stop it immediately!
    if (this.activeMessageId && this.currentStopCallback && this.activeMessageId !== messageId) {
      try {
        this.currentStopCallback();
      } catch (err) {
        console.warn("[GlobalAudioManager] Error stopping previous audio:", err);
      }
    }

    // Stop browser WebSpeech synthesis if running
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    this.activeMessageId = messageId;
    this.currentStopCallback = stopCallback;
  }

  stopAll() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (this.currentStopCallback) {
      try {
        this.currentStopCallback();
      } catch (err) {
        console.warn("[GlobalAudioManager] Error stopping active audio:", err);
      }
    }

    this.activeMessageId = null;
    this.currentStopCallback = null;
  }

  isPlaying(messageId: string): boolean {
    return this.activeMessageId === messageId;
  }

  unregister(messageId: string) {
    if (this.activeMessageId === messageId) {
      this.activeMessageId = null;
      this.currentStopCallback = null;
    }
  }
}

export const audioManager = new GlobalAudioManager();
