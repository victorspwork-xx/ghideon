import { DEFAULT_OMNIROUTE_BASE_URL } from '@/core/capture/ai/models';

export interface AITTSVoice {
  id: string; // e.g. 'openai:alloy'
  voiceKey: string; // 'alloy'
  name: string;
  gender: 'neutral' | 'male' | 'female';
  description: string;
  provider: 'openai';
}

export const OPENAI_TTS_VOICES: AITTSVoice[] = [
  {
    id: 'openai:alloy',
    voiceKey: 'alloy',
    name: 'Alloy',
    gender: 'neutral',
    description: 'Neutră, echilibrată și clară',
    provider: 'openai',
  },
  {
    id: 'openai:echo',
    voiceKey: 'echo',
    name: 'Echo',
    gender: 'male',
    description: 'Caldă, profundă masculină',
    provider: 'openai',
  },
  {
    id: 'openai:fable',
    voiceKey: 'fable',
    name: 'Fable',
    gender: 'neutral',
    description: 'Expresivă, accent britanic',
    provider: 'openai',
  },
  {
    id: 'openai:onyx',
    voiceKey: 'onyx',
    name: 'Onyx',
    gender: 'male',
    description: 'Autoritară, voce de narator',
    provider: 'openai',
  },
  {
    id: 'openai:nova',
    voiceKey: 'nova',
    name: 'Nova',
    gender: 'female',
    description: 'Prietenos, energic feminin',
    provider: 'openai',
  },
  {
    id: 'openai:shimmer',
    voiceKey: 'shimmer',
    name: 'Shimmer',
    gender: 'female',
    description: 'Luminos, cald feminin',
    provider: 'openai',
  },
  {
    id: 'openai:ash',
    voiceKey: 'ash',
    name: 'Ash',
    gender: 'male',
    description: 'Relaxat, conversațional',
    provider: 'openai',
  },
  {
    id: 'openai:coral',
    voiceKey: 'coral',
    name: 'Coral',
    gender: 'female',
    description: 'Cald, captivant narativ',
    provider: 'openai',
  },
  {
    id: 'openai:sage',
    voiceKey: 'sage',
    name: 'Sage',
    gender: 'female',
    description: 'Calm, ritm gândit și didactic',
    provider: 'openai',
  },
];

export interface GoogleTTSVoice {
  id: string; // e.g. 'google:native', 'google:aoede', 'google:journey-f'
  voiceKey: string;
  name: string;
  gender: 'neutral' | 'male' | 'female';
  description: string;
  provider: 'google';
}

export const GOOGLE_TTS_VOICES: GoogleTTSVoice[] = [
  {
    id: 'google:native',
    voiceKey: 'native',
    name: 'Google Nativă (Limbă Curentă)',
    gender: 'neutral',
    description: 'Pronunție nativă impecabilă în limba selectată (Română, Engleză, etc.)',
    provider: 'google',
  },
  {
    id: 'google:aoede',
    voiceKey: 'aoede',
    name: 'Gemini Aoede',
    gender: 'female',
    description: 'Melodică, caldă și expresivă (Google DeepMind)',
    provider: 'google',
  },
  {
    id: 'google:charon',
    voiceKey: 'charon',
    name: 'Gemini Charon',
    gender: 'male',
    description: 'Profundă, autoritară și încrezătoare',
    provider: 'google',
  },
  {
    id: 'google:fenrir',
    voiceKey: 'fenrir',
    name: 'Gemini Fenrir',
    gender: 'male',
    description: 'Energică, directă și dinamică',
    provider: 'google',
  },
  {
    id: 'google:kore',
    voiceKey: 'kore',
    name: 'Gemini Kore',
    gender: 'female',
    description: 'Calmă, blândă și prietenoasă',
    provider: 'google',
  },
  {
    id: 'google:puck',
    voiceKey: 'puck',
    name: 'Gemini Puck',
    gender: 'male',
    description: 'Jucăuș, antrenant și fluent',
    provider: 'google',
  },
  {
    id: 'google:journey-f',
    voiceKey: 'journey-f',
    name: 'Google Journey Female',
    gender: 'female',
    description: 'Ton narativ expresiv de studio',
    provider: 'google',
  },
  {
    id: 'google:journey-m',
    voiceKey: 'journey-m',
    name: 'Google Journey Male',
    gender: 'male',
    description: 'Caldă, conversațională narativă',
    provider: 'google',
  },
  {
    id: 'google:studio-f',
    voiceKey: 'studio-f',
    name: 'Google Studio Female',
    gender: 'female',
    description: 'Calitate broadcast profesională',
    provider: 'google',
  },
  {
    id: 'google:studio-m',
    voiceKey: 'studio-m',
    name: 'Google Studio Male',
    gender: 'male',
    description: 'Calitate broadcast profesională',
    provider: 'google',
  },
];

export interface GroqTTSVoice {
  id: string; // e.g. 'groq:autumn'
  voiceKey: string;
  name: string;
  gender: 'neutral' | 'male' | 'female';
  description: string;
  provider: 'groq';
}

export const GROQ_TTS_VOICES: GroqTTSVoice[] = [
  {
    id: 'groq:autumn',
    voiceKey: 'autumn',
    name: 'Autumn',
    gender: 'female',
    description: 'Naturală, conversațională feminină (Groq Orpheus)',
    provider: 'groq',
  },
  {
    id: 'groq:austin',
    voiceKey: 'austin',
    name: 'Austin',
    gender: 'male',
    description: 'Încrezătoare, clară masculină (Groq Orpheus)',
    provider: 'groq',
  },
  {
    id: 'groq:daniel',
    voiceKey: 'daniel',
    name: 'Daniel',
    gender: 'male',
    description: 'Voce de narator caldă, ritmată (Groq Orpheus)',
    provider: 'groq',
  },
  {
    id: 'groq:diana',
    voiceKey: 'diana',
    name: 'Diana',
    gender: 'female',
    description: 'Caldă, plăcută feminină (Groq Orpheus)',
    provider: 'groq',
  },
  {
    id: 'groq:hannah',
    voiceKey: 'hannah',
    name: 'Hannah',
    gender: 'female',
    description: 'Luminos, energic feminin (Groq Orpheus)',
    provider: 'groq',
  },
  {
    id: 'groq:troy',
    voiceKey: 'troy',
    name: 'Troy',
    gender: 'male',
    description: 'Relaxat, conversațional masculin (Groq Orpheus)',
    provider: 'groq',
  },
];

export interface ElevenLabsTTSVoice {
  id: string; // e.g. 'elevenlabs:rachel'
  voiceKey: string; // 'rachel'
  voiceId: string; // '21m00Tcm4TlvDq8ikWAM'
  name: string;
  gender: 'neutral' | 'male' | 'female';
  description: string;
  provider: 'elevenlabs';
  category?: string;
}

export const ELEVENLABS_TTS_VOICES: ElevenLabsTTSVoice[] = [
  {
    id: 'elevenlabs:rachel',
    voiceKey: 'rachel',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    description: 'Calmă, conversațională feminină (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:adam',
    voiceKey: 'adam',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    description: 'Profundă, voce clasică de narator (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:antoni',
    voiceKey: 'antoni',
    voiceId: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'male',
    description: 'Clar, echilibrat și profesional (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:bella',
    voiceKey: 'bella',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    description: 'Expresivă, dinamică și caldă (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:domi',
    voiceKey: 'domi',
    voiceId: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    gender: 'female',
    description: 'Hotărâtă, captivantă feminină (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:elli',
    voiceKey: 'elli',
    voiceId: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    gender: 'female',
    description: 'Tânără, emotivă și clară (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:josh',
    voiceKey: 'josh',
    voiceId: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'male',
    description: 'Cald, conversațional masculin (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:arnold',
    voiceKey: 'arnold',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    gender: 'male',
    description: 'Autoritar, clar și rezonant (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:sam',
    voiceKey: 'sam',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    gender: 'male',
    description: 'Ritm alert, narator dinamic (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:george',
    voiceKey: 'george',
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    gender: 'male',
    description: 'Cald, povestitor britanic (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:charlie',
    voiceKey: 'charlie',
    voiceId: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie',
    gender: 'male',
    description: 'Natural, conversațional australian (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:emily',
    voiceKey: 'emily',
    voiceId: 'LcfcDJNigLAnFtMwiozz',
    name: 'Emily',
    gender: 'female',
    description: 'Blândă, meditativă și calmă (ElevenLabs)',
    provider: 'elevenlabs',
  },
  {
    id: 'elevenlabs:serban',
    voiceKey: 'serban',
    voiceId: '8nBBDfYxYXmDNaqTCxPH',
    name: 'Șerban Popescu (Română)',
    gender: 'male',
    description: 'Voce caldă, narativă nativă în limba română (ElevenLabs)',
    provider: 'elevenlabs',
  },
];

export interface TTSModelConfig {
  id: string;
  label: string;
  description: string;
  tier: 'simple' | 'advanced';
}

export const TTS_MODELS: TTSModelConfig[] = [
  {
    id: 'browser',
    label: 'Browser Web Speech (⚡ Simplu & Local)',
    description: 'Gratuit, offline, fără cheie API necesară',
    tier: 'simple',
  },
  {
    id: 'google',
    label: 'Google Speech Nativ (⚡ Gratuit & Fără Accent)',
    description: 'Pronunție nativă perfectă în Română și 20+ limbi, zero latență',
    tier: 'simple',
  },
  {
    id: 'google-journey',
    label: 'Google Cloud Journey (🧠 Expresiv & Calitate Studio)',
    description: 'Voci narative premium de ultimă generație Google',
    tier: 'advanced',
  },
  {
    id: 'google-neural2',
    label: 'Google Cloud Neural2 (⚡ Natural & Precis)',
    description: 'Sinteză vocală neurală de înaltă fidelitate Google Cloud',
    tier: 'simple',
  },
  {
    id: 'gemini-live',
    label: 'Gemini Multimodal Live Speech (🧠 Google DeepMind)',
    description: 'Voci generative avansate: Aoede, Charon, Fenrir, Kore, Puck',
    tier: 'advanced',
  },
  {
    id: 'tts-1',
    label: 'OpenAI TTS-1 (⚡ Rapid / Standard)',
    description: 'Latență redusă, intonație excelentă de studio',
    tier: 'simple',
  },
  {
    id: 'tts-1-hd',
    label: 'OpenAI TTS-1-HD (🧠 Avansat / Calitate Studio)',
    description: 'Calitate maximă HD, realism și dinamică superioară',
    tier: 'advanced',
  },
  {
    id: 'omniroute-gemini',
    label: 'Google Gemini TTS via OmniRoute (🧠 DeepMind / Studio)',
    description: 'Sinteză vocală Google Gemini prin gateway-ul local/remote OmniRoute',
    tier: 'advanced',
  },
  {
    id: 'groq',
    label: 'Groq TTS (⚡ LPU Ultra-Rapid)',
    description: 'Sinteză vocală accelerată pe hardware Groq (Orpheus / OpenAI compatible)',
    tier: 'simple',
  },
  {
    id: 'eleven-multilingual-v2',
    label: 'ElevenLabs Multilingual v2 (🧠 Calitate Maximă / 29 limbi)',
    description: 'Voci ultra-realiste de ultimă generație, intonație umană perfectă',
    tier: 'advanced',
  },
  {
    id: 'eleven-flash-v2-5',
    label: 'ElevenLabs Flash v2.5 (⚡ Latență Redusă / 32 limbi)',
    description: 'Generare ultra-rapidă (~75ms), fidelitate ridicată multilingvă',
    tier: 'simple',
  },
  {
    id: 'eleven-turbo-v2-5',
    label: 'ElevenLabs Turbo v2.5 (🚀 Rapid & Fluid)',
    description: 'Echilibru optim între viteză mare și calitate superioară',
    tier: 'advanced',
  },
  {
    id: 'omniroute',
    label: 'OmniRoute Speech (Local Gateway / OpenAI-Compatible)',
    description: 'Endpoint audio/speech local prin gateway-ul OmniRoute',
    tier: 'simple',
  },
];

export type TTSModelId =
  | 'browser'
  | 'google'
  | 'google-journey'
  | 'google-neural2'
  | 'gemini-live'
  | 'omniroute-gemini'
  | 'tts-1'
  | 'tts-1-hd'
  | 'groq'
  | 'eleven-multilingual-v2'
  | 'eleven-flash-v2-5'
  | 'eleven-turbo-v2-5'
  | 'omniroute';

export function isVoiceAvailableForModel(voiceURI: string, model: TTSModelId, omnirouteModel?: string): boolean {
  if (!voiceURI) return false;

  if (model === 'browser') {
    // Only local system voices (not cloud voices)
    return (
      !voiceURI.startsWith('google:') &&
      !voiceURI.startsWith('openai:') &&
      !voiceURI.startsWith('omniroute:') &&
      !voiceURI.startsWith('groq:') &&
      !voiceURI.startsWith('elevenlabs:')
    );
  }

  if (model === 'eleven-multilingual-v2' || model === 'eleven-flash-v2-5' || model === 'eleven-turbo-v2-5') {
    return (
      voiceURI.startsWith('elevenlabs:') ||
      /^[a-zA-Z0-9_-]{15,30}$/.test(voiceURI) ||
      voiceURI.includes('elevenlabs.io')
    );
  }

  if (model === 'tts-1' || model === 'tts-1-hd') {
    // Only OpenAI voices
    return voiceURI.startsWith('openai:');
  }

  if (model === 'groq') {
    return voiceURI.startsWith('openai:') || voiceURI.startsWith('groq:');
  }

  if (model === 'omniroute-gemini') {
    // Google Gemini voices + Google native
    return (
      voiceURI === 'google:aoede' ||
      voiceURI === 'google:charon' ||
      voiceURI === 'google:fenrir' ||
      voiceURI === 'google:kore' ||
      voiceURI === 'google:puck' ||
      voiceURI.startsWith('google:')
    );
  }

  if (model === 'gemini-live') {
    return (
      voiceURI === 'google:aoede' ||
      voiceURI === 'google:charon' ||
      voiceURI === 'google:fenrir' ||
      voiceURI === 'google:kore' ||
      voiceURI === 'google:puck'
    );
  }

  if (model === 'google-journey') {
    return voiceURI === 'google:journey-f' || voiceURI === 'google:journey-m';
  }

  if (model === 'google-neural2') {
    return voiceURI === 'google:studio-f' || voiceURI === 'google:studio-m' || voiceURI.startsWith('google:');
  }

  if (model === 'google') {
    return voiceURI.startsWith('google:');
  }

  if (model === 'omniroute') {
    const isGeminiOmni = (omnirouteModel || '').toLowerCase().includes('gemini');
    if (isGeminiOmni) {
      return (
        voiceURI === 'google:aoede' ||
        voiceURI === 'google:charon' ||
        voiceURI === 'google:fenrir' ||
        voiceURI === 'google:kore' ||
        voiceURI === 'google:puck' ||
        voiceURI.startsWith('google:') ||
        voiceURI.startsWith('omniroute:')
      );
    }
    return voiceURI.startsWith('openai:') || voiceURI.startsWith('omniroute:');
  }

  return true;
}

export function getDefaultVoiceForModel(
  model: TTSModelId,
  lang: string = 'ro-RO',
  systemVoices: SpeechSynthesisVoice[] = [],
  omnirouteModel?: string,
): string {
  if (model === 'browser') {
    const langPrefix = lang.split('-')[0].toLowerCase();
    const matching = systemVoices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    return matching ? matching.voiceURI : systemVoices[0]?.voiceURI || '';
  }

  if (model === 'tts-1' || model === 'tts-1-hd') {
    return 'openai:alloy';
  }

  if (model === 'groq') {
    return 'groq:autumn';
  }

  if (model === 'omniroute-gemini' || model === 'gemini-live') {
    return 'google:aoede';
  }

  if (model === 'google-journey') {
    return 'google:journey-f';
  }

  if (model === 'google-neural2') {
    return 'google:studio-f';
  }

  if (model === 'google') {
    return `google:${lang}`;
  }

  if (model === 'eleven-multilingual-v2' || model === 'eleven-flash-v2-5' || model === 'eleven-turbo-v2-5') {
    return 'elevenlabs:rachel';
  }

  if (model === 'omniroute') {
    const isGeminiOmni = (omnirouteModel || '').toLowerCase().includes('gemini');
    return isGeminiOmni ? 'google:aoede' : 'openai:alloy';
  }

  return `google:${lang}`;
}

export function splitTextForTTS(text: string, maxLen = 160): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= maxLen) return [text];

  const sentences = text.match(/[^.!?\n]+[.!?\n]+|\s*[^.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current = (current ? `${current} ${sentence}` : sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.trim().length <= maxLen) {
        current = sentence.trim();
      } else {
        const words = sentence.trim().split(/\s+/);
        current = '';
        for (const word of words) {
          if ((current + ' ' + word).trim().length <= maxLen) {
            current = (current ? `${current} ${word}` : word).trim();
          } else {
            if (current) chunks.push(current);
            current = word;
          }
        }
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

export function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmData.length, true);

  return new Blob([header, pcmData as unknown as BlobPart], { type: 'audio/wav' });
}

export function base64ToAudioBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const cleanBase64 = base64.replace(/\s+/g, '');
  const binary = atob(cleanBase64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (mimeType.toLowerCase().includes('pcm')) {
    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    return pcmToWavBlob(bytes, sampleRate, 1);
  }

  return new Blob([bytes], { type: mimeType });
}

export async function fetchGeminiTTSAudio(
  apiKey: string,
  model: string = 'gemini-2.5-flash',
  voice: string = 'Aoede',
  text: string,
  lang: string = 'ro-RO',
): Promise<Blob> {
  const rawVoice = voice.replace(/^google:/, '').toLowerCase();
  const GEMINI_VOICE_MAP: Record<string, string> = {
    aoede: 'Aoede',
    charon: 'Charon',
    fenrir: 'Fenrir',
    kore: 'Kore',
    puck: 'Puck',
    'journey-f': 'Kore',
    'journey-m': 'Charon',
    'studio-f': 'Aoede',
    'studio-m': 'Fenrir',
    native: 'Aoede',
    zephyr: 'Zephyr',
    leda: 'Leda',
    orus: 'Orus',
  };
  const isMale =
    rawVoice.includes('charon') ||
    rawVoice.includes('fenrir') ||
    rawVoice.includes('puck') ||
    rawVoice.includes('-m') ||
    rawVoice.includes('male');
  const voiceName = GEMINI_VOICE_MAP[rawVoice] || (isMale ? 'Charon' : 'Aoede');
  const targetModel = model.toLowerCase().includes('gemini') ? model : 'gemini-2.0-flash';

  const sendGeminiAudioRequest = async (m: string): Promise<Blob> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `Speak this verbatim in ${lang}: ${text}` }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName,
                  },
                },
              },
            },
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg = errBody;
        try {
          const parsed = JSON.parse(errBody) as { error?: { message?: string } };
          if (parsed.error?.message) errMsg = parsed.error.message;
        } catch {}
        throw new Error(`Gemini Audio API (${res.status}): ${errMsg.slice(0, 160)}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: {
                mimeType?: string;
                data?: string;
              };
            }>;
          };
        }>;
      };

      const part = data.candidates?.[0]?.content?.parts?.[0];
      const base64 = part?.inlineData?.data;
      const mime = part?.inlineData?.mimeType || 'audio/wav';

      if (!base64) {
        throw new Error('Gemini API did not return audio data in candidates response');
      }

      return base64ToAudioBlob(base64, mime);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await sendGeminiAudioRequest(targetModel);
  } catch (firstErr) {
    // If model wasn't found (e.g. 404), try fallback model (gemini-2.5-flash or gemini-2.0-flash)
    const fallbackModel = targetModel === 'gemini-2.0-flash' ? 'gemini-2.5-flash' : 'gemini-2.0-flash';
    try {
      return await sendGeminiAudioRequest(fallbackModel);
    } catch {
      throw firstErr;
    }
  }
}

export function resolveGoogleCloudVoiceName(voiceKey: string, lang: string): string {
  const langPrefix = lang.split('-')[0].toLowerCase();
  const isEn = langPrefix === 'en';
  const isRo = langPrefix === 'ro';

  if (voiceKey === 'journey-f') {
    return isEn ? 'en-US-Journey-F' : isRo ? 'ro-RO-Wavenet-A' : `${lang}-Wavenet-A`;
  }
  if (voiceKey === 'journey-m') {
    return isEn ? 'en-US-Journey-D' : isRo ? 'ro-RO-Wavenet-A' : `${lang}-Wavenet-B`;
  }
  if (voiceKey === 'studio-f') {
    return isEn ? 'en-US-Studio-O' : isRo ? 'ro-RO-Wavenet-A' : `${lang}-Neural2-A`;
  }
  if (voiceKey === 'studio-m') {
    return isEn ? 'en-US-Studio-Q' : isRo ? 'ro-RO-Wavenet-A' : `${lang}-Neural2-B`;
  }
  return voiceKey;
}

export async function fetchGoogleTTSAudio(
  text: string,
  lang: string = 'ro',
  voice?: string,
  apiKey?: string,
  speed: number = 1.0,
): Promise<Blob> {
  const cleanLang = lang.split('-')[0].toLowerCase();
  const rawVoice = (voice || '').replace(/^google:/, '').toLowerCase();
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

  // 1. If an API key is supplied:
  if (apiKey && apiKey.trim()) {
    // If it is a Gemini voice or Gemini API key (e.g. starts with AIzaSy), try Gemini Audio
    if (isGeminiVoice || apiKey.trim().startsWith('AIzaSy')) {
      try {
        return await fetchGeminiTTSAudio(apiKey, 'gemini-2.0-flash', voice || 'aoede', text, lang);
      } catch (geminiErr) {
        if (isGeminiVoice) {
          throw geminiErr;
        }
        // Continue to Cloud TTS / Native speech fallback for generic google requests
      }
    }

    // Otherwise attempt Cloud Text-to-Speech API
    try {
      const voiceKey = voice?.replace(/^google:/, '') || 'native';
      const cloudVoiceName = resolveGoogleCloudVoiceName(voiceKey, lang);
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: lang,
            name: cloudVoiceName && cloudVoiceName !== 'native' ? cloudVoiceName : undefined,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: Math.max(0.25, Math.min(4.0, speed)),
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioContent?: string };
        if (data.audioContent) {
          return base64ToAudioBlob(data.audioContent, 'audio/mpeg');
        }
      }
    } catch {
      // Fallback to native Google speech below
    }
  }

  // 2. Native Google Speech (clean accent in Romanian, English, etc., zero cost, no key required)
  const chunks = splitTextForTTS(text, 160);
  if (chunks.length === 0) {
    return new Blob([], { type: 'audio/mpeg' });
  }

  const audioBuffers: Uint8Array[] = [];
  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(cleanLang)}&q=${encodeURIComponent(chunk)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(
          `Google TTS request failed (${res.status}): Serviciul web Google TTS nu este accesibil (${res.status}). Folosește 'Browser Web Speech' sau configurează o cheie API Gemini.`,
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        audioBuffers.push(new Uint8Array(arrayBuffer));
      } else {
        throw new Error('Google TTS returned empty audio payload');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (audioBuffers.length === 1) {
    return new Blob([audioBuffers[0].buffer as ArrayBuffer], { type: 'audio/mpeg' });
  }

  // When stitching multiple audio chunks, decode each to PCM to prevent MP3 bit-reservoir corruption
  const AudioCtxClass =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      : null;

  if (AudioCtxClass) {
    try {
      const ctx = new AudioCtxClass();
      const decodedList: AudioBuffer[] = [];
      let totalSamples = 0;
      for (const buf of audioBuffers) {
        const decoded = await ctx.decodeAudioData(
          buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
        );
        decodedList.push(decoded);
        totalSamples += decoded.length;
      }
      const sampleRate = decodedList[0]?.sampleRate || 24000;
      const numChannels = decodedList[0]?.numberOfChannels || 1;
      const mergedPcm = new Int16Array(totalSamples * numChannels);
      let sampleOffset = 0;

      for (const dec of decodedList) {
        const ch0 = dec.getChannelData(0);
        const ch1 = dec.numberOfChannels > 1 ? dec.getChannelData(1) : ch0;
        for (let s = 0; s < dec.length; s++) {
          if (numChannels === 1) {
            const val = Math.max(-1, Math.min(1, ch0[s]));
            mergedPcm[sampleOffset++] = val < 0 ? val * 0x8000 : val * 0x7fff;
          } else {
            const v0 = Math.max(-1, Math.min(1, ch0[s]));
            const v1 = Math.max(-1, Math.min(1, ch1[s]));
            mergedPcm[sampleOffset++] = v0 < 0 ? v0 * 0x8000 : v0 * 0x7fff;
            mergedPcm[sampleOffset++] = v1 < 0 ? v1 * 0x8000 : v1 * 0x7fff;
          }
        }
      }
      void ctx.close();
      return pcmToWavBlob(new Uint8Array(mergedPcm.buffer), sampleRate, numChannels);
    } catch {
      // Fallback to raw concatenation below if decoding is unsupported
    }
  }

  const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of audioBuffers) {
    combined.set(b, offset);
    offset += b.length;
  }

  return new Blob([combined], { type: 'audio/mpeg' });
}

export function getGoogleTTSVoiceInfo(langCode: string) {
  const cleanLang = langCode.split('-')[0].toLowerCase();
  const labelMap: Record<string, string> = {
    ro: 'Română',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ru: 'Русский',
    zh: '中文',
    pl: 'Polski',
    nl: 'Nederlands',
    tr: 'Türkçe',
    uk: 'Українська',
    ja: '日本語',
    ko: '한국어',
  };
  const langLabel = labelMap[cleanLang] || cleanLang.toUpperCase();

  return {
    id: `google:${langCode}`,
    voiceURI: `google:${langCode}`,
    name: `Google ${langLabel} (Nativă, fără accent)`,
    lang: langCode,
    provider: 'google' as const,
  };
}

export async function fetchOpenAITTSAudio(
  apiKey: string,
  model: 'tts-1' | 'tts-1-hd',
  voice: string,
  text: string,
  speed: number = 1.0,
): Promise<Blob> {
  const cleanVoice = voice.replace(/^openai:/, '');
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'tts-1',
      voice: cleanVoice,
      input: text,
      speed: Math.max(0.25, Math.min(4.0, speed)),
    }),
  });

  if (!res.ok) {
    const errorMsg = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS request failed (${res.status}): ${errorMsg}`);
  }

  return await res.blob();
}

export async function fetchOmniRouteTTSAudio(
  baseUrl: string | undefined,
  apiKey: string | undefined,
  model: string,
  voice: string,
  text: string,
  speed: number = 1.0,
): Promise<Blob> {
  const cleanVoiceRaw = (voice || '')
    .replace(/^(omniroute|openai|google):/, '')
    .trim()
    .toLowerCase();
  const resolvedModel =
    model === 'omniroute-gemini' ? 'gemini-2.5-flash' : model === 'omniroute' ? 'tts-1' : model || 'tts-1';

  const isGemini = resolvedModel.toLowerCase().includes('gemini') || model === 'omniroute-gemini';

  const GEMINI_VOICES = ['aoede', 'charon', 'fenrir', 'kore', 'puck'];
  const GEMINI_FALLBACK_MAP: Record<string, string> = {
    'journey-m': 'charon',
    'studio-m': 'fenrir',
    'journey-f': 'kore',
    'studio-f': 'aoede',
    male: 'charon',
    female: 'aoede',
  };
  const OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'coral', 'sage'];
  const isLangTagOrNative =
    !cleanVoiceRaw || cleanVoiceRaw === 'native' || /^[a-z]{2}(_[a-z]{2}|-[a-z]{2,4})?$/i.test(cleanVoiceRaw);

  let cleanVoice: string;
  if (isGemini) {
    if (GEMINI_VOICES.includes(cleanVoiceRaw)) {
      cleanVoice = cleanVoiceRaw;
    } else if (GEMINI_FALLBACK_MAP[cleanVoiceRaw]) {
      cleanVoice = GEMINI_FALLBACK_MAP[cleanVoiceRaw];
    } else if (isLangTagOrNative) {
      cleanVoice = 'aoede';
    } else {
      cleanVoice = cleanVoiceRaw;
    }
  } else {
    if (OPENAI_VOICES.includes(cleanVoiceRaw)) {
      cleanVoice = cleanVoiceRaw;
    } else if (isLangTagOrNative) {
      cleanVoice = 'alloy';
    } else {
      cleanVoice = cleanVoiceRaw;
    }
  }

  const url = `${(baseUrl || DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, '')}/audio/speech`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: resolvedModel,
        voice: cleanVoice,
        input: text,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let details = errorBody;
      try {
        const parsed = JSON.parse(errorBody) as { error?: { message?: string } | string; message?: string };
        if (typeof parsed.error === 'object' && parsed.error?.message) {
          details = parsed.error.message;
        } else if (typeof parsed.error === 'string') {
          details = parsed.error;
        } else if (parsed.message) {
          details = parsed.message;
        }
      } catch {
        // Body was not JSON
      }
      throw new Error(`OmniRoute TTS (${res.status}): ${details || res.statusText || 'Request failed'}`);
    }

    return await res.blob();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`OmniRoute timeout (fără răspuns la ${url})`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GROQ_ALLOWED_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'] as const;

export async function fetchGroqTTSAudio(
  apiKey: string,
  model: string = 'canopylabs/orpheus-v1-english',
  voice: string = 'autumn',
  text: string,
  speed: number = 1.0,
): Promise<Blob> {
  const cleanVoiceRaw = (voice || '')
    .replace(/^(groq|openai):/, '')
    .trim()
    .toLowerCase();

  // Map OpenAI or generic voice names to accepted Groq voices
  const GROQ_VOICE_MAP: Record<string, string> = {
    alloy: 'autumn',
    echo: 'austin',
    fable: 'daniel',
    onyx: 'troy',
    nova: 'hannah',
    shimmer: 'diana',
    ash: 'austin',
    coral: 'autumn',
    sage: 'diana',
  };

  let cleanVoice = cleanVoiceRaw;
  if (GROQ_VOICE_MAP[cleanVoiceRaw]) {
    cleanVoice = GROQ_VOICE_MAP[cleanVoiceRaw];
  } else if (!GROQ_ALLOWED_VOICES.includes(cleanVoiceRaw as (typeof GROQ_ALLOWED_VOICES)[number])) {
    cleanVoice = 'autumn';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'canopylabs/orpheus-v1-english',
        voice: cleanVoice,
        input: text,
        response_format: 'wav',
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorMsg = await res.text().catch(() => '');
      throw new Error(`Groq TTS request failed (${res.status}): ${errorMsg}`);
    }

    return await res.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
  adam: 'pNInz6obpgDQGcFmaJgB',
  antoni: 'ErXwobaYiN019PkySvjV',
  bella: 'EXAVITQu4vr4xnSDxMaL',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  elli: 'MF3mGyEYCl7XYWbV9V6O',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  arnold: 'VR6AewLTigWG4xSOukaG',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
  george: 'JBFqnCBsd6RMkjVDRZzb',
  charlie: 'IKne3meq5aSn9XLyUdCD',
  emily: 'LcfcDJNigLAnFtMwiozz',
  serban: '8nBBDfYxYXmDNaqTCxPH',
  '8nbbdfyxyxmdnaqtcxph': '8nBBDfYxYXmDNaqTCxPH',
  // Fallbacks from OpenAI voice names
  alloy: '21m00Tcm4TlvDq8ikWAM',
  echo: 'pNInz6obpgDQGcFmaJgB',
  fable: 'ErXwobaYiN019PkySvjV',
  onyx: 'VR6AewLTigWG4xSOukaG',
  nova: 'EXAVITQu4vr4xnSDxMaL',
  shimmer: 'AZnzlk1XvdvUeBnXmlld',
  autumn: '21m00Tcm4TlvDq8ikWAM',
  austin: 'pNInz6obpgDQGcFmaJgB',
};

export function sanitizeElevenLabsApiKey(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^xi-api-key[:=\s]+/i, '')
    .replace(/^bearer\s+/i, '')
    .replace(/^xi[_-]/i, '')
    .trim();
}

export async function fetchElevenLabsTTSAudio(
  apiKey: string,
  model: string = 'eleven_multilingual_v2',
  voice: string = '21m00Tcm4TlvDq8ikWAM',
  text: string,
  speed: number = 1.0,
): Promise<Blob> {
  let cleanVoiceRaw = (voice || '').replace(/^elevenlabs:/, '').trim();
  const urlMatch = cleanVoiceRaw.match(/elevenlabs\.io\/voices\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch) {
    cleanVoiceRaw = urlMatch[1];
  }

  let voiceId = cleanVoiceRaw;
  if (ELEVENLABS_VOICE_MAP[cleanVoiceRaw.toLowerCase()]) {
    voiceId = ELEVENLABS_VOICE_MAP[cleanVoiceRaw.toLowerCase()];
  } else if (!voiceId || voiceId.length < 10) {
    voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel default
  }

  // Normalize model ID for ElevenLabs API
  let modelId = model;
  if (model === 'eleven-multilingual-v2') modelId = 'eleven_multilingual_v2';
  else if (model === 'eleven-flash-v2-5') modelId = 'eleven_flash_v2_5';
  else if (model === 'eleven-turbo-v2-5') modelId = 'eleven_turbo_v2_5';

  const cleanKey = sanitizeElevenLabsApiKey(apiKey);
  if (!cleanKey) {
    throw new Error('Cheie API ElevenLabs lipsă. Adăugați o cheie validă în Setări.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': cleanKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: Math.max(0.7, Math.min(1.2, speed)),
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorMsg = await res.text().catch(() => '');
      let parsedDetail = '';
      try {
        const parsed = JSON.parse(errorMsg);
        parsedDetail = parsed.detail?.message || parsed.detail?.status || parsed.message || '';
      } catch {}
      const detailSuffix = parsedDetail ? `: "${parsedDetail}"` : errorMsg ? `: ${errorMsg}` : '';
      if (res.status === 401 || res.status === 402 || res.status === 403) {
        const isQuota =
          parsedDetail.toLowerCase().includes('quota') ||
          parsedDetail.toLowerCase().includes('credit') ||
          errorMsg.toLowerCase().includes('quota');
        if (isQuota) {
          throw new Error(
            `Limită de credite ElevenLabs depășită (${res.status})${detailSuffix}. Măriți sau eliminați limita cheii în ElevenLabs (elevenlabs.io/app/settings/api-keys) sau verificați balanța contului.`,
          );
        }
        if (res.status === 401) {
          throw new Error(
            `Cheie API ElevenLabs invalidă sau neautorizată (401)${detailSuffix}. Verificați cheia în contul ElevenLabs (elevenlabs.io/app/settings/api-keys).`,
          );
        }
      }
      throw new Error(`ElevenLabs TTS request failed (${res.status})${detailSuffix}`);
    }

    return await res.blob();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchElevenLabsVoices(apiKey: string): Promise<ElevenLabsTTSVoice[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  const cleanKey = sanitizeElevenLabsApiKey(apiKey);
  if (!cleanKey) return [];
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': cleanKey,
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      voices?: Array<{
        voice_id: string;
        name: string;
        labels?: Record<string, string>;
        description?: string;
        category?: string;
      }>;
    };
    if (!Array.isArray(data.voices)) return [];
    return data.voices.map((v) => ({
      id: `elevenlabs:${v.voice_id}`,
      voiceKey: v.voice_id,
      voiceId: v.voice_id,
      name: v.name,
      gender: (v.labels?.gender?.toLowerCase() as 'male' | 'female') || 'neutral',
      description: v.description || `${v.name} (ElevenLabs)`,
      provider: 'elevenlabs',
      category: v.category || 'cloned',
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
