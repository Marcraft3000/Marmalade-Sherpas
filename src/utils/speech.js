/**
 * Web Speech API Utility for THE PLAN AUDIT
 * Completely free, runs locally in the browser, 0 API tokens spent!
 */

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isMuted = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.isListening = false;
    this.selectedVoice = null;

    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }

      // Initialize voices when available
      if (this.synth) {
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
        this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize natural sounding American English voices
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (
        v.name.includes('Natural') ||
        v.name.includes('Google US English') ||
        v.name.includes('David') ||
        v.name.includes('Guy') ||
        v.name.includes('Alex')
      )
    ) || voices.find(v => v.lang.startsWith('en'));
    this.selectedVoice = preferred || voices[0] || null;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  speak(text, onStart, onEnd) {
    if (!this.synth || this.isMuted || !text) return;

    this.synth.cancel(); // Stop any pending speech
    this.isSpeaking = true;

    // Clean text: strip markdown bold/italics/brackets
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // Slightly brisk, Caleb Hammer pace
    utterance.pitch = 0.95; // Direct, authoritative tone

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  startListening(onResult, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported in this browser. Please use text input.');
      return;
    }

    try {
      this.isListening = true;
      this.recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        this.isListening = false;
        if (onResult) onResult(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      if (onError) onError(err.message);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const speechService = new SpeechService();
