import type { VoiceProvider } from './transcribe';

export const VOICE_KEY_SETTINGS = ['voiceProvider', 'voiceApiKey', 'aiProvider', 'aiApiKey'] as const;

export interface VoiceKeySettings {
  voiceProvider?: unknown;
  voiceApiKey?: unknown;
  aiProvider?: unknown;
  aiApiKey?: unknown;
}

export type VoiceApiKeySource = 'voice' | 'ai' | 'none';

export interface ResolvedVoiceApiKey {
  provider: VoiceProvider;
  apiKey: string;
  source: VoiceApiKeySource;
}

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeVoiceProvider(value: unknown): VoiceProvider {
  if (value === 'groq') return 'groq';
  if (value === 'deepseek') return 'deepseek';
  if (value === 'omniroute') return 'omniroute';
  if (value === 'google') return 'google';
  if (value === 'web-speech') return 'web-speech';
  return 'openai';
}

export function resolveVoiceApiKey(settings: VoiceKeySettings): ResolvedVoiceApiKey {
  const provider = normalizeVoiceProvider(settings.voiceProvider);
  if (provider === 'web-speech') {
    return { provider: 'web-speech', apiKey: 'browser-native', source: 'voice' };
  }
  if (provider === 'google') {
    const own = trimmed(settings.voiceApiKey);
    if (own) return { provider, apiKey: own, source: 'voice' };
    const shared = trimmed(settings.aiApiKey);
    const aiProvider = trimmed(settings.aiProvider);
    if ((aiProvider === 'google' || aiProvider === 'gemini') && shared) {
      return { provider, apiKey: shared, source: 'ai' };
    }
    return { provider, apiKey: shared || 'google-native', source: shared ? 'ai' : 'voice' };
  }
  if (provider === 'omniroute') {
    const own = trimmed(settings.voiceApiKey);
    if (own) return { provider, apiKey: own, source: 'voice' };
    const shared = trimmed(settings.aiApiKey);
    const aiProvider = trimmed(settings.aiProvider);
    if (aiProvider === 'omniroute' && shared) {
      return { provider, apiKey: shared, source: 'ai' };
    }
    // OmniRoute local gateway does not strictly require an API key
    return { provider, apiKey: 'omniroute', source: 'voice' };
  }
  const own = trimmed(settings.voiceApiKey);
  if (own) return { provider, apiKey: own, source: 'voice' };

  const shared = trimmed(settings.aiApiKey);
  const aiProvider = trimmed(settings.aiProvider) || 'openai';
  if (
    (provider === 'openai' && aiProvider === 'openai' && shared) ||
    (provider === 'deepseek' && aiProvider === 'deepseek' && shared) ||
    (provider === 'groq' && aiProvider === 'groq' && shared)
  ) {
    return { provider, apiKey: shared, source: 'ai' };
  }

  return { provider, apiKey: '', source: 'none' };
}

export function hasVoiceApiKey(settings: VoiceKeySettings): boolean {
  const provider = normalizeVoiceProvider(settings.voiceProvider);
  if (provider === 'web-speech' || provider === 'deepseek' || provider === 'omniroute' || provider === 'google')
    return true;
  return resolveVoiceApiKey(settings).apiKey.length > 0;
}
