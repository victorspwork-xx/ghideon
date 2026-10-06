export interface AIModelOption {
  id: string;
  label: string;
  tier?: 'simple' | 'advanced';
  description?: string;
  isAudio?: boolean;
  isTts?: boolean;
}

export interface AIProviderConfig {
  label: string;
  defaultModel: string;
  models: AIModelOption[];
}

export const AI_PROVIDERS: Record<string, AIProviderConfig> = {
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      // Simpler / Faster models
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o Mini (⚡ Simplu & Rapid)',
        tier: 'simple',
        description: 'Latență minimă, consum redus, ideal pentru descrieri de pași',
      },
      {
        id: 'gpt-4.1-nano',
        label: 'GPT-4.1 Nano (⚡ Ultra-Rapid)',
        tier: 'simple',
        description: 'Cel mai rapid model OpenAI pentru generare instant',
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 Mini (⚡ Rapid & Precis)',
        tier: 'simple',
        description: 'Echilibru excelent între viteză și acuratețe',
      },
      // Advanced models
      {
        id: 'gpt-4o',
        label: 'GPT-4o (🧠 Avansat Flagship)',
        tier: 'advanced',
        description: 'Model multimodal de top pentru înțelegere contextuală profundă',
      },
      {
        id: 'o3-mini',
        label: 'o3-mini (🧠 Avansat Reasoning)',
        tier: 'advanced',
        description: 'Gândire logică accelerată și formulare riguroasă a pașilor',
      },
      {
        id: 'o1',
        label: 'o1 (🧠 Avansat Deep Reasoning)',
        tier: 'advanced',
        description: 'Cel mai avansat model de raționament profund OpenAI',
      },
      {
        id: 'gpt-4.1',
        label: 'GPT-4.1 (🧠 Avansat)',
        tier: 'advanced',
        description: 'Noua generație avansată OpenAI',
      },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      {
        id: 'claude-3-5-haiku-20241022',
        label: 'Claude 3.5 Haiku (⚡ Simplu & Rapid)',
        tier: 'simple',
        description: 'Rapid, concis și foarte economic',
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        label: 'Claude 3.7 Sonnet (🧠 Avansat Hibrid)',
        tier: 'advanced',
        description: 'Cel mai inteligent model Anthropic cu raționament hibrid',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        label: 'Claude 3.5 Sonnet (🧠 Avansat)',
        tier: 'advanced',
        description: 'Standardul industriei pentru analiză complexă de pagini',
      },
      {
        id: 'claude-sonnet-4-20250514',
        label: 'Claude Sonnet 4',
        tier: 'advanced',
        description: 'Generație viitoare Sonnet',
      },
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek-V3 Chat (⚡ Simplu & Rapid)',
        tier: 'simple',
        description: 'Model general performant, rapid și accesibil',
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek-R1 (🧠 Avansat Reasoning)',
        tier: 'advanced',
        description: 'Raționament avansat de tip Chain-of-Thought (R1)',
      },
    ],
  },
  groq: {
    label: 'Groq (⚡ Ultra-Rapid & Free)',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B Versatile (🧠 Avansat / Flagship)',
        tier: 'advanced',
        description: 'Modelul de vârf open-weights, raționament excelent și viteză extremă pe LPU',
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant (⚡ Ultra-Rapid & Gratuit)',
        tier: 'simple',
        description: 'Latență minimă (~1000 tokens/sec), consum redus pe cipuri Groq LPU',
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        label: 'DeepSeek R1 Distill Llama 70B (🧠 Avansat Reasoning)',
        tier: 'advanced',
        description: 'Gândire logică profundă R1 accelerată pe arhitectura Groq LPU',
      },
      {
        id: 'qwen-2.5-32b',
        label: 'Qwen 2.5 32B (🧠 Avansat & Precis)',
        tier: 'advanced',
        description: 'Performanță excepțională pentru formulare instrucțiuni și analiză',
      },
      {
        id: 'gemma2-9b-it',
        label: 'Gemma 2 9B IT (⚡ Google via Groq)',
        tier: 'simple',
        description: 'Model rapid Google finisat pentru instrucțiuni pe hardware Groq',
      },
      {
        id: 'llama-3.2-11b-vision-preview',
        label: 'Llama 3.2 11B Vision (⚡ Rapid & Multimodal)',
        tier: 'simple',
        description: 'Model multimodal compact pentru înțelegere contextuală',
      },
      {
        id: 'llama-3.2-3b-preview',
        label: 'Llama 3.2 3B Instant (⚡ Extrem de Rapid)',
        tier: 'simple',
        description: 'Model ultra-ușor pentru generare instantanee pe Groq',
      },
      {
        id: 'llama-3.2-1b-preview',
        label: 'Llama 3.2 1B (⚡ Instant)',
        tier: 'simple',
        description: 'Cel mai rapid model compact pe LPU',
      },
      {
        id: 'mixtral-8x7b-32768',
        label: 'Mixtral 8x7B (🧠 Avansat MoE 32k)',
        tier: 'advanced',
        description: 'Arhitectură Mixture-of-Experts cu fereastră extinsă de context',
      },
    ],
  },
  omniroute: {
    label: 'OmniRoute (AI Gateway)',
    defaultModel: 'gemini-2.5-flash',
    models: [
      // Gemini Models
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash (⚡ Google Gemini / Rapid & Inteligent)',
        tier: 'simple',
        description: 'Modelul Gemini recomandat: viteză remarcabilă și analiză multimodală superioară',
      },
      {
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash (⚡ Google Gemini / Ultra-Rapid)',
        tier: 'simple',
        description: 'Latență minimă pentru generare instantă de pași și titluri',
      },
      {
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash (⚡ Google Gemini)',
        tier: 'simple',
        description: 'Model ușor, stabil și economic',
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro (🧠 Google Gemini / Avansat Reasoning)',
        tier: 'advanced',
        description: 'Raționament complex și acuratețe contextuală profundă',
      },
      {
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro (🧠 Google Gemini / Context Extins)',
        tier: 'advanced',
        description: 'Înțelegere profundă a fluxurilor complexe de navigare',
      },

      // Antigravity Models
      {
        id: 'antigravity',
        label: 'Antigravity Auto (⚡ Antigravity / Smart Routing)',
        tier: 'simple',
        description: 'Modelul implicit configurat în mediul Google Antigravity',
      },
      {
        id: 'antigravity-gemini-2.5-flash',
        label: 'Antigravity Gemini 2.5 Flash (⚡ Antigravity)',
        tier: 'simple',
        description: 'Optimizat pentru asistenți autonomi și fluxuri de browser',
      },
      {
        id: 'antigravity-gemini-2.5-pro',
        label: 'Antigravity Gemini 2.5 Pro (🧠 Antigravity Avansat)',
        tier: 'advanced',
        description: 'Capacități de raționament profund și analiză de sistem',
      },
      {
        id: 'antigravity-claude-3-7-sonnet',
        label: 'Antigravity Claude 3.7 Sonnet (🧠 Antigravity Hibrid)',
        tier: 'advanced',
        description: 'Raționament hibrid avansat rutat prin mediul Antigravity',
      },

      // Auto & Other Gateway Models
      {
        id: 'auto',
        label: 'Auto-Routing (⚡ Smart Auto-Fallback)',
        tier: 'simple',
        description: 'Rutare automată inteligentă conform regulilor OmniRoute',
      },
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o Mini (⚡ Simplu & Rapid)',
        tier: 'simple',
        description: 'Latență minimă prin OmniRoute',
      },
      {
        id: 'claude-3-5-haiku',
        label: 'Claude 3.5 Haiku (⚡ Simplu)',
        tier: 'simple',
        description: 'Concis și rapid via gateway',
      },
      {
        id: 'deepseek-chat',
        label: 'DeepSeek-V3 Chat (⚡ Simplu)',
        tier: 'simple',
        description: 'Eficiență maximă de cost via gateway',
      },
      {
        id: 'llama-3.1-8b',
        label: 'Llama 3.1 8B (⚡ Rapid)',
        tier: 'simple',
        description: 'Model ultra-ușor open source',
      },
      {
        id: 'gpt-4o',
        label: 'GPT-4o (🧠 Avansat Flagship)',
        tier: 'advanced',
        description: 'Capabilități multimodale și descrieri precise',
      },
      {
        id: 'claude-3-7-sonnet',
        label: 'Claude 3.7 Sonnet (🧠 Avansat Hibrid)',
        tier: 'advanced',
        description: 'Raționament superior hibrid via gateway',
      },
      {
        id: 'claude-3-5-sonnet',
        label: 'Claude 3.5 Sonnet (🧠 Avansat)',
        tier: 'advanced',
        description: 'Acuratețe de vârf pentru interfețe complexe',
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek-R1 (🧠 Avansat Reasoning)',
        tier: 'advanced',
        description: 'Gândire logică profundă Chain-of-Thought',
      },
      {
        id: 'llama-3.3-70b',
        label: 'Llama 3.3 70B (🧠 Avansat)',
        tier: 'advanced',
        description: 'Performanță de top open weights',
      },
    ],
  },
};

export const DEFAULT_OMNIROUTE_BASE_URL = 'http://localhost:20128/v1';

export type AIProviderKey = keyof typeof AI_PROVIDERS;

export const CUSTOM_MODEL_VALUE = 'mimik-custom-model';

export function isCustomModel(model: string, provider: AIProviderConfig): boolean {
  const id = model.trim();
  return id.length > 0 && !provider.models.some((option) => option.id === id);
}
