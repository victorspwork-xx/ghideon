import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from '#imports';
import { getOrSynthesizeStepAudio } from '@/core/capture/voice/step-tts';
import {
  ELEVENLABS_TTS_VOICES,
  type ElevenLabsTTSVoice,
  fetchElevenLabsTTSAudio,
  fetchGeminiTTSAudio,
  fetchGoogleTTSAudio,
  fetchGroqTTSAudio,
  fetchOmniRouteTTSAudio,
  fetchOpenAITTSAudio,
  GOOGLE_TTS_VOICES,
  GROQ_TTS_VOICES,
  getGoogleTTSVoiceInfo,
  OPENAI_TTS_VOICES,
  type TTSModelId,
} from '@/core/capture/voice/tts-voices';
import type { Step } from '@/core/guides/types';
import { localStorage } from '@/lib/browser-api';
import { getUiLanguageOverride } from '@/lib/i18n-override';
import { logger } from '@/lib/logger';

export interface TextToVoiceOptions {
  steps: Step[];
  onStepChange?: (stepId: string, index: number) => void;
}

export interface TTSPlaybackStatus {
  engine: 'omniroute' | 'google' | 'openai' | 'groq' | 'elevenlabs' | 'browser';
  engineLabel: string;
  model?: string;
  voiceName: string;
  isFallback: boolean;
  error?: string;
  timestamp: number;
}

export interface TestVoiceOptions {
  ttsModel?: TTSModelId;
  omnirouteTtsModel?: string;
  omnirouteBaseUrl?: string;
  apiKey?: string;
  voiceApiKey?: string;
  elevenLabsApiKey?: string;
  onStatus?: (status: TTSPlaybackStatus) => void;
}

export const SUPPORTED_TTS_LANGUAGES = [
  { code: 'ro-RO', label: 'Română', langPrefix: 'ro' },
  { code: 'en-US', label: 'English (US)', langPrefix: 'en' },
  { code: 'en-GB', label: 'English (UK)', langPrefix: 'en' },
  { code: 'es-ES', label: 'Español', langPrefix: 'es' },
  { code: 'fr-FR', label: 'Français', langPrefix: 'fr' },
  { code: 'de-DE', label: 'Deutsch', langPrefix: 'de' },
  { code: 'it-IT', label: 'Italiano', langPrefix: 'it' },
  { code: 'pt-BR', label: 'Português (Brasil)', langPrefix: 'pt' },
  { code: 'pl-PL', label: 'Polski', langPrefix: 'pl' },
  { code: 'nl-NL', label: 'Nederlands', langPrefix: 'nl' },
  { code: 'tr-TR', label: 'Türkçe', langPrefix: 'tr' },
  { code: 'uk-UA', label: 'Українська', langPrefix: 'uk' },
  { code: 'ru-RU', label: 'Русский', langPrefix: 'ru' },
  { code: 'zh-CN', label: '中文', langPrefix: 'zh' },
  { code: 'ja-JP', label: '日本語', langPrefix: 'ja' },
  { code: 'ko-KR', label: '한국어', langPrefix: 'ko' },
] as const;

export function resolveVoiceDisplayName(
  uri: string,
  langCode: string,
  systemVoices: SpeechSynthesisVoice[] = [],
): string {
  if (uri.startsWith('groq:')) {
    const gv = GROQ_TTS_VOICES.find((v) => v.id === uri);
    return gv ? `Groq ${gv.name}` : uri;
  }
  if (uri.startsWith('elevenlabs:') || /^[a-zA-Z0-9_-]{18,25}$/.test(uri) || uri.includes('elevenlabs.io')) {
    let rawId = uri.replace(/^elevenlabs:/, '').trim();
    const urlMatch = rawId.match(/elevenlabs\.io\/voices\/([a-zA-Z0-9_-]+)/i);
    if (urlMatch) rawId = urlMatch[1];
    const ev = ELEVENLABS_TTS_VOICES.find(
      (v) => v.id === uri || v.voiceId === rawId || v.voiceKey.toLowerCase() === rawId.toLowerCase(),
    );
    return ev ? `ElevenLabs ${ev.name}` : `ElevenLabs (${rawId})`;
  }
  if (uri.startsWith('google:')) {
    const gv = GOOGLE_TTS_VOICES.find((v) => v.id === uri);
    if (gv) return gv.name;
    const info = getGoogleTTSVoiceInfo(langCode);
    return info.name;
  }
  if (uri.startsWith('openai:')) {
    const av = OPENAI_TTS_VOICES.find((v) => v.id === uri);
    return av ? `OpenAI ${av.name}` : uri;
  }
  const sys = systemVoices.find((v) => v.voiceURI === uri);
  if (sys?.name) return sys.name;
  return uri || 'Voce implicită';
}

export async function testSpeakVoice(
  voice: SpeechSynthesisVoice | undefined,
  voiceURI?: string,
  lang?: string,
  speed = 1,
  options?: TestVoiceOptions,
): Promise<TTSPlaybackStatus | undefined> {
  if (typeof window === 'undefined') return;

  const targetURI = voiceURI || voice?.voiceURI || '';
  const langCode = lang || voice?.lang || 'ro-RO';
  const langPrefix = langCode.split('-')[0].toLowerCase();
  const sampleText = langCode.startsWith('ro')
    ? 'Aceasta este o mostră pentru vocea selectată.'
    : langCode.startsWith('es')
      ? 'Esta es una muestra de la voz seleccionada.'
      : langCode.startsWith('fr')
        ? 'Ceci est un échantillon de la voix sélectionnée.'
        : langCode.startsWith('de')
          ? 'Dies ist eine Hörprobe der ausgewählten Stimme.'
          : langCode.startsWith('it')
            ? 'Questo è un esempio della voce selezionata.'
            : 'This is a sample of the selected voice.';

  const settings = await localStorage.get([
    'aiApiKey',
    'voiceApiKey',
    'elevenLabsApiKey',
    'aiProvider',
    'ttsModel',
    'omnirouteBaseUrl',
    'omnirouteTtsModel',
  ]);

  const activeTtsModel: TTSModelId = options?.ttsModel || (settings.ttsModel as TTSModelId) || 'browser';
  const activeOmnirouteBaseUrl = (options?.omnirouteBaseUrl ?? (settings.omnirouteBaseUrl as string)) || undefined;
  const activeOmnirouteTtsModel = options?.omnirouteTtsModel || (settings.omnirouteTtsModel as string) || '';
  const activeVoiceApiKey = options?.voiceApiKey || (settings.voiceApiKey as string) || '';
  const activeAiApiKey = options?.apiKey || (settings.aiApiKey as string) || '';
  const activeElevenLabsApiKey = options?.elevenLabsApiKey || (settings.elevenLabsApiKey as string) || '';

  // 1. Direct Browser Web Speech (User deliberately selected local browser speech)
  if (activeTtsModel === 'browser') {
    if (!('speechSynthesis' in window)) {
      const status: TTSPlaybackStatus = {
        engine: 'browser',
        engineLabel: 'Browser Web Speech',
        voiceName: 'Indisponibil',
        isFallback: true,
        error: 'Sinteza vocală nu este suportată în acest browser',
        timestamp: Date.now(),
      };
      options?.onStatus?.(status);
      return status;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sampleText);
    utterance.rate = speed;
    utterance.lang = langCode;

    const sysVoices = window.speechSynthesis.getVoices();
    const exactVoice = voice || sysVoices.find((v) => v.voiceURI === targetURI);
    const langVoice = sysVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    const chosenVoice = exactVoice || langVoice;

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    window.speechSynthesis.speak(utterance);

    const status: TTSPlaybackStatus = {
      engine: 'browser',
      engineLabel: 'Browser Web Speech',
      voiceName: chosenVoice?.name || voice?.name || 'Sistem (Default)',
      isFallback: false,
      timestamp: Date.now(),
    };
    options?.onStatus?.(status);
    return status;
  }

  let fallbackError: string | undefined;

  // 2. OmniRoute AI voice / Google Gemini speech via OmniRoute
  const isOmnirouteTTS =
    activeTtsModel === 'omniroute' || activeTtsModel === 'omniroute-gemini' || targetURI.startsWith('omniroute:');

  if (isOmnirouteTTS) {
    const baseUrl = activeOmnirouteBaseUrl;
    const apiKey = activeVoiceApiKey || activeAiApiKey;
    const resolvedModel =
      activeOmnirouteTtsModel || (activeTtsModel === 'omniroute-gemini' ? 'gemini-2.5-flash' : 'tts-1');
    try {
      const blob = await fetchOmniRouteTTSAudio(baseUrl, apiKey, resolvedModel, targetURI, sampleText, speed);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();

      const status: TTSPlaybackStatus = {
        engine: 'omniroute',
        engineLabel: activeTtsModel === 'omniroute-gemini' ? 'Google Gemini (OmniRoute)' : 'OmniRoute Speech',
        model: resolvedModel,
        voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
        isFallback: false,
        timestamp: Date.now(),
      };
      options?.onStatus?.(status);
      return status;
    } catch (err) {
      const omniErr = err instanceof Error ? err.message : String(err);
      logger.warn('OmniRoute TTS test failed:', omniErr);
      fallbackError =
        omniErr.includes('Failed to fetch') || omniErr.includes('timeout')
          ? `Serverul OmniRoute nu răspunde la ${baseUrl || 'http://localhost:20128'}. Asigură-te că OmniRoute este pornit.`
          : omniErr;

      // If OmniRoute proxy is offline, but user has a direct Gemini key, try direct Gemini
      const geminiApiKey =
        settings.aiProvider === 'google' && settings.aiApiKey
          ? (settings.aiApiKey as string)
          : activeVoiceApiKey || activeAiApiKey;
      const isGeminiIntent =
        activeTtsModel === 'omniroute-gemini' ||
        resolvedModel.toLowerCase().includes('gemini') ||
        ['google:aoede', 'google:charon', 'google:fenrir', 'google:kore', 'google:puck'].includes(targetURI);

      if (isGeminiIntent && geminiApiKey && geminiApiKey.trim()) {
        try {
          const blob = await fetchGeminiTTSAudio(geminiApiKey, 'gemini-2.0-flash', targetURI, sampleText, langCode);
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.playbackRate = speed;
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();

          const status: TTSPlaybackStatus = {
            engine: 'google',
            engineLabel: 'Google Gemini (Direct - OmniRoute Offline)',
            model: 'gemini-2.0-flash',
            voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
            isFallback: true,
            error: fallbackError,
            timestamp: Date.now(),
          };
          options?.onStatus?.(status);
          return status;
        } catch (geminiErr) {
          logger.warn('Direct Gemini fallback failed:', geminiErr);
        }
      }
    }
  }

  // 3. Google Gemini Native Audio (gemini-live or Google Gemini voices)
  const rawTargetVoiceKey = targetURI.replace(/^google:/, '').toLowerCase();
  const isGeminiVoice =
    rawTargetVoiceKey === 'aoede' ||
    rawTargetVoiceKey === 'charon' ||
    rawTargetVoiceKey === 'fenrir' ||
    rawTargetVoiceKey === 'kore' ||
    rawTargetVoiceKey === 'puck' ||
    rawTargetVoiceKey === 'journey-f' ||
    rawTargetVoiceKey === 'journey-m' ||
    rawTargetVoiceKey === 'studio-f' ||
    rawTargetVoiceKey === 'studio-m';

  if (activeTtsModel === 'gemini-live' || (isGeminiVoice && !targetURI.startsWith('openai:'))) {
    const geminiApiKey =
      settings.aiProvider === 'google' && settings.aiApiKey
        ? (settings.aiApiKey as string)
        : activeVoiceApiKey || activeAiApiKey;

    if (!geminiApiKey || !geminiApiKey.trim()) {
      fallbackError =
        'Cheie API Google Gemini necesară pentru vocile Gemini (adaugă cheia în Setări AI sau Cheie API Voci).';
    } else {
      try {
        const blob = await fetchGeminiTTSAudio(geminiApiKey, 'gemini-2.0-flash', targetURI, sampleText, langCode);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();

        const status: TTSPlaybackStatus = {
          engine: 'google',
          engineLabel: 'Google Gemini Speech',
          model: 'gemini-2.0-flash',
          voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
          isFallback: !!fallbackError,
          error: fallbackError,
          timestamp: Date.now(),
        };
        options?.onStatus?.(status);
        return status;
      } catch (err) {
        fallbackError = err instanceof Error ? err.message : String(err);
        logger.warn('Gemini TTS test failed:', fallbackError);
      }
    }
  }

  // 4. OpenAI AI voice
  if (targetURI.startsWith('openai:') || activeTtsModel === 'tts-1' || activeTtsModel === 'tts-1-hd') {
    const apiKey =
      settings.aiProvider === 'openai' && settings.aiApiKey
        ? (settings.aiApiKey as string)
        : activeVoiceApiKey || activeAiApiKey;

    if (!apiKey || !apiKey.trim()) {
      fallbackError =
        'Cheie API OpenAI necesară pentru vocile OpenAI Studio (adaugă cheia în Setări AI sau Cheie API Voci).';
    } else {
      try {
        const model = (activeTtsModel as 'tts-1' | 'tts-1-hd') || 'tts-1';
        const blob = await fetchOpenAITTSAudio(apiKey, model, targetURI, sampleText, speed);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();

        const status: TTSPlaybackStatus = {
          engine: 'openai',
          engineLabel: 'OpenAI Studio',
          model,
          voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
          isFallback: !!fallbackError,
          error: fallbackError,
          timestamp: Date.now(),
        };
        options?.onStatus?.(status);
        return status;
      } catch (err) {
        fallbackError = err instanceof Error ? err.message : String(err);
        logger.warn('OpenAI TTS test failed:', fallbackError);
      }
    }
  }

  // 4b. Groq AI voice
  if (targetURI.startsWith('groq:') || activeTtsModel === 'groq') {
    const apiKey =
      settings.voiceProvider === 'groq' && settings.voiceApiKey
        ? (settings.voiceApiKey as string)
        : activeVoiceApiKey ||
          (settings.aiProvider === 'groq' && settings.aiApiKey ? (settings.aiApiKey as string) : activeAiApiKey);

    if (!apiKey || !apiKey.trim()) {
      fallbackError = 'Cheie API Groq necesară pentru vocile Groq (adaugă cheia în Setări AI sau Cheie API Voci).';
    } else {
      try {
        const model = 'canopylabs/orpheus-v1-english';
        const blob = await fetchGroqTTSAudio(apiKey, model, targetURI, sampleText, speed);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();

        const status: TTSPlaybackStatus = {
          engine: 'groq' as any,
          engineLabel: 'Groq LPU TTS',
          model,
          voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
          isFallback: !!fallbackError,
          error: fallbackError,
          timestamp: Date.now(),
        };
        options?.onStatus?.(status);
        return status;
      } catch (err) {
        fallbackError = err instanceof Error ? err.message : String(err);
        logger.warn('Groq TTS test failed:', fallbackError);
      }
    }
  }

  // 4c. ElevenLabs voice
  const isElevenLabsModel =
    activeTtsModel === 'eleven-multilingual-v2' ||
    activeTtsModel === 'eleven-flash-v2-5' ||
    activeTtsModel === 'eleven-turbo-v2-5';

  if (targetURI.startsWith('elevenlabs:') || isElevenLabsModel) {
    const apiKey = activeElevenLabsApiKey?.trim() || '';

    if (!apiKey) {
      fallbackError =
        'Cheie API ElevenLabs lipsă. Te rugăm să adaugi cheia ta ElevenLabs în Setări (⚙️ -> Model Audio & Calitate -> Cheie API ElevenLabs).';
    } else {
      try {
        const model = activeTtsModel || 'eleven-multilingual-v2';
        const blob = await fetchElevenLabsTTSAudio(apiKey, model, targetURI, sampleText, speed);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();

        const status: TTSPlaybackStatus = {
          engine: 'elevenlabs',
          engineLabel: 'ElevenLabs TTS',
          model,
          voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
          isFallback: !!fallbackError,
          error: fallbackError,
          timestamp: Date.now(),
        };
        options?.onStatus?.(status);
        return status;
      } catch (err) {
        fallbackError = err instanceof Error ? err.message : String(err);
        logger.warn('ElevenLabs TTS test failed:', fallbackError);
      }
    }
  }

  // 5. Google Native & Cloud TTS
  const isGoogleModel =
    activeTtsModel === 'google' || activeTtsModel === 'google-journey' || activeTtsModel === 'google-neural2';

  if (isGoogleModel || (targetURI.startsWith('google:') && !isGeminiVoice)) {
    const apiKey =
      settings.aiProvider === 'google' && settings.aiApiKey
        ? (settings.aiApiKey as string)
        : activeVoiceApiKey || activeAiApiKey;
    try {
      const blob = await fetchGoogleTTSAudio(sampleText, langCode, targetURI, apiKey, speed);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();

      const status: TTSPlaybackStatus = {
        engine: 'google',
        engineLabel: isGoogleModel ? `Google Cloud (${activeTtsModel})` : 'Google Speech Nativ',
        voiceName: resolveVoiceDisplayName(targetURI, langCode, voice ? [voice] : []),
        isFallback: !!fallbackError,
        error: fallbackError,
        timestamp: Date.now(),
      };
      options?.onStatus?.(status);
      return status;
    } catch (err) {
      if (!fallbackError) {
        fallbackError = err instanceof Error ? err.message : String(err);
      }
      logger.warn('Google TTS test failed:', err);
    }
  }

  // Fallback to SpeechSynthesis
  if (!('speechSynthesis' in window)) {
    const status: TTSPlaybackStatus = {
      engine: 'browser',
      engineLabel: 'Browser Web Speech',
      voiceName: 'Indisponibil',
      isFallback: true,
      error: fallbackError || 'Sinteza vocală nu este suportată în acest browser',
      timestamp: Date.now(),
    };
    options?.onStatus?.(status);
    return status;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(sampleText);
  const sysVoices = window.speechSynthesis.getVoices();
  const exactVoice = voice || sysVoices.find((v) => v.voiceURI === targetURI);
  const langVoice = sysVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

  const voiceKey = targetURI.replace(/^(google|openai|omniroute):/, '').toLowerCase();
  const isMale =
    voiceKey.includes('charon') ||
    voiceKey.includes('fenrir') ||
    voiceKey.includes('puck') ||
    voiceKey.includes('journey-m') ||
    voiceKey.includes('studio-m') ||
    voiceKey.includes('echo') ||
    voiceKey.includes('onyx') ||
    voiceKey.includes('ash');

  const isFemale =
    voiceKey.includes('aoede') ||
    voiceKey.includes('kore') ||
    voiceKey.includes('journey-f') ||
    voiceKey.includes('studio-f') ||
    voiceKey.includes('nova') ||
    voiceKey.includes('shimmer') ||
    voiceKey.includes('coral') ||
    voiceKey.includes('sage');

  const genderMatched = sysVoices.find((v) => {
    if (!v.lang.toLowerCase().startsWith(langPrefix)) return false;
    const n = v.name.toLowerCase();
    if (isMale) return n.includes('male') || n.includes('andrei') || n.includes('george') || n.includes('david');
    if (isFemale) return n.includes('female') || n.includes('ioana') || n.includes('zira') || n.includes('alva');
    return false;
  });

  const chosenVoice = exactVoice || genderMatched || langVoice;

  if (chosenVoice) {
    utterance.voice = chosenVoice;
  }
  utterance.rate = speed;
  utterance.lang = langCode;
  if (isMale) {
    utterance.pitch = 0.82;
  } else if (isFemale) {
    utterance.pitch = 1.18;
  } else {
    utterance.pitch = 1.0;
  }
  window.speechSynthesis.speak(utterance);

  const status: TTSPlaybackStatus = {
    engine: 'browser',
    engineLabel: 'Browser Web Speech',
    voiceName: chosenVoice?.name || voice?.name || 'Sistem (Default)',
    isFallback: !!fallbackError,
    error: fallbackError,
    timestamp: Date.now(),
  };
  options?.onStatus?.(status);
  return status;
}

export function getStepSpeechText(step: Step): string {
  if (step.audioMuted) {
    return step.title?.trim() || step.description?.trim() || '';
  }
  return step.audioText?.trim() || step.narration?.trim() || step.title?.trim() || step.description?.trim() || '';
}

export function useTextToVoice({ steps, onStepChange }: TextToVoiceOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [speed, setSpeedState] = useState<number>(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsModel, setTtsModelState] = useState<TTSModelId>('browser');
  const [omnirouteTtsModel, setOmnirouteTtsModelState] = useState<string>('gemini-2.5-flash');
  const [omnirouteBaseUrl, setOmnirouteBaseUrlState] = useState<string>('');
  const [playbackStatus, setPlaybackStatus] = useState<TTSPlaybackStatus | null>(null);
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState<boolean>(false);

  // Default language based on current UI language
  const defaultLangCode = (() => {
    const uiLang = getUiLanguageOverride();
    const found = SUPPORTED_TTS_LANGUAGES.find((l) => l.langPrefix === uiLang);
    return found ? found.code : 'ro-RO';
  })();

  const [selectedLang, setSelectedLangState] = useState<string>(defaultLangCode);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string>('');

  const activeIndexRef = useRef<number | null>(null);
  activeIndexRef.current = activeStepIndex;

  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Load saved preferences from localStorage
  useEffect(() => {
    localStorage
      .get([
        'ttsVoiceURI',
        'ttsLanguage',
        'ttsSpeed',
        'ttsModel',
        'omnirouteTtsModel',
        'omnirouteBaseUrl',
        'elevenLabsApiKey',
      ])
      .then((res) => {
        const savedLang = (res.ttsLanguage as string) || defaultLangCode;
        setSelectedLangState(savedLang);

        if (res.ttsSpeed && typeof res.ttsSpeed === 'number') {
          setSpeedState(res.ttsSpeed);
        }
        if (res.ttsModel && typeof res.ttsModel === 'string') {
          setTtsModelState(res.ttsModel as TTSModelId);
        }
        if (res.omnirouteTtsModel && typeof res.omnirouteTtsModel === 'string') {
          setOmnirouteTtsModelState(res.omnirouteTtsModel);
        }
        if (res.omnirouteBaseUrl && typeof res.omnirouteBaseUrl === 'string') {
          setOmnirouteBaseUrlState(res.omnirouteBaseUrl);
        }
        if (typeof res.elevenLabsApiKey === 'string' && res.elevenLabsApiKey.trim().length > 0) {
          setHasElevenLabsKey(true);
        }

        const savedVoice = (res.ttsVoiceURI as string) || '';
        if (savedVoice) {
          setSelectedVoiceURIState(savedVoice);
        } else {
          setSelectedVoiceURIState(`google:${savedLang}`);
        }
      });
  }, [defaultLangCode]);

  // Live storage listener: sync settings across tabs/sidepanel/options instantly
  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.storage?.onChanged) return;
    const handleStorageChange = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName !== 'local') return;
      if (typeof changes.ttsLanguage?.newValue === 'string') {
        setSelectedLangState(changes.ttsLanguage.newValue);
      }
      if (typeof changes.ttsVoiceURI?.newValue === 'string') {
        setSelectedVoiceURIState(changes.ttsVoiceURI.newValue);
      }
      if (typeof changes.ttsSpeed?.newValue === 'number') {
        setSpeedState(changes.ttsSpeed.newValue);
      }
      if (typeof changes.ttsModel?.newValue === 'string') {
        setTtsModelState(changes.ttsModel.newValue as TTSModelId);
      }
      if (typeof changes.omnirouteTtsModel?.newValue === 'string') {
        setOmnirouteTtsModelState(changes.omnirouteTtsModel.newValue);
      }
      if (typeof changes.omnirouteBaseUrl?.newValue === 'string') {
        setOmnirouteBaseUrlState(changes.omnirouteBaseUrl.newValue);
      }
      if ('elevenLabsApiKey' in changes) {
        const v = changes.elevenLabsApiKey?.newValue;
        setHasElevenLabsKey(Boolean(typeof v === 'string' && v.trim().length > 0));
      }
    };
    browser.storage.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const setSelectedVoiceURI = useCallback((uri: string) => {
    setSelectedVoiceURIState(uri);
    void localStorage.set({ ttsVoiceURI: uri });
  }, []);

  const setSelectedLang = useCallback(
    (lang: string) => {
      setSelectedLangState(lang);
      void localStorage.set({ ttsLanguage: lang });

      const langPrefix = lang.split('-')[0].toLowerCase();
      const currentMatches =
        selectedVoiceURI.startsWith('openai:') ||
        selectedVoiceURI.startsWith('omniroute:') ||
        (selectedVoiceURI.startsWith('google:') && selectedVoiceURI.includes(langPrefix)) ||
        voices.some((v) => v.voiceURI === selectedVoiceURI && v.lang.toLowerCase().startsWith(langPrefix));

      if (!currentMatches) {
        const matchingSysVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        const newVoice = matchingSysVoice ? matchingSysVoice.voiceURI : `google:${lang}`;
        setSelectedVoiceURIState(newVoice);
        void localStorage.set({ ttsVoiceURI: newVoice });
      }
    },
    [voices, selectedVoiceURI],
  );

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    void localStorage.set({ ttsSpeed: s });
  }, []);

  const setTtsModel = useCallback((model: TTSModelId) => {
    setTtsModelState(model);
    void localStorage.set({ ttsModel: model });
  }, []);

  // Load voices when available and poll briefly to catch asynchronous loading
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const timer = setInterval(loadVoices, 300);
    const stopTimer = setTimeout(() => clearInterval(timer), 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(stopTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filter voices for currently selected language
  const filteredVoices = voices.filter((v) => {
    const langPrefix = selectedLang.split('-')[0].toLowerCase();
    return v.lang.toLowerCase().startsWith(langPrefix);
  });

  const googleVoice = getGoogleTTSVoiceInfo(selectedLang);

  const playBlobAudio = (blob: Blob, onEnd?: () => void): Promise<void> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audioElementRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        onEnd?.();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioUrlRef.current = null;
        onEnd?.();
      };

      setIsPlaying(true);
      setIsPaused(false);
      audio.play().then(resolve).catch(resolve);
    });
  };

  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveStepIndex(null);
    setPlaybackStatus(null);
    currentUtteranceRef.current = null;
  }, []);

  const speakStepAt = useCallback(
    async (index: number) => {
      if (index < 0 || index >= steps.length) {
        stop();
        return;
      }

      // Cleanup prior playback
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const step = steps[index];
      setActiveStepIndex(index);
      onStepChange?.(step.id, index);

      const textToSpeak = getStepSpeechText(step);

      if (!textToSpeak.trim()) {
        void speakStepAt(index + 1);
        return;
      }

      // 1. Direct Browser Web Speech (User deliberately selected local system voice engine)
      if (ttsModel === 'browser') {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const langPrefix = selectedLang.split('-')[0].toLowerCase();
        const matchingSystemVoice =
          voices.find((v) => v.voiceURI === selectedVoiceURI) ||
          voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) ||
          filteredVoices[0];

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = speed;
        utterance.lang = selectedLang;
        if (matchingSystemVoice) {
          utterance.voice = matchingSystemVoice;
        }

        setPlaybackStatus({
          engine: 'browser',
          engineLabel: 'Browser Web Speech',
          voiceName: matchingSystemVoice?.name || 'Sistem (Default)',
          isFallback: false,
          timestamp: Date.now(),
        });

        utterance.onend = () => {
          if (isPlayingRef.current) {
            void speakStepAt(index + 1);
          }
        };

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            if (isPlayingRef.current) {
              void speakStepAt(index + 1);
            }
          }
        };

        currentUtteranceRef.current = utterance;
        setIsPlaying(true);
        setIsPaused(false);
        window.speechSynthesis.speak(utterance);
        return;
      }

      let fallbackError: string | undefined;

      try {
        const audioRes = await getOrSynthesizeStepAudio(step, {
          ttsModel,
          selectedVoiceURI,
          selectedLang,
          speed,
          omnirouteBaseUrl,
          omnirouteTtsModel,
        });

        if (audioRes) {
          const engineLabel =
            audioRes.engine === 'elevenlabs'
              ? 'ElevenLabs TTS'
              : audioRes.engine === 'omniroute'
                ? ttsModel === 'omniroute-gemini'
                  ? 'Google Gemini (OmniRoute)'
                  : 'OmniRoute Speech'
                : audioRes.engine === 'openai'
                  ? 'OpenAI Studio'
                  : audioRes.engine === 'groq'
                    ? 'Groq LPU TTS'
                    : audioRes.model?.includes('gemini')
                      ? 'Google Gemini Speech'
                      : 'Google Cloud Speech';

          setPlaybackStatus({
            engine: audioRes.engine as any,
            engineLabel,
            model: audioRes.model,
            voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
            isFallback: false,
            timestamp: Date.now(),
          });

          await playBlobAudio(audioRes.blob, () => {
            if (isPlayingRef.current) void speakStepAt(index + 1);
          });
          return;
        }
      } catch (err) {
        fallbackError = err instanceof Error ? err.message : String(err);
        logger.warn('Step TTS synthesis failed, trying fallback:', fallbackError);
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      const langPrefix = selectedLang.split('-')[0].toLowerCase();
      const exactVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      const langVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

      const voiceKey = selectedVoiceURI.replace(/^(google|openai|omniroute):/, '').toLowerCase();
      const isMale =
        voiceKey.includes('charon') ||
        voiceKey.includes('fenrir') ||
        voiceKey.includes('puck') ||
        voiceKey.includes('journey-m') ||
        voiceKey.includes('studio-m') ||
        voiceKey.includes('echo') ||
        voiceKey.includes('onyx') ||
        voiceKey.includes('ash');

      const isFemale =
        voiceKey.includes('aoede') ||
        voiceKey.includes('kore') ||
        voiceKey.includes('journey-f') ||
        voiceKey.includes('studio-f') ||
        voiceKey.includes('nova') ||
        voiceKey.includes('shimmer') ||
        voiceKey.includes('coral') ||
        voiceKey.includes('sage');

      const genderMatched = voices.find((v) => {
        if (!v.lang.toLowerCase().startsWith(langPrefix)) return false;
        const n = v.name.toLowerCase();
        if (isMale) return n.includes('male') || n.includes('andrei') || n.includes('george') || n.includes('david');
        if (isFemale) return n.includes('female') || n.includes('ioana') || n.includes('zira') || n.includes('alva');
        return false;
      });

      const matchingSystemVoice = exactVoice || genderMatched || filteredVoices[0] || langVoice;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = speed;
      utterance.lang = selectedLang;
      if (isMale) {
        utterance.pitch = 0.82;
      } else if (isFemale) {
        utterance.pitch = 1.18;
      } else {
        utterance.pitch = 1.0;
      }

      if (matchingSystemVoice) {
        utterance.voice = matchingSystemVoice;
      }

      setPlaybackStatus({
        engine: 'browser',
        engineLabel: 'Browser Web Speech',
        voiceName: matchingSystemVoice?.name || 'Sistem (Default)',
        isFallback: !!fallbackError,
        error: fallbackError,
        timestamp: Date.now(),
      });

      utterance.onend = () => {
        if (isPlayingRef.current) {
          void speakStepAt(index + 1);
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          if (isPlayingRef.current) {
            void speakStepAt(index + 1);
          }
        }
      };

      currentUtteranceRef.current = utterance;
      setIsPlaying(true);
      setIsPaused(false);
      window.speechSynthesis.speak(utterance);
    },
    [
      steps,
      speed,
      selectedLang,
      selectedVoiceURI,
      voices,
      filteredVoices,
      ttsModel,
      omnirouteBaseUrl,
      omnirouteTtsModel,
      onStepChange,
      stop,
    ],
  );

  const play = useCallback(
    (startIndex?: number) => {
      const start = startIndex ?? activeIndexRef.current ?? 0;
      setIsPlaying(true);
      setIsPaused(false);
      void speakStepAt(start);
    },
    [speakStepAt],
  );

  const pause = useCallback(() => {
    if (audioElementRef.current && !audioElementRef.current.paused) {
      audioElementRef.current.pause();
      setIsPaused(true);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioElementRef.current && audioElementRef.current.paused) {
      audioElementRef.current.play().catch(() => {});
      setIsPaused(false);
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const next = useCallback(() => {
    const curr = activeIndexRef.current ?? -1;
    if (curr + 1 < steps.length) {
      void speakStepAt(curr + 1);
    } else {
      stop();
    }
  }, [steps.length, speakStepAt, stop]);

  const prev = useCallback(() => {
    const curr = activeIndexRef.current ?? 1;
    if (curr > 0) {
      void speakStepAt(curr - 1);
    } else {
      void speakStepAt(0);
    }
  }, [speakStepAt]);

  const speakSingleStep = useCallback(
    async (step: Step) => {
      const textToSpeak = getStepSpeechText(step);
      if (!textToSpeak.trim()) return;

      let fallbackError: string | undefined;

      // 1. OmniRoute / OpenAI Voice
      if (ttsModel === 'omniroute' || ttsModel === 'omniroute-gemini' || selectedVoiceURI.startsWith('omniroute:')) {
        const settings = await localStorage.get(['aiApiKey', 'voiceApiKey', 'omnirouteBaseUrl', 'omnirouteTtsModel']);
        const baseUrl = (settings.omnirouteBaseUrl as string) || omnirouteBaseUrl || undefined;
        const apiKey = (settings.voiceApiKey as string) || (settings.aiApiKey as string) || '';
        const resolvedModel =
          (settings.omnirouteTtsModel as string) ||
          omnirouteTtsModel ||
          (ttsModel === 'omniroute-gemini' ? 'gemini-2.5-flash' : 'tts-1');
        try {
          const blob = await fetchOmniRouteTTSAudio(
            baseUrl,
            apiKey,
            resolvedModel,
            selectedVoiceURI,
            textToSpeak,
            speed,
          );
          setPlaybackStatus({
            engine: 'omniroute',
            engineLabel: ttsModel === 'omniroute-gemini' ? 'Google Gemini (OmniRoute)' : 'OmniRoute Speech',
            model: resolvedModel,
            voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
            isFallback: false,
            timestamp: Date.now(),
          });
          await playBlobAudio(blob);
          return;
        } catch (err) {
          fallbackError = err instanceof Error ? err.message : String(err);
          logger.warn('OmniRoute single-step playback failed, falling back:', err);
        }
      } else if (selectedVoiceURI.startsWith('openai:') || ttsModel === 'tts-1' || ttsModel === 'tts-1-hd') {
        const settings = await localStorage.get(['aiApiKey', 'voiceApiKey', 'aiProvider', 'ttsModel']);
        const apiKey =
          settings.aiProvider === 'openai' && settings.aiApiKey
            ? (settings.aiApiKey as string)
            : (settings.voiceApiKey as string) || (settings.aiApiKey as string);

        if (apiKey) {
          try {
            const model = (settings.ttsModel as 'tts-1' | 'tts-1-hd') || (ttsModel as 'tts-1' | 'tts-1-hd') || 'tts-1';
            const blob = await fetchOpenAITTSAudio(apiKey, model, selectedVoiceURI, textToSpeak, speed);
            setPlaybackStatus({
              engine: 'openai',
              engineLabel: 'OpenAI Studio',
              model,
              voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
              isFallback: !!fallbackError,
              error: fallbackError,
              timestamp: Date.now(),
            });
            await playBlobAudio(blob);
            return;
          } catch (err) {
            if (!fallbackError) {
              fallbackError = err instanceof Error ? err.message : String(err);
            }
            logger.warn('OpenAI single-step playback failed, falling back:', err);
          }
        }
      } else if (selectedVoiceURI.startsWith('groq:') || ttsModel === 'groq') {
        const settings = await localStorage.get(['aiApiKey', 'voiceApiKey', 'aiProvider', 'ttsModel']);
        const apiKey =
          settings.aiProvider === 'groq' && settings.aiApiKey
            ? (settings.aiApiKey as string)
            : (settings.voiceApiKey as string) || (settings.aiApiKey as string);

        if (apiKey) {
          try {
            const model = 'canopylabs/orpheus-v1-english';
            const blob = await fetchGroqTTSAudio(apiKey, model, selectedVoiceURI, textToSpeak, speed);
            setPlaybackStatus({
              engine: 'groq' as any,
              engineLabel: 'Groq LPU TTS',
              model,
              voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
              isFallback: !!fallbackError,
              error: fallbackError,
              timestamp: Date.now(),
            });
            await playBlobAudio(blob);
            return;
          } catch (err) {
            if (!fallbackError) {
              fallbackError = err instanceof Error ? err.message : String(err);
            }
            logger.warn('Groq single-step playback failed, falling back:', err);
          }
        }
      } else if (
        selectedVoiceURI.startsWith('elevenlabs:') ||
        ttsModel === 'eleven-multilingual-v2' ||
        ttsModel === 'eleven-flash-v2-5' ||
        ttsModel === 'eleven-turbo-v2-5'
      ) {
        const settings = await localStorage.get(['elevenLabsApiKey', 'ttsModel']);
        const apiKey = (settings.elevenLabsApiKey as string)?.trim() || '';

        if (apiKey) {
          try {
            const model = ttsModel || 'eleven-multilingual-v2';
            const blob = await fetchElevenLabsTTSAudio(apiKey, model, selectedVoiceURI, textToSpeak, speed);
            setPlaybackStatus({
              engine: 'elevenlabs',
              engineLabel: 'ElevenLabs TTS',
              model,
              voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
              isFallback: !!fallbackError,
              error: fallbackError,
              timestamp: Date.now(),
            });
            await playBlobAudio(blob);
            return;
          } catch (err) {
            if (!fallbackError) {
              fallbackError = err instanceof Error ? err.message : String(err);
            }
            logger.warn('ElevenLabs single-step playback failed, falling back:', err);
          }
        } else {
          fallbackError =
            'Cheie API ElevenLabs lipsă. Te rugăm să adaugi cheia ta ElevenLabs în Setări (⚙️ -> Model Audio & Calitate -> Cheie API ElevenLabs).';
        }
      }

      // 2. Google Native Voice or automatic fallback when no system voice matches the language
      const langPrefix = selectedLang.split('-')[0].toLowerCase();
      const matchingSystemVoice =
        voices.find((v) => v.voiceURI === selectedVoiceURI && v.lang.toLowerCase().startsWith(langPrefix)) ||
        filteredVoices[0] ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));

      const shouldUseGoogle =
        selectedVoiceURI.startsWith('google:') ||
        selectedVoiceURI === 'google' ||
        ttsModel === 'google' ||
        ttsModel === 'google-journey' ||
        ttsModel === 'google-neural2' ||
        ttsModel === 'gemini-live' ||
        !matchingSystemVoice;

      if (shouldUseGoogle) {
        try {
          const blob = await fetchGoogleTTSAudio(textToSpeak, selectedLang);
          setPlaybackStatus({
            engine: 'google',
            engineLabel:
              ttsModel.startsWith('google') || ttsModel === 'gemini-live'
                ? `Google Cloud (${ttsModel})`
                : 'Google Speech Nativ',
            voiceName: resolveVoiceDisplayName(selectedVoiceURI, selectedLang, voices),
            isFallback: !!fallbackError,
            error: fallbackError,
            timestamp: Date.now(),
          });
          await playBlobAudio(blob);
          return;
        } catch (err) {
          if (!fallbackError) {
            fallbackError = err instanceof Error ? err.message : String(err);
          }
          logger.warn('Google TTS single-step playback failed, falling back:', err);
        }
      }

      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = speed;
      utterance.lang = selectedLang;

      if (matchingSystemVoice) {
        utterance.voice = matchingSystemVoice;
      }

      setPlaybackStatus({
        engine: 'browser',
        engineLabel: 'Browser Web Speech',
        voiceName: matchingSystemVoice?.name || 'Sistem (Default)',
        isFallback: !!fallbackError,
        error: fallbackError,
        timestamp: Date.now(),
      });

      window.speechSynthesis.speak(utterance);
    },
    [speed, selectedLang, selectedVoiceURI, voices, filteredVoices, ttsModel, omnirouteBaseUrl, omnirouteTtsModel],
  );

  return {
    isPlaying,
    isPaused,
    activeStepIndex,
    activeStepId: activeStepIndex !== null && steps[activeStepIndex] ? steps[activeStepIndex].id : null,
    speed,
    setSpeed,
    selectedLang,
    setSelectedLang,
    selectedVoiceURI,
    setSelectedVoiceURI,
    ttsModel,
    setTtsModel,
    omnirouteTtsModel,
    setOmnirouteTtsModel: (model: string) => {
      setOmnirouteTtsModelState(model);
      void localStorage.set({ omnirouteTtsModel: model });
    },
    playbackStatus,
    allVoices: voices,
    filteredVoices,
    googleVoice,
    googleVoices: GOOGLE_TTS_VOICES,
    aiVoices: OPENAI_TTS_VOICES,
    groqVoices: GROQ_TTS_VOICES,
    elevenLabsVoices: ELEVENLABS_TTS_VOICES,
    hasElevenLabsKey,
    play,
    pause,
    resume,
    stop,
    next,
    prev,
    speakSingleStep,
  };
}
