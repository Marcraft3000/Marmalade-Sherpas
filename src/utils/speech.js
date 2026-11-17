import { fetchNarration } from './api.js';

function speechChunks(text) {
  const words = text.replace(/[\*_#`~]/g, '').trim().match(/\S+/g) || [];
  const chunks = [];
  let current = '';
  for (const word of words) {
    if (current && (current.length + word.length > 180 || /[.!?…][”"]?$/.test(current))) {
      chunks.push(current);
      current = '';
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) chunks.push(current);
  return chunks;
}

class SpeechService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.run = 0;
    this.utterance = null;
    this.audio = null;
    this.audioUrl = null;
    this.narration = null;
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

      if (this.synth) {
        this.synth.addEventListener?.('voiceschanged', () => this.loadVoices());
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
        this.loadVoices();
      }
    }
  }

  get available() {
    return Boolean(this.synth && (typeof window !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function'));
  }

  loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const english = voices.filter(voice => voice.lang.startsWith('en'));
    const preferred = english.find(voice => voice.localService && voice.lang === 'en-US') ||
      english.find(voice => voice.localService) ||
      voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.includes('Natural') ||
          v.name.includes('Google US English') ||
          v.name.includes('David') ||
          v.name.includes('Guy') ||
          v.name.includes('Alex')
        )
      ) || english[0];
    this.selectedVoice = preferred || null;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) this.stop();
  }

  async narrate({ sessionId, findingId, fallback }, onDone) {
    if (this.isMuted) return;
    this.stop();
    const run = this.run;
    const request = new AbortController();
    this.narration = request;
    try {
      const blob = await fetchNarration(sessionId, findingId, request.signal);
      if (request.signal.aborted || this.run !== run) return;
      if (blob?.size) {
        const url = URL.createObjectURL(blob);
        this.audio = new Audio(url);
        this.audioUrl = url;
        this.audio.onended = () => { this.stop(); onDone?.(); };
        await this.audio.play();
        return;
      }
    } catch {
      if (request.signal.aborted || this.run !== run) return;
    }
    this.stop();
    if (onDone) this.speak(fallback, onDone);
    else this.speak(fallback);
  }

  speak(text, onDoneOrStart, onEnd) {
    if (this.isMuted) return;
    this.stop();
    if (!text) return;

    const onDone = typeof onDoneOrStart === 'function' ? onDoneOrStart : (err => { if (onEnd) onEnd(); });
    const run = this.run;
    const chunks = speechChunks(text);
    const finish = error => {
      if (this.run !== run) return;
      this.isSpeaking = false;
      this.utterance = null;
      if (onDone) onDone(error);
    };

    const UtteranceClass = typeof window !== 'undefined' && window.SpeechSynthesisUtterance ? window.SpeechSynthesisUtterance : (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);

    const speakNext = index => {
      if (this.run !== run) return;
      if (index === chunks.length) return finish();
      try {
        if (!UtteranceClass) return finish('speech unavailable');
        const utterance = new UtteranceClass(chunks[index]);
        utterance.lang = this.selectedVoice?.lang || 'en-US';
        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.rate = 1;
        utterance.onstart = () => {
          this.isSpeaking = true;
          if (typeof onDoneOrStart === 'function' && onEnd) onDoneOrStart();
        };
        utterance.onend = () => speakNext(index + 1);
        utterance.onerror = event => finish(event?.error || 'playback failed');
        this.utterance = utterance;
        this.synth.speak(utterance);
      } catch (error) {
        finish(error);
      }
    };

    if (this.available || (this.synth && UtteranceClass)) speakNext(0);
    else finish('speech unavailable');
  }

  stop() {
    this.run += 1;
    this.isSpeaking = false;
    this.utterance = null;
    this.narration?.abort();
    this.narration = null;
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.synth?.cancel();
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
