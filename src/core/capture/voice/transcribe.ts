import { DEFAULT_OMNIROUTE_BASE_URL } from '@/core/capture/ai/models';
import type { TranscriptionResponse } from './types';

export type VoiceProvider = 'openai' | 'groq' | 'deepseek' | 'omniroute' | 'web-speech' | 'google';

export interface TranscribeConfig {
  provider: VoiceProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  language?: string;
}

export const OPENAI_TRANSCRIPTION_MODELS = [
  {
    id: 'whisper-1',
    label: 'OpenAI Whisper-1 (⚡ Standard)',
    description: 'Transcriere audio de înaltă acuratețe OpenAI',
    tier: 'simple' as const,
  },
];

export const GROQ_TRANSCRIPTION_MODELS = [
  {
    id: 'whisper-large-v3',
    label: 'Whisper Large v3 (⚡ Groq / Recomandat)',
    description: 'Acuratețe maximă pe multiple limbi cu viteză extremă',
    tier: 'simple' as const,
  },
  {
    id: 'whisper-large-v3-turbo',
    label: 'Whisper Large v3 Turbo (🚀 Groq / Turbo)',
    description: 'Viteză ultra-rapidă optimizată pentru latență minimă',
    tier: 'simple' as const,
  },
  {
    id: 'distil-whisper-large-v3-en',
    label: 'Distil-Whisper English (⚡ Groq / Engleză)',
    description: 'Model ultra-ușor optimizat exclusiv pentru limba engleză',
    tier: 'simple' as const,
  },
];

export const GOOGLE_TRANSCRIPTION_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash Audio (⚡ Google Gemini / Recomandat)',
    description: 'Transcriere multimodală rapidă, inteligentă și precisă',
    tier: 'simple' as const,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash Audio (⚡ Google Gemini / Ultra-Rapid)',
    description: 'Latență minimă pentru transcriere instantanee',
    tier: 'simple' as const,
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash Audio (⚡ Google Gemini)',
    description: 'Model audio eficient și stabil',
    tier: 'simple' as const,
  },
  {
    id: 'chirp-2',
    label: 'Google Cloud Chirp 2 (🧠 Google Speech / Studio)',
    description: 'Model dedicat Speech-to-Text de înaltă precizie',
    tier: 'advanced' as const,
  },
  {
    id: 'google-speech',
    label: 'Google Cloud Speech v1 (⚡ Standard)',
    description: 'Recunoaștere vocală clasică Google Cloud',
    tier: 'simple' as const,
  },
];

export const OMNIROUTE_TRANSCRIPTION_MODELS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash Audio (⚡ Google Gemini via OmniRoute / Recomandat)',
    description: 'Transcriere multimodală rapidă, inteligentă și precisă prin OmniRoute',
    tier: 'simple' as const,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash Audio (⚡ Google Gemini via OmniRoute / Ultra-Rapid)',
    description: 'Latență minimă pentru transcriere instantanee prin gateway',
    tier: 'simple' as const,
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash Audio (⚡ Google Gemini via OmniRoute)',
    description: 'Model audio stabil și eficient prin gateway',
    tier: 'simple' as const,
  },
  {
    id: 'chirp-2',
    label: 'Google Cloud Chirp 2 (🧠 Google Speech via OmniRoute)',
    description: 'Model dedicat Speech-to-Text de înaltă fidelitate',
    tier: 'advanced' as const,
  },
  {
    id: 'google-speech',
    label: 'Google Cloud Speech v1 (⚡ Standard)',
    description: 'Recunoaștere vocală clasică Google Cloud via gateway',
    tier: 'simple' as const,
  },
  {
    id: 'whisper-1',
    label: 'Whisper-1 (⚡ OpenAI / Standard OmniRoute)',
    description: 'Recunoaștere vocală standard OpenAI prin OmniRoute',
    tier: 'simple' as const,
  },
  {
    id: 'whisper-large-v3',
    label: 'Whisper Large v3 (🧠 Înaltă precizie)',
    description: 'Acuratețe maximă pe multiple limbi și accente',
    tier: 'advanced' as const,
  },
];

const PROVIDERS: Record<Exclude<VoiceProvider, 'omniroute' | 'google'>, { url: string; model: string }> = {
  openai: { url: 'https://api.openai.com/v1/audio/transcriptions', model: 'whisper-1' },
  groq: { url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3' },
  deepseek: { url: 'https://api.deepseek.com/v1/audio/transcriptions', model: 'whisper-1' },
  'web-speech': { url: '', model: '' },
};

const ERROR_BODY_LIMIT = 200;

export function createTranscriber(config: TranscribeConfig): (wav: Blob) => Promise<TranscriptionResponse> {
  if (config.provider === 'web-speech' || (!config.apiKey && config.provider !== 'omniroute')) {
    return async (): Promise<TranscriptionResponse> => ({
      text: '',
      segments: [],
    });
  }

  if (config.provider === 'google') {
    return async (wav: Blob): Promise<TranscriptionResponse> => {
      const arrayBuf = await wav.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      const targetModel = config.model || 'gemini-2.5-flash';
      const langHint = config.language ? ` in ${config.language}` : '';
      const prompt = `Transcribe the speech in this audio accurately verbatim${langHint}. Return a valid JSON object with the following schema: {"text": "full transcript", "segments": [{"start": 0.0, "end": 2.5, "text": "transcribed speech segment"}]}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'audio/wav',
                      data: base64Audio,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Google transcription failed with ${res.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPart) return { text: '', segments: [] };

      try {
        const parsed = JSON.parse(textPart) as {
          text?: string;
          segments?: Array<{ start: number; end: number; text: string }>;
        };
        const rawSegments =
          Array.isArray(parsed.segments) && parsed.segments.length > 0
            ? parsed.segments
            : [{ start: 0, end: 10, text: parsed.text || textPart }];

        return {
          text: parsed.text || textPart,
          segments: rawSegments.map((s) => ({
            start: typeof s.start === 'number' ? s.start : 0,
            end: typeof s.end === 'number' ? s.end : 10,
            text: s.text || '',
          })),
        };
      } catch {
        return {
          text: textPart,
          segments: [{ start: 0, end: 10, text: textPart }],
        };
      }
    };
  }

  if (config.provider === 'omniroute') {
    const baseUrl = (config.baseUrl || DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, '');
    const model = config.model || 'whisper-1';
    const apiKey = config.apiKey || 'omniroute';

    return async (wav: Blob): Promise<TranscriptionResponse> => {
      const isGeminiFamily = model.toLowerCase().includes('gemini') || model.toLowerCase().includes('antigravity');

      // 1. First try standard /audio/transcriptions endpoint
      try {
        const form = new FormData();
        form.append('file', wav, 'audio.wav');
        form.append('model', model);
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities[]', 'word');
        form.append('timestamp_granularities[]', 'segment');
        form.append('temperature', '0');
        if (config.language) form.append('language', config.language);

        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

        const response = await fetch(`${baseUrl}/audio/transcriptions`, {
          method: 'POST',
          headers,
          body: form,
        });

        if (response.ok) {
          const result = (await response.json()) as {
            text?: string;
            segments?: Array<{ start?: number; end?: number; text?: string }>;
          };
          const text = result.text || '';
          const rawSegments =
            Array.isArray(result.segments) && result.segments.length > 0
              ? result.segments
              : [{ start: 0, end: 10, text }];

          return {
            text,
            segments: rawSegments.map((s) => ({
              start: typeof s.start === 'number' ? s.start : 0,
              end: typeof s.end === 'number' ? s.end : 10,
              text: s.text || '',
            })),
          };
        }

        if (!isGeminiFamily) {
          const body = await response.text().catch(() => '');
          throw new Error(`Transcription failed with ${response.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`);
        }
      } catch (err) {
        if (!isGeminiFamily) throw err;
      }

      // 2. If it is a Gemini/Antigravity model and /audio/transcriptions failed, fallback to /chat/completions with audio
      try {
        const arrayBuf = await wav.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        const langHint = config.language ? ` in ${config.language}` : '';
        const prompt = `Transcribe the speech in this audio accurately verbatim${langHint}. Return a valid JSON object: {"text": "full transcript", "segments": [{"start": 0.0, "end": 2.5, "text": "transcribed segment"}]}`;

        const chatRes = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_audio',
                    input_audio: {
                      data: base64Audio,
                      format: 'wav',
                    },
                  },
                  { type: 'text', text: prompt },
                ],
              },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (!chatRes.ok) {
          const body = await chatRes.text().catch(() => '');
          throw new Error(
            `OmniRoute chat audio transcription failed with ${chatRes.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`,
          );
        }

        const data = (await chatRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content || '';
        if (!content) return { text: '', segments: [] };

        try {
          const parsed = JSON.parse(content) as {
            text?: string;
            segments?: Array<{ start?: number; end?: number; text?: string }>;
          };
          const rawSegments =
            Array.isArray(parsed.segments) && parsed.segments.length > 0
              ? parsed.segments
              : [{ start: 0, end: 10, text: parsed.text || content }];

          return {
            text: parsed.text || content,
            segments: rawSegments.map((s) => ({
              start: typeof s.start === 'number' ? s.start : 0,
              end: typeof s.end === 'number' ? s.end : 10,
              text: s.text || '',
            })),
          };
        } catch {
          return {
            text: content,
            segments: [{ start: 0, end: 10, text: content }],
          };
        }
      } catch (err) {
        throw new Error(
          `OmniRoute transcription failed for model ${model}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
  }

  const p = PROVIDERS[config.provider] ?? PROVIDERS.openai;
  const url = p.url;
  const model = config.model || p.model;

  return async (wav: Blob): Promise<TranscriptionResponse> => {
    const form = new FormData();
    form.append('file', wav, 'audio.wav');
    form.append('model', model);
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.append('timestamp_granularities[]', 'segment');
    form.append('temperature', '0');
    if (config.language) form.append('language', config.language);

    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Transcription failed with ${response.status}: ${body.slice(0, ERROR_BODY_LIMIT)}`);
    }

    const result = (await response.json()) as TranscriptionResponse;
    if (!Array.isArray(result.segments)) {
      throw new Error('Transcription response has no segments; verbose_json is required');
    }

    return result;
  };
}
