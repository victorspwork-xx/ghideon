import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAudioMemoryCache,
  computeAudioCacheKey,
  getCachedStepAudio,
  getOrSynthesizeStepAudio,
  setCachedStepAudio,
} from '@/core/capture/voice/step-tts';
import type { Step } from '@/core/guides/types';

const mockDbStore = new Map<string, unknown>();
vi.mock('@/core/guides/db', () => ({
  db: {
    audioCache: {
      get: vi.fn(async (key: string) => mockDbStore.get(key)),
      put: vi.fn(async (item: { id: string }) => mockDbStore.set(item.id, item)),
    },
  },
}));

vi.mock('@/lib/browser-api', () => ({
  localStorage: {
    get: vi.fn(async () => ({
      ttsModel: 'eleven-multilingual-v2',
      ttsVoiceURI: 'elevenlabs:voice-1',
      ttsLanguage: 'ro-RO',
      ttsSpeed: 1.0,
      elevenLabsApiKey: 'test-eleven-key',
    })),
  },
}));

const mockFetchElevenLabsTTSAudio = vi.fn();
vi.mock('@/core/capture/voice/tts-voices', () => ({
  fetchElevenLabsTTSAudio: (...args: unknown[]) => mockFetchElevenLabsTTSAudio(...args),
  fetchGeminiTTSAudio: vi.fn(),
  fetchGoogleTTSAudio: vi.fn(),
  fetchGroqTTSAudio: vi.fn(),
  fetchOmniRouteTTSAudio: vi.fn(),
  fetchOpenAITTSAudio: vi.fn(),
}));

const step: Step = {
  id: 'step-abc',
  guideId: 'guide-1',
  index: 0,
  action: 'click',
  title: 'Click Settings',
  description: 'Apasă pe butonul de Setări',
  url: 'https://example.com',
  timestamp: Date.now(),
};

describe('step-tts unified audio caching and synthesis', () => {
  beforeEach(() => {
    clearAudioMemoryCache();
    mockDbStore.clear();
    mockFetchElevenLabsTTSAudio.mockReset();
  });

  it('computes deterministic audio cache key', () => {
    const key1 = computeAudioCacheKey('step-1', 'Apasă butonul', 'voice-1', 'model-1', 1.0, 'ro-RO');
    const key2 = computeAudioCacheKey('step-1', 'Apasă butonul', 'voice-1', 'model-1', 1.0, 'ro-RO');
    const keyDiff = computeAudioCacheKey('step-1', 'Alt text', 'voice-1', 'model-1', 1.0, 'ro-RO');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDiff);
    expect(key1.startsWith('step-1_')).toBe(true);
  });

  it('caches synthesized audio and reuses it on subsequent calls', async () => {
    const fakeBlob = new Blob(['sample-audio-bytes'], { type: 'audio/mpeg' });
    mockFetchElevenLabsTTSAudio.mockResolvedValue(fakeBlob);

    // 1st call: synthesis required
    const res1 = await getOrSynthesizeStepAudio(step);
    expect(res1).not.toBeNull();
    expect(res1?.fromCache).toBe(false);
    expect(mockFetchElevenLabsTTSAudio).toHaveBeenCalledTimes(1);

    // 2nd call: served from memory cache immediately, 0 API calls
    const res2 = await getOrSynthesizeStepAudio(step);
    expect(res2).not.toBeNull();
    expect(res2?.fromCache).toBe(true);
    expect(mockFetchElevenLabsTTSAudio).toHaveBeenCalledTimes(1); // Still 1, NOT 2!
  });

  it('forceRefresh bypasses cache and re-synthesizes audio', async () => {
    const fakeBlob1 = new Blob(['sample-audio-bytes-1'], { type: 'audio/mpeg' });
    const fakeBlob2 = new Blob(['sample-audio-bytes-2'], { type: 'audio/mpeg' });
    mockFetchElevenLabsTTSAudio.mockResolvedValueOnce(fakeBlob1).mockResolvedValueOnce(fakeBlob2);

    const res1 = await getOrSynthesizeStepAudio(step);
    expect(res1?.fromCache).toBe(false);

    const res2 = await getOrSynthesizeStepAudio(step, { forceRefresh: true });
    expect(res2?.fromCache).toBe(false);
    expect(mockFetchElevenLabsTTSAudio).toHaveBeenCalledTimes(2);
  });

  it('setCachedStepAudio and getCachedStepAudio directly interact with cache', async () => {
    const blob = new Blob(['manual-audio'], { type: 'audio/mp3' });
    await setCachedStepAudio(
      'step-direct',
      'Direct text',
      'v1',
      'm1',
      1.0,
      'ro-RO',
      blob,
      3.5,
      'elevenlabs',
      'Ghideon',
    );

    const cached = await getCachedStepAudio('step-direct', 'Direct text', 'v1', 'm1', 1.0, 'ro-RO');
    expect(cached).not.toBeNull();
    expect(cached?.stepId).toBe('step-direct');
    expect(cached?.duration).toBe(3.5);
    expect(cached?.engine).toBe('elevenlabs');
    expect(cached?.voiceName).toBe('Ghideon');
  });
});
