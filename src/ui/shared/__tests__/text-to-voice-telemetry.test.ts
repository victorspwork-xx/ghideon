// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { resolveVoiceDisplayName, type TTSPlaybackStatus, testSpeakVoice } from '../useTextToVoice';

vi.mock('@/lib/browser-api', () => ({
  localStorage: {
    get: vi.fn().mockResolvedValue({
      ttsModel: 'browser',
      ttsVoiceURI: 'google:ro-RO',
      ttsLanguage: 'ro-RO',
      ttsSpeed: 1,
    }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/core/capture/voice/tts-voices', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/capture/voice/tts-voices')>();
  return {
    ...actual,
    fetchOmniRouteTTSAudio: vi.fn(),
    fetchGeminiTTSAudio: vi.fn(),
    fetchGoogleTTSAudio: vi.fn(),
    fetchOpenAITTSAudio: vi.fn(),
  };
});

describe('useTextToVoice Telemetry & Voice Resolution', () => {
  it('resolves voice display name for Google, Gemini, OpenAI, ElevenLabs and system voices', () => {
    expect(resolveVoiceDisplayName('google:aoede', 'ro-RO')).toContain('Aoede');
    expect(resolveVoiceDisplayName('google:ro-RO', 'ro-RO')).toContain('Română');
    expect(resolveVoiceDisplayName('openai:alloy', 'en-US')).toBe('OpenAI Alloy');
    expect(resolveVoiceDisplayName('elevenlabs:serban', 'ro-RO')).toContain('Șerban');
    expect(resolveVoiceDisplayName('elevenlabs:8nBBDfYxYXmDNaqTCxPH', 'ro-RO')).toContain('Șerban');
    expect(resolveVoiceDisplayName('https://elevenlabs.io/voices/8nBBDfYxYXmDNaqTCxPH', 'ro-RO')).toContain('Șerban');

    const mockVoices = [{ name: 'Ioana', voiceURI: 'ioana-system', lang: 'ro-RO' } as SpeechSynthesisVoice];
    expect(resolveVoiceDisplayName('ioana-system', 'ro-RO', mockVoices)).toBe('Ioana');
  });

  it('testSpeakVoice uses browser Web Speech directly with isFallback: false', async () => {
    const speakMock = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      speak: speakMock,
      cancel: vi.fn(),
      getVoices: () => [{ name: 'Ioana', voiceURI: 'ioana-system', lang: 'ro-RO' }],
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text = '';
        rate = 1;
        lang = '';
        voice = null;
        constructor(t: string) {
          this.text = t;
        }
      },
    );

    const status = await testSpeakVoice(undefined, 'ioana-system', 'ro-RO', 1.0, {
      ttsModel: 'browser',
    });

    expect(status?.engine).toBe('browser');
    expect(status?.isFallback).toBe(false);
    expect(status?.error).toBeUndefined();
    expect(speakMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('testSpeakVoice reports active parameters via onStatus callback on success', async () => {
    const { fetchOmniRouteTTSAudio } = await import('@/core/capture/voice/tts-voices');
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    vi.mocked(fetchOmniRouteTTSAudio).mockResolvedValueOnce(mockBlob);

    class MockAudio {
      playbackRate = 1;
      play() {
        return Promise.resolve();
      }
      onended: (() => void) | null = null;
    }
    vi.stubGlobal('Audio', MockAudio);
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();

    const statusUpdates: TTSPlaybackStatus[] = [];
    const status = await testSpeakVoice(undefined, 'google:aoede', 'ro-RO', 1.25, {
      ttsModel: 'omniroute-gemini',
      omnirouteTtsModel: 'gemini-2.5-flash',
      omnirouteBaseUrl: 'http://localhost:20128/v1',
      apiKey: 'test-key',
      onStatus: (st) => statusUpdates.push(st),
    });

    expect(status?.engine).toBe('omniroute');
    expect(status?.model).toBe('gemini-2.5-flash');
    expect(status?.isFallback).toBe(false);
    expect(statusUpdates.length).toBe(1);
    expect(statusUpdates[0].engine).toBe('omniroute');

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.unstubAllGlobals();
  });

  it('testSpeakVoice notifies fallback on failure without crashing', async () => {
    const { fetchOmniRouteTTSAudio, fetchGoogleTTSAudio } = await import('@/core/capture/voice/tts-voices');
    vi.mocked(fetchOmniRouteTTSAudio).mockRejectedValueOnce(new Error('Connection refused'));

    const mockBlob = new Blob(['mock-google-audio'], { type: 'audio/mpeg' });
    vi.mocked(fetchGoogleTTSAudio).mockResolvedValueOnce(mockBlob);

    class MockAudio {
      playbackRate = 1;
      play() {
        return Promise.resolve();
      }
      onended: (() => void) | null = null;
    }
    vi.stubGlobal('Audio', MockAudio);
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();

    const statusUpdates: TTSPlaybackStatus[] = [];
    const status = await testSpeakVoice(undefined, 'google:ro-RO', 'ro-RO', 1.0, {
      ttsModel: 'omniroute-gemini',
      omnirouteTtsModel: 'gemini-2.5-flash',
      apiKey: 'test-key',
      onStatus: (st) => statusUpdates.push(st),
    });

    // Should have fallen back to Google Native speech and recorded the error!
    expect(status?.isFallback).toBe(true);
    expect(status?.error).toContain('Connection refused');
    expect(status?.engine).toBe('google');

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    vi.unstubAllGlobals();
  });

  it('isVoiceAvailableForModel correctly restricts voices per TTS model', async () => {
    const { isVoiceAvailableForModel } = await import('@/core/capture/voice/tts-voices');

    // browser: only system voices (no google:, no openai:, no omniroute:)
    expect(isVoiceAvailableForModel('com.apple.speech.synthesis.voice.Ioana', 'browser')).toBe(true);
    expect(isVoiceAvailableForModel('google:ro-RO', 'browser')).toBe(false);
    expect(isVoiceAvailableForModel('openai:alloy', 'browser')).toBe(false);

    // tts-1 and tts-1-hd: only OpenAI voices
    expect(isVoiceAvailableForModel('openai:alloy', 'tts-1')).toBe(true);
    expect(isVoiceAvailableForModel('openai:echo', 'tts-1-hd')).toBe(true);
    expect(isVoiceAvailableForModel('google:aoede', 'tts-1')).toBe(false);
    expect(isVoiceAvailableForModel('ioana-system', 'tts-1')).toBe(false);

    // google-journey: only Journey voices
    expect(isVoiceAvailableForModel('google:journey-f', 'google-journey')).toBe(true);
    expect(isVoiceAvailableForModel('google:journey-m', 'google-journey')).toBe(true);
    expect(isVoiceAvailableForModel('google:aoede', 'google-journey')).toBe(false);
    expect(isVoiceAvailableForModel('openai:alloy', 'google-journey')).toBe(false);

    // gemini-live: only Gemini voices
    expect(isVoiceAvailableForModel('google:aoede', 'gemini-live')).toBe(true);
    expect(isVoiceAvailableForModel('google:fenrir', 'gemini-live')).toBe(true);
    expect(isVoiceAvailableForModel('google:ro-RO', 'gemini-live')).toBe(false);
    expect(isVoiceAvailableForModel('openai:alloy', 'gemini-live')).toBe(false);

    // omniroute-gemini: Gemini voices and Google Native
    expect(isVoiceAvailableForModel('google:aoede', 'omniroute-gemini')).toBe(true);
    expect(isVoiceAvailableForModel('google:ro-RO', 'omniroute-gemini')).toBe(true);
    expect(isVoiceAvailableForModel('openai:alloy', 'omniroute-gemini')).toBe(false);

    // omniroute: depends on omnirouteModel
    expect(isVoiceAvailableForModel('google:aoede', 'omniroute', 'gemini-2.5-flash')).toBe(true);
    expect(isVoiceAvailableForModel('openai:alloy', 'omniroute', 'gemini-2.5-flash')).toBe(false);
    expect(isVoiceAvailableForModel('openai:alloy', 'omniroute', 'tts-1')).toBe(true);
    expect(isVoiceAvailableForModel('google:aoede', 'omniroute', 'tts-1')).toBe(false);
  });

  it('getDefaultVoiceForModel provides valid fallback voices', async () => {
    const { getDefaultVoiceForModel } = await import('@/core/capture/voice/tts-voices');

    expect(getDefaultVoiceForModel('tts-1')).toBe('openai:alloy');
    expect(getDefaultVoiceForModel('tts-1-hd')).toBe('openai:alloy');
    expect(getDefaultVoiceForModel('omniroute-gemini')).toBe('google:aoede');
    expect(getDefaultVoiceForModel('gemini-live')).toBe('google:aoede');
    expect(getDefaultVoiceForModel('google-journey')).toBe('google:journey-f');
    expect(getDefaultVoiceForModel('google', 'ro-RO')).toBe('google:ro-RO');
    expect(getDefaultVoiceForModel('omniroute', 'en-US', [], 'gemini-2.5-flash')).toBe('google:aoede');
    expect(getDefaultVoiceForModel('omniroute', 'en-US', [], 'tts-1')).toBe('openai:alloy');
  });

  it('exports valid transcription models for all providers', async () => {
    const {
      OPENAI_TRANSCRIPTION_MODELS,
      GROQ_TRANSCRIPTION_MODELS,
      GOOGLE_TRANSCRIPTION_MODELS,
      OMNIROUTE_TRANSCRIPTION_MODELS,
    } = await import('@/core/capture/voice/transcribe');

    expect(OPENAI_TRANSCRIPTION_MODELS.some((m) => m.id === 'whisper-1')).toBe(true);
    expect(GROQ_TRANSCRIPTION_MODELS.some((m) => m.id === 'whisper-large-v3')).toBe(true);
    expect(GOOGLE_TRANSCRIPTION_MODELS.some((m) => m.id === 'gemini-2.5-flash')).toBe(true);
    expect(OMNIROUTE_TRANSCRIPTION_MODELS.some((m) => m.id === 'gemini-2.5-flash')).toBe(true);
  });
});
