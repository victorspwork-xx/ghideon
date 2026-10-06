import {
  fetchElevenLabsTTSAudio,
  fetchGeminiTTSAudio,
  fetchGoogleTTSAudio,
  fetchGroqTTSAudio,
  fetchOmniRouteTTSAudio,
  fetchOpenAITTSAudio,
  type TTSModelId,
} from '@/core/capture/voice/tts-voices';
import { db } from '@/core/guides/db';
import type { CachedAudio, Step } from '@/core/guides/types';
import { localStorage } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import { getStepSpeechText } from '@/ui/shared/useTextToVoice';

export interface StepTTSOptions {
  ttsModel?: TTSModelId | string;
  selectedVoiceURI?: string;
  selectedLang?: string;
  speed?: number;
  apiKey?: string;
  voiceApiKey?: string;
  elevenLabsApiKey?: string;
  omnirouteBaseUrl?: string;
  omnirouteTtsModel?: string;
  forceRefresh?: boolean;
}

export interface SynthesizedAudioResult {
  blob: Blob;
  duration: number;
  engine: string;
  model?: string;
  voiceName?: string;
  fromCache: boolean;
}

// In-memory cache for ultra-fast, zero-latency access across editor & video export
const memoryCache = new Map<string, CachedAudio>();

export function clearAudioMemoryCache(): void {
  memoryCache.clear();
}

export function computeAudioCacheKey(
  stepId: string,
  text: string,
  voiceURI: string,
  ttsModel: string,
  speed: number,
  lang: string,
): string {
  let h = 0;
  const s = `${text.trim()}|${voiceURI}|${ttsModel}|${speed}|${lang}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `${stepId}_${h.toString(36)}`;
}

export async function measureAudioBlobDuration(blob: Blob): Promise<number> {
  if (typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
    try {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      const ab = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab.slice(0));
      const dur = decoded.duration;
      void ctx.close();
      return dur;
    } catch {
      // Fallback below
    }
  }
  return 0;
}

export async function getCachedStepAudio(
  stepId: string,
  text: string,
  voiceURI: string,
  ttsModel: string,
  speed: number,
  lang: string,
): Promise<CachedAudio | null> {
  const key = computeAudioCacheKey(stepId, text, voiceURI, ttsModel, speed, lang);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  try {
    const fromDb = await db.audioCache.get(key);
    if (fromDb) {
      memoryCache.set(key, fromDb);
      return fromDb;
    }
  } catch (err) {
    logger.warn('Failed to read from audioCache in IndexedDB:', err);
  }

  return null;
}

export async function setCachedStepAudio(
  stepId: string,
  text: string,
  voiceURI: string,
  ttsModel: string,
  speed: number,
  lang: string,
  blob: Blob,
  duration: number,
  engine: string,
  voiceName: string,
): Promise<CachedAudio> {
  const key = computeAudioCacheKey(stepId, text, voiceURI, ttsModel, speed, lang);
  const item: CachedAudio = {
    id: key,
    stepId,
    blob,
    duration,
    engine,
    voiceName,
    updatedAt: Date.now(),
  };

  memoryCache.set(key, item);
  try {
    await db.audioCache.put(item);
  } catch (err) {
    logger.warn('Failed to write to audioCache in IndexedDB:', err);
  }

  return item;
}

export async function getOrSynthesizeStepAudio(
  step: Step,
  options?: StepTTSOptions,
): Promise<SynthesizedAudioResult | null> {
  const text = getStepSpeechText(step);
  if (!text || !text.trim()) return null;

  const settings = await localStorage.get([
    'aiApiKey',
    'voiceApiKey',
    'elevenLabsApiKey',
    'aiProvider',
    'ttsModel',
    'ttsVoiceURI',
    'ttsSpeed',
    'ttsLanguage',
    'omnirouteBaseUrl',
    'omnirouteTtsModel',
  ]);

  const ttsModel = (options?.ttsModel || settings.ttsModel || 'browser') as string;
  const voiceURI = (options?.selectedVoiceURI || settings.ttsVoiceURI || '') as string;
  const lang = (options?.selectedLang || settings.ttsLanguage || 'ro-RO') as string;
  const speed =
    typeof options?.speed === 'number'
      ? options.speed
      : typeof settings.ttsSpeed === 'number'
        ? settings.ttsSpeed
        : 1.0;
  const apiKey =
    options?.apiKey ||
    (settings.aiProvider === 'openai' && settings.aiApiKey ? (settings.aiApiKey as string) : '') ||
    (settings.voiceApiKey as string) ||
    (settings.aiApiKey as string) ||
    '';
  const elevenKey = (options?.elevenLabsApiKey || settings.elevenLabsApiKey || '') as string;

  // 1. Check persistent & memory cache
  if (!options?.forceRefresh) {
    const cached = await getCachedStepAudio(step.id, text, voiceURI, ttsModel, speed, lang);
    if (cached) {
      return {
        blob: cached.blob,
        duration: cached.duration,
        engine: cached.engine,
        voiceName: cached.voiceName,
        fromCache: true,
      };
    }
  }

  let blob: Blob | null = null;
  let engine = 'browser';
  let modelUsed: string | undefined;

  // 2. OmniRoute
  if (ttsModel === 'omniroute' || ttsModel === 'omniroute-gemini' || voiceURI.startsWith('omniroute:')) {
    const baseUrl = (options?.omnirouteBaseUrl || settings.omnirouteBaseUrl || undefined) as string | undefined;
    const resolvedModel =
      options?.omnirouteTtsModel ||
      (settings.omnirouteTtsModel as string) ||
      (ttsModel === 'omniroute-gemini' ? 'gemini-2.5-flash' : 'tts-1');
    try {
      blob = await fetchOmniRouteTTSAudio(baseUrl, apiKey, resolvedModel, voiceURI, text, speed);
      engine = 'omniroute';
      modelUsed = resolvedModel;
    } catch (err) {
      logger.warn('OmniRoute step TTS failed, checking Gemini fallback:', err);
      const geminiApiKey =
        settings.aiProvider === 'google' && settings.aiApiKey ? (settings.aiApiKey as string) : apiKey;
      if (geminiApiKey?.trim()) {
        try {
          blob = await fetchGeminiTTSAudio(geminiApiKey, 'gemini-2.0-flash', voiceURI, text, lang);
          engine = 'google';
          modelUsed = 'gemini-2.0-flash';
        } catch {
          // Continue to next provider
        }
      }
    }
  }

  // 3. Gemini Native Speech
  const rawVoice = voiceURI.replace(/^google:/, '').toLowerCase();
  const isGeminiVoice =
    rawVoice === 'aoede' ||
    rawVoice === 'charon' ||
    rawVoice === 'fenrir' ||
    rawVoice === 'kore' ||
    rawVoice === 'puck' ||
    rawVoice === 'journey-f' ||
    rawVoice === 'journey-m' ||
    rawVoice === 'studio-f' ||
    rawVoice === 'studio-m';

  if (!blob && (ttsModel === 'gemini-live' || (isGeminiVoice && !voiceURI.startsWith('openai:')))) {
    const geminiApiKey =
      settings.aiProvider === 'google' && settings.aiApiKey
        ? (settings.aiApiKey as string)
        : (settings.voiceApiKey as string) || (settings.aiApiKey as string) || '';
    if (geminiApiKey.trim()) {
      try {
        blob = await fetchGeminiTTSAudio(geminiApiKey, 'gemini-2.0-flash', voiceURI, text, lang);
        engine = 'google';
        modelUsed = 'gemini-2.0-flash';
      } catch (err) {
        logger.warn('Gemini Native step TTS failed:', err);
      }
    }
  }

  // 4. ElevenLabs
  const isElevenLabsModel =
    ttsModel === 'eleven-multilingual-v2' || ttsModel === 'eleven-flash-v2-5' || ttsModel === 'eleven-turbo-v2-5';

  if (!blob && (voiceURI.startsWith('elevenlabs:') || isElevenLabsModel)) {
    const key = elevenKey.trim() || apiKey.trim();
    if (key) {
      try {
        const model = isElevenLabsModel ? ttsModel : 'eleven-multilingual-v2';
        blob = await fetchElevenLabsTTSAudio(key, model, voiceURI, text, speed);
        engine = 'elevenlabs';
        modelUsed = model;
      } catch (err) {
        logger.warn('ElevenLabs step TTS failed:', err);
      }
    }
  }

  // 5. OpenAI Studio
  if (!blob && (voiceURI.startsWith('openai:') || ttsModel === 'tts-1' || ttsModel === 'tts-1-hd')) {
    if (apiKey.trim()) {
      try {
        const model = (ttsModel as 'tts-1' | 'tts-1-hd') || 'tts-1';
        blob = await fetchOpenAITTSAudio(apiKey, model, voiceURI, text, speed);
        engine = 'openai';
        modelUsed = model;
      } catch (err) {
        logger.warn('OpenAI step TTS failed:', err);
      }
    }
  }

  // 6. Groq
  if (!blob && (voiceURI.startsWith('groq:') || ttsModel === 'groq')) {
    const groqKey =
      (settings.aiProvider === 'groq' && settings.aiApiKey ? (settings.aiApiKey as string) : '') ||
      (settings.voiceApiKey as string) ||
      apiKey;
    if (groqKey.trim()) {
      try {
        blob = await fetchGroqTTSAudio(groqKey, 'canopylabs/orpheus-v1-english', voiceURI, text, speed);
        engine = 'groq';
        modelUsed = 'canopylabs/orpheus-v1-english';
      } catch (err) {
        logger.warn('Groq step TTS failed:', err);
      }
    }
  }

  // 7. Google Cloud
  const isGoogleModel = ttsModel === 'google' || ttsModel === 'google-journey' || ttsModel === 'google-neural2';

  if (!blob && (isGoogleModel || voiceURI.startsWith('google:'))) {
    try {
      const googleKey =
        (settings.aiProvider === 'google' && settings.aiApiKey ? (settings.aiApiKey as string) : '') ||
        (settings.voiceApiKey as string) ||
        apiKey;
      blob = await fetchGoogleTTSAudio(text, lang, voiceURI, googleKey, speed);
      engine = 'google';
      modelUsed = ttsModel;
    } catch (err) {
      logger.warn('Google Cloud step TTS failed:', err);
    }
  }

  if (!blob) {
    return null;
  }

  const duration = await measureAudioBlobDuration(blob);

  // Save to persistent cache so subsequent guide editing previews and video export share this EXACT blob
  await setCachedStepAudio(step.id, text, voiceURI, ttsModel, speed, lang, blob, duration, engine, voiceURI);

  return {
    blob,
    duration,
    engine,
    model: modelUsed,
    voiceName: voiceURI,
    fromCache: false,
  };
}
