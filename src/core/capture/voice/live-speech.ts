import { logger } from '@/lib/logger';

export interface SpokenSegment {
  text: string;
  timestamp: number;
}

export class LiveSpeechSession {
  private recognition: any = null;
  private active = false;
  private lang = 'ro-RO';
  private segments: SpokenSegment[] = [];
  private currentInterim = '';
  private onTranscriptUpdate?: (interim: string, finals: string[]) => void;

  constructor(lang?: string, onUpdate?: (interim: string, finals: string[]) => void) {
    this.lang = lang || 'ro-RO';
    this.onTranscriptUpdate = onUpdate;
  }

  start(lang?: string) {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      logger.warn('Web SpeechRecognition not available in this window');
      return;
    }

    if (lang) {
      this.lang = lang;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;

      this.recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript?.trim();
          if (!text) continue;

          if (item.isFinal) {
            this.segments.push({
              text,
              timestamp: Date.now(),
            });
          } else {
            interim += (interim ? ' ' : '') + text;
          }
        }
        this.currentInterim = interim;
        this.onTranscriptUpdate?.(
          interim,
          this.segments.map((s) => s.text),
        );
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          logger.warn('SpeechRecognition error:', e.error);
        }
      };

      this.recognition.onend = () => {
        if (this.active) {
          // Restart if closed prematurely while still active
          try {
            this.recognition.start();
          } catch {}
        }
      };

      this.active = true;
      this.recognition.start();
      logger.info('LiveSpeechSession started with language:', this.lang);
    } catch (err) {
      logger.warn('Failed to start LiveSpeechSession:', err);
    }
  }

  stop(): SpokenSegment[] {
    this.active = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    // Capture any pending interim phrase as final
    if (this.currentInterim.trim()) {
      this.segments.push({
        text: this.currentInterim.trim(),
        timestamp: Date.now(),
      });
      this.currentInterim = '';
    }

    return [...this.segments];
  }

  getSegments(): SpokenSegment[] {
    return [...this.segments];
  }

  getCurrentInterim(): string {
    return this.currentInterim;
  }
}
