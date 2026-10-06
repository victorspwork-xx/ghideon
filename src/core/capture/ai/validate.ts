import { logger } from '@/lib/logger';
import { DEFAULT_OMNIROUTE_BASE_URL } from './models';

export type KeyValidation = { valid: true } | { valid: false; reason: 'rejected' | 'network' };

const REQUEST_TIMEOUT_MS = 10_000;

const ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string> }> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    headers: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  deepseek: {
    url: 'https://api.deepseek.com/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

export async function validateApiKey(provider: string, apiKey: string, baseUrl?: string): Promise<KeyValidation> {
  if (provider === 'omniroute') {
    const effectiveBaseUrl = (baseUrl || DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, '');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey && apiKey.trim() ? apiKey.trim() : 'omniroute'}`,
    };
    try {
      const res = await fetch(`${effectiveBaseUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return { valid: true };
      if (res.status === 401 || res.status === 403) return { valid: false, reason: 'rejected' };
      return { valid: false, reason: 'network' };
    } catch (err) {
      logger.error('OmniRoute validation request failed', err);
      return { valid: false, reason: 'network' };
    }
  }

  if (provider === 'google') {
    if (!apiKey || !apiKey.trim()) return { valid: false, reason: 'rejected' };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`,
        {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (res.ok) return { valid: true };
      if (res.status === 400 || res.status === 401 || res.status === 403) return { valid: false, reason: 'rejected' };
      return { valid: false, reason: 'network' };
    } catch (err) {
      logger.error('Google validation request failed', err);
      return { valid: false, reason: 'network' };
    }
  }

  const endpoint = ENDPOINTS[provider];
  if (!endpoint) {
    logger.error('No API key validation endpoint for provider', provider);
    return { valid: false, reason: 'network' };
  }
  try {
    const res = await fetch(endpoint.url, {
      headers: endpoint.headers(apiKey),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) return { valid: true };
    if (res.status === 401 || res.status === 403) return { valid: false, reason: 'rejected' };
    return { valid: false, reason: 'network' };
  } catch (err) {
    logger.error('API key validation request failed', err);
    return { valid: false, reason: 'network' };
  }
}

export interface DiscoveredModel {
  id: string;
  label: string;
  tier: 'simple' | 'advanced';
  description?: string;
  isAudio?: boolean;
  isTts?: boolean;
}

export async function fetchOmniRouteModels(baseUrl?: string, apiKey?: string): Promise<DiscoveredModel[]> {
  const effectiveBaseUrl = (baseUrl || DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey && apiKey.trim() ? apiKey.trim() : 'omniroute'}`,
  };

  try {
    const res = await fetch(`${effectiveBaseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
    if (!Array.isArray(body?.data)) return [];

    return body.data
      .filter((m) => m && typeof m.id === 'string' && m.id.trim())
      .map((m) => {
        const id = m.id.trim();
        const lower = id.toLowerCase();
        let tier: 'simple' | 'advanced' = 'simple';
        if (
          lower.includes('pro') ||
          lower.includes('r1') ||
          lower.includes('reason') ||
          lower.includes('sonnet') ||
          lower.includes('opus') ||
          lower.includes('o1') ||
          lower.includes('o3') ||
          lower.includes('70b')
        ) {
          tier = 'advanced';
        }

        const isAudio =
          lower.includes('whisper') ||
          lower.includes('audio') ||
          lower.includes('speech') ||
          lower.includes('transcri') ||
          lower.includes('stt') ||
          lower.includes('chirp') ||
          lower.includes('gemini') ||
          lower.includes('antigravity');

        const isTts =
          lower.includes('tts') ||
          lower.includes('speech') ||
          lower.includes('voice') ||
          lower.includes('eleven') ||
          lower.includes('gemini') ||
          lower.includes('journey');

        let label = m.name || id;
        if (lower.includes('gemini')) {
          label = `Gemini: ${id} (${tier === 'advanced' ? '🧠 Avansat' : '⚡ Rapid'})`;
        } else if (lower.includes('antigravity')) {
          label = `Antigravity: ${id} (${tier === 'advanced' ? '🧠 Avansat' : '⚡ Rapid'})`;
        } else if (lower.includes('whisper')) {
          label = `Whisper Audio: ${id}`;
        } else if (lower.includes('claude')) {
          label = `Claude: ${id}`;
        } else if (lower.includes('gpt') || lower.includes('o1') || lower.includes('o3')) {
          label = `OpenAI: ${id}`;
        }

        return {
          id,
          label,
          tier,
          isAudio,
          isTts,
        };
      });
  } catch (err) {
    logger.warn('Failed to fetch models from OmniRoute', err);
    return [];
  }
}
