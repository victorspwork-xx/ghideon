import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXPORT_OPTIONS, type ExportOptions } from '@/core/export/options';
import type { Guide, Screenshot, Step } from '@/core/guides/types';

const rec = vi.hoisted(() => ({
  audioTracks: [] as unknown[],
  audioBuffersAdded: [] as unknown[],
  masterBufferChannels: [] as Float32Array[][],
  masterBufferSampleRate: 0,
}));

function fakeCtx() {
  const store: Record<string, unknown> = { filter: 'none' };
  const base: Record<string, unknown> = {
    canvas: { width: 1280, height: 720 },
    measureText: (t: unknown) => ({ width: String(t).length * 8 }),
  };
  return new Proxy(base, {
    has: () => true,
    get(target, key) {
      const k = String(key);
      if (k in target) return target[k];
      if (k in store) return store[k];
      return () => {};
    },
    set(_target, key, value) {
      store[String(key)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

vi.mock('mediabunny', () => ({
  QUALITY_HIGH: 'high',
  Mp4OutputFormat: class {},
  WebMOutputFormat: class {},
  BufferTarget: class {
    get buffer() {
      return new ArrayBuffer(32);
    }
  },
  CanvasSource: class {
    async add() {}
  },
  AudioBufferSource: class {
    async add(buf: unknown) {
      rec.audioBuffersAdded.push(buf);
    }
  },
  Output: class {
    target: { buffer: ArrayBuffer };
    constructor(o: { target: { buffer: ArrayBuffer } }) {
      this.target = o.target;
    }
    addVideoTrack() {}
    addAudioTrack(source: unknown) {
      rec.audioTracks.push(source);
    }
    async start() {}
    async finalize() {}
    async cancel() {}
  },
}));

vi.mock('@/core/export/video-support', async () => {
  const actual = await vi.importActual<typeof import('@/core/export/video-support')>('@/core/export/video-support');
  return {
    ...actual,
    pickContainer: vi.fn(async () => 'mp4'),
  };
});

vi.mock('@/core/screenshot/render', () => ({
  renderScreenshot: vi.fn(async () => new Blob(['webp'])),
}));

const mockGetOrSynthesizeStepAudio = vi.fn();
vi.mock('@/core/capture/voice/step-tts', () => ({
  getOrSynthesizeStepAudio: (...args: unknown[]) => mockGetOrSynthesizeStepAudio(...args),
}));

class FakeAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  channels: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.channels = Array.from({ length: options.numberOfChannels }, () => new Float32Array(options.length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

class FakeAudioContext {
  sampleRate = 48000; // Native mac audio sample rate
  createBuffer(channels: number, length: number, sampleRate: number) {
    rec.masterBufferSampleRate = sampleRate;
    const buf = new FakeAudioBuffer({ numberOfChannels: channels, length, sampleRate });
    rec.masterBufferChannels.push(buf.channels);
    return buf;
  }
  async decodeAudioData(_arrayBuffer: ArrayBuffer) {
    // Return a 2.0-second mono audio buffer at 48000 Hz
    const length = 48000 * 2;
    const buf = new FakeAudioBuffer({ numberOfChannels: 1, length, sampleRate: 48000 });
    // Fill with sample values
    for (let i = 0; i < length; i++) {
      buf.channels[0][i] = 0.5;
    }
    return buf;
  }
  async close() {}
}

const guide: Guide = {
  id: 'g-voice',
  title: 'Voice Synchronization Test Guide',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  stepIds: [],
  starred: false,
  deletedAt: null,
};

function makeStep(index: number, extra: Partial<Step> = {}): Step {
  return {
    id: `step-${index}`,
    guideId: guide.id,
    index,
    action: 'click',
    title: `Step ${index + 1}`,
    description: `Click button ${index + 1}`,
    screenshotId: `shot-${index}`,
    url: 'https://example.com',
    timestamp: Date.now(),
    ...extra,
  };
}

function makeShot(stepId: string): Screenshot {
  return {
    id: `shot-${stepId}`,
    stepId,
    blob: new Blob(['raw']),
    mimeType: 'image/webp',
    width: 1280,
    height: 720,
    pixelRatio: 1,
    bounds: { x: 100, y: 100, width: 60, height: 30 },
  };
}

describe('exportGuideAsVideo with unified cached voice TTS', () => {
  beforeEach(() => {
    rec.audioTracks = [];
    rec.audioBuffersAdded = [];
    rec.masterBufferChannels = [];
    rec.masterBufferSampleRate = 0;
    mockGetOrSynthesizeStepAudio.mockReset();

    class FakeOffscreen {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return fakeCtx();
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 1280,
        height: 720,
        close: () => {},
      })),
    );
    vi.stubGlobal('document', {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeCtx() }),
    });

    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
  });

  it('uses getOrSynthesizeStepAudio and matches AudioContext sampleRate with stereo mirroring', async () => {
    const { exportGuideAsVideo } = await import('@/core/export/video-export');

    mockGetOrSynthesizeStepAudio.mockResolvedValue({
      blob: new Blob(['fake-audio-bytes'], { type: 'audio/mp3' }),
      duration: 2.0,
      engine: 'elevenlabs',
      fromCache: true,
    });

    const steps = [makeStep(0), makeStep(1)];
    const screenshots = new Map([
      ['step-0', makeShot('step-0')],
      ['step-1', makeShot('step-1')],
    ]);

    const opts: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      cover: false,
      includeVoice: true,
    };

    const result = await exportGuideAsVideo(guide, steps, screenshots, opts);

    expect(result.blob).toBeInstanceOf(Blob);
    // getOrSynthesizeStepAudio must have been called for both steps
    expect(mockGetOrSynthesizeStepAudio).toHaveBeenCalledTimes(2);
    expect(mockGetOrSynthesizeStepAudio).toHaveBeenNthCalledWith(1, steps[0]);
    expect(mockGetOrSynthesizeStepAudio).toHaveBeenNthCalledWith(2, steps[1]);

    // Audio track must have been added
    expect(rec.audioTracks.length).toBe(1);
    expect(rec.audioBuffersAdded.length).toBe(1);

    // Sample rate must match the AudioContext (48000 Hz, not hardcoded 44100 Hz)
    expect(rec.masterBufferSampleRate).toBe(48000);

    // Mono input (channel 0) must be mirrored to both left (ch 0) and right (ch 1) in master buffer
    const masterChannels = rec.masterBufferChannels[0];
    expect(masterChannels).toBeDefined();
    expect(masterChannels.length).toBe(2);

    // Both left and right channels should have the 0.5 test sample written
    expect(masterChannels[0][100]).toBeCloseTo(0.5, 2);
    expect(masterChannels[1][100]).toBeCloseTo(0.5, 2);
  });

  it('gracefully exports video without audio track if audio synthesis returns null', async () => {
    const { exportGuideAsVideo } = await import('@/core/export/video-export');

    mockGetOrSynthesizeStepAudio.mockResolvedValue(null);

    const steps = [makeStep(0)];
    const screenshots = new Map([['step-0', makeShot('step-0')]]);

    const opts: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      cover: false,
      includeVoice: true,
    };

    const result = await exportGuideAsVideo(guide, steps, screenshots, opts);

    expect(result.blob).toBeInstanceOf(Blob);
    expect(rec.audioTracks.length).toBe(0);
  });
});
