import { describe, expect, it, vi } from 'vitest';
import { fetchOpenAITTSAudio, OPENAI_TTS_VOICES, TTS_MODELS } from '../tts-voices';

describe('tts-voices', () => {
  it('provides all 9 OpenAI AI Studio voices with metadata', () => {
    expect(OPENAI_TTS_VOICES.length).toBe(9);
    const keys = OPENAI_TTS_VOICES.map((v) => v.voiceKey);
    expect(keys).toEqual(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'coral', 'sage']);
  });

  it('provides simple and advanced TTS models', () => {
    const ids = TTS_MODELS.map((m) => m.id);
    expect(ids).toContain('browser');
    expect(ids).toContain('google');
    expect(ids).toContain('tts-1');
    expect(ids).toContain('tts-1-hd');
    expect(ids).toContain('omniroute');

    const simple = TTS_MODELS.filter((m) => m.tier === 'simple');
    const advanced = TTS_MODELS.filter((m) => m.tier === 'advanced');

    expect(simple.length).toBeGreaterThanOrEqual(2);
    expect(advanced.some((m) => m.id === 'tts-1-hd')).toBe(true);
  });

  it('provides Google and Gemini multimodal TTS voices', async () => {
    const { GOOGLE_TTS_VOICES } = await import('../tts-voices');
    expect(GOOGLE_TTS_VOICES.length).toBeGreaterThanOrEqual(5);
    const keys = GOOGLE_TTS_VOICES.map((v) => v.voiceKey);
    expect(keys).toContain('native');
    expect(keys).toContain('aoede');
    expect(keys).toContain('charon');
  });

  it('fetchOmniRouteTTSAudio makes a POST request to baseUrl/audio/speech', async () => {
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchOmniRouteTTSAudio } = await import('../tts-voices');
    const blob = await fetchOmniRouteTTSAudio(
      'http://localhost:20128/v1',
      'test-key',
      'tts-1',
      'alloy',
      'Test message',
      1.0,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:20128/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'alloy',
          input: 'Test message',
          speed: 1.0,
        }),
      }),
    );
    expect(blob).toBe(mockBlob);

    vi.unstubAllGlobals();
  });

  it('fetchOmniRouteTTSAudio handles Google voice and omniroute-gemini model', async () => {
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchOmniRouteTTSAudio } = await import('../tts-voices');
    const blob = await fetchOmniRouteTTSAudio(
      'http://localhost:20128/v1',
      'test-key',
      'omniroute-gemini',
      'google:aoede',
      'Test Gemini Speech',
      1.0,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:20128/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          voice: 'aoede',
          input: 'Test Gemini Speech',
          speed: 1.0,
        }),
      }),
    );
    expect(blob).toBe(mockBlob);

    vi.unstubAllGlobals();
  });

  it('fetchOmniRouteTTSAudio normalizes language tag voice to default voice for gemini and openai', async () => {
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchOmniRouteTTSAudio } = await import('../tts-voices');
    await fetchOmniRouteTTSAudio(
      'http://localhost:20128/v1',
      'test-key',
      'omniroute-gemini',
      'google:ro-RO',
      'Test Romanian',
      1.0,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:20128/v1/audio/speech',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          voice: 'aoede',
          input: 'Test Romanian',
          speed: 1.0,
        }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it('fetchOpenAITTSAudio makes a POST request with correct payload', async () => {
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const blob = await fetchOpenAITTSAudio('test-key', 'tts-1-hd', 'openai:nova', 'Test message', 1.25);

    expect(fetchMock).toHaveBeenCalledWith('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice: 'nova',
        input: 'Test message',
        speed: 1.25,
      }),
    });
    expect(blob).toBe(mockBlob);

    vi.unstubAllGlobals();
  });

  it('splitTextForTTS splits long text into sentence chunks within max length', async () => {
    const { splitTextForTTS } = await import('../tts-voices');
    expect(splitTextForTTS('')).toEqual([]);
    expect(splitTextForTTS('Scurt')).toEqual(['Scurt']);

    const text = 'Primul pas. Al doilea pas important. Al treilea pas final.';
    const chunks = splitTextForTTS(text, 25);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(30);
    }
  });

  it('fetchGoogleTTSAudio fetches from translate_tts and returns audio blob', async () => {
    const { fetchGoogleTTSAudio } = await import('../tts-voices');
    const mockAudio = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockAudio.buffer),
    });
    vi.stubGlobal('fetch', fetchMock);

    const blob = await fetchGoogleTTSAudio('Pasul unu: deschide browserul.', 'ro-RO');
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('translate.google.com/translate_tts');
    expect(calledUrl).toContain('tl=ro');
    expect(blob.type).toBe('audio/mpeg');

    vi.unstubAllGlobals();
  });

  it('preserves all google voices when model is google', async () => {
    const { isVoiceAvailableForModel } = await import('../tts-voices');
    expect(isVoiceAvailableForModel('google:charon', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:fenrir', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:puck', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:kore', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:journey-f', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:journey-m', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:studio-f', 'google')).toBe(true);
    expect(isVoiceAvailableForModel('google:studio-m', 'google')).toBe(true);
  });

  it('resolves Google Cloud voice names with language context', async () => {
    const { resolveGoogleCloudVoiceName } = await import('../tts-voices');
    expect(resolveGoogleCloudVoiceName('journey-f', 'en-US')).toBe('en-US-Journey-F');
    expect(resolveGoogleCloudVoiceName('journey-m', 'en-US')).toBe('en-US-Journey-D');
    expect(resolveGoogleCloudVoiceName('studio-f', 'en-US')).toBe('en-US-Studio-O');
    expect(resolveGoogleCloudVoiceName('studio-m', 'en-US')).toBe('en-US-Studio-Q');
    expect(resolveGoogleCloudVoiceName('journey-f', 'ro-RO')).toBe('ro-RO-Wavenet-A');
  });

  it('routes male and female voices distinctly in Gemini TTS', async () => {
    const { fetchGeminiTTSAudio } = await import('../tts-voices');
    const mockJson = {
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'audio/mp3', data: 'QUFB' } }],
          },
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    });
    vi.stubGlobal('fetch', fetchMock);

    // Male voice journey-m
    await fetchGeminiTTSAudio('AIzaSyTestKey', 'gemini-2.0-flash', 'google:journey-m', 'Hello', 'en');
    const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(firstCallBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Charon');

    // Male voice studio-m
    await fetchGeminiTTSAudio('AIzaSyTestKey', 'gemini-2.0-flash', 'google:studio-m', 'Hello', 'en');
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondCallBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Fenrir');

    // Female voice journey-f
    await fetchGeminiTTSAudio('AIzaSyTestKey', 'gemini-2.0-flash', 'google:journey-f', 'Hello', 'en');
    const thirdCallBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(thirdCallBody.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');

    vi.unstubAllGlobals();
  });

  it('provides groq TTS model and validates voices', async () => {
    const { TTS_MODELS, GROQ_TTS_VOICES, isVoiceAvailableForModel, getDefaultVoiceForModel } = await import(
      '../tts-voices'
    );
    expect(TTS_MODELS.some((m) => m.id === 'groq')).toBe(true);
    expect(GROQ_TTS_VOICES.length).toBe(6);
    expect(GROQ_TTS_VOICES.map((v) => v.voiceKey)).toEqual(['autumn', 'austin', 'daniel', 'diana', 'hannah', 'troy']);
    expect(isVoiceAvailableForModel('groq:autumn', 'groq')).toBe(true);
    expect(isVoiceAvailableForModel('groq:austin', 'groq')).toBe(true);
    expect(isVoiceAvailableForModel('openai:alloy', 'groq')).toBe(true);
    expect(isVoiceAvailableForModel('google:aoede', 'groq')).toBe(false);
    expect(getDefaultVoiceForModel('groq')).toBe('groq:autumn');
  });

  it('fetchGroqTTSAudio calls Groq audio speech API endpoint and maps legacy/OpenAI voices to valid Groq voices', async () => {
    const mockBlob = new Blob(['groq-speech'], { type: 'audio/wav' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchGroqTTSAudio } = await import('../tts-voices');
    // Test with legacy 'alloy' -> should map to 'autumn'
    const blob1 = await fetchGroqTTSAudio('gsk_test', 'canopylabs/orpheus-v1-english', 'alloy', 'Test audio');
    expect(blob1).toBe(mockBlob);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url1, init1] = fetchMock.mock.calls[0];
    expect(url1).toBe('https://api.groq.com/openai/v1/audio/speech');
    expect(init1.headers.Authorization).toBe('Bearer gsk_test');
    const body1 = JSON.parse(init1.body as string);
    expect(body1.model).toBe('canopylabs/orpheus-v1-english');
    expect(body1.voice).toBe('autumn');
    expect(body1.input).toBe('Test audio');
    expect(body1.response_format).toBe('wav');

    // Test with direct valid Groq voice 'austin'
    await fetchGroqTTSAudio('gsk_test', 'canopylabs/orpheus-v1-english', 'groq:austin', 'Test audio');
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body2.voice).toBe('austin');

    // Test with unknown voice -> should fallback to 'autumn'
    await fetchGroqTTSAudio('gsk_test', 'canopylabs/orpheus-v1-english', 'unknown-voice-name', 'Test audio');
    const body3 = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(body3.voice).toBe('autumn');

    vi.unstubAllGlobals();
  });

  it('provides ElevenLabs TTS models and predefined voices', async () => {
    const { TTS_MODELS, ELEVENLABS_TTS_VOICES, isVoiceAvailableForModel, getDefaultVoiceForModel } = await import(
      '../tts-voices'
    );

    expect(TTS_MODELS.some((m) => m.id === 'eleven-multilingual-v2')).toBe(true);
    expect(TTS_MODELS.some((m) => m.id === 'eleven-flash-v2-5')).toBe(true);
    expect(TTS_MODELS.some((m) => m.id === 'eleven-turbo-v2-5')).toBe(true);

    expect(ELEVENLABS_TTS_VOICES.length).toBeGreaterThanOrEqual(12);
    const keys = ELEVENLABS_TTS_VOICES.map((v) => v.voiceKey);
    expect(keys).toContain('rachel');
    expect(keys).toContain('adam');
    expect(keys).toContain('antoni');
    expect(keys).toContain('bella');
    expect(keys).toContain('domi');
    expect(keys).toContain('elli');
    expect(keys).toContain('josh');
    expect(keys).toContain('arnold');
    expect(keys).toContain('sam');
    expect(keys).toContain('george');
    expect(keys).toContain('charlie');
    expect(keys).toContain('emily');
    expect(keys).toContain('serban');

    const serbanVoice = ELEVENLABS_TTS_VOICES.find((v) => v.voiceKey === 'serban');
    expect(serbanVoice?.voiceId).toBe('8nBBDfYxYXmDNaqTCxPH');

    expect(isVoiceAvailableForModel('elevenlabs:rachel', 'eleven-multilingual-v2')).toBe(true);
    expect(isVoiceAvailableForModel('elevenlabs:serban', 'eleven-multilingual-v2')).toBe(true);
    expect(isVoiceAvailableForModel('8nBBDfYxYXmDNaqTCxPH', 'eleven-multilingual-v2')).toBe(true);
    expect(
      isVoiceAvailableForModel('https://elevenlabs.io/voices/8nBBDfYxYXmDNaqTCxPH', 'eleven-multilingual-v2'),
    ).toBe(true);
    expect(isVoiceAvailableForModel('elevenlabs:adam', 'eleven-flash-v2-5')).toBe(true);
    expect(isVoiceAvailableForModel('openai:alloy', 'eleven-multilingual-v2')).toBe(false);
    expect(isVoiceAvailableForModel('google:aoede', 'eleven-multilingual-v2')).toBe(false);

    expect(getDefaultVoiceForModel('eleven-multilingual-v2')).toBe('elevenlabs:rachel');
    expect(getDefaultVoiceForModel('eleven-flash-v2-5')).toBe('elevenlabs:rachel');
  });

  it('sanitizeElevenLabsApiKey cleans quotes, whitespace, and accidental prefixes', async () => {
    const { sanitizeElevenLabsApiKey } = await import('../tts-voices');
    expect(sanitizeElevenLabsApiKey('  test_key_123  ')).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey('"test_key_123"')).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey("'test_key_123'")).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey('Bearer test_key_123')).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey('xi-api-key: test_key_123')).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey('xi_test_key_123')).toBe('test_key_123');
    expect(sanitizeElevenLabsApiKey('xi-test_key_123')).toBe('test_key_123');
  });

  it('fetchElevenLabsTTSAudio sends correct request and handles URLs and Serban voice', async () => {
    const mockBlob = new Blob(['elevenlabs-speech'], { type: 'audio/mpeg' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchElevenLabsTTSAudio } = await import('../tts-voices');
    const blob = await fetchElevenLabsTTSAudio(
      'test_api_key_12345',
      'eleven-multilingual-v2',
      'https://elevenlabs.io/voices/8nBBDfYxYXmDNaqTCxPH',
      'Bun venit la Mimik!',
      1.1,
    );

    expect(blob).toBe(mockBlob);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.elevenlabs.io/v1/text-to-speech/8nBBDfYxYXmDNaqTCxPH');
    expect(init.method).toBe('POST');
    expect(init.headers['xi-api-key']).toBe('test_api_key_12345');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Accept']).toBe('audio/mpeg');

    const body = JSON.parse(init.body as string);
    expect(body.text).toBe('Bun venit la Mimik!');
    expect(body.model_id).toBe('eleven_multilingual_v2');
    expect(body.voice_settings.stability).toBe(0.5);
    expect(body.voice_settings.similarity_boost).toBe(0.75);
    expect(body.voice_settings.speed).toBe(1.1);

    vi.unstubAllGlobals();
  });

  it('fetchElevenLabsVoices queries /v1/voices and returns formatted voice list', async () => {
    const mockData = {
      voices: [
        {
          voice_id: 'custom_voice_1',
          name: 'Personal Clone',
          labels: { gender: 'female', accent: 'romanian', description: 'warm' },
          preview_url: 'https://example.com/preview.mp3',
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchElevenLabsVoices } = await import('../tts-voices');
    const voices = await fetchElevenLabsVoices('test_api_key_12345');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/voices',
      expect.objectContaining({
        headers: { 'xi-api-key': 'test_api_key_12345' },
      }),
    );
    expect(voices).toHaveLength(1);
    expect(voices[0].voiceId).toBe('custom_voice_1');
    expect(voices[0].voiceKey).toBe('custom_voice_1');
    expect(voices[0].name).toBe('Personal Clone');
    expect(voices[0].gender).toBe('female');
    expect(voices[0].category).toBe('cloned');

    vi.unstubAllGlobals();
  });
});
