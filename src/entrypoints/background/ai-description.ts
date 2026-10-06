import { getAIDescription } from '@/core/capture/ai/description';
import { AI_PROVIDERS, DEFAULT_OMNIROUTE_BASE_URL } from '@/core/capture/ai/models';
import type { DOMContext } from '@/core/capture/dom/context';
import { localStorage } from '@/lib/browser-api';

export async function generateAiDescription(domContext: DOMContext): Promise<string | undefined> {
  const settings = await localStorage.get(['aiApiKey', 'aiProvider', 'aiModel', 'omnirouteBaseUrl']);
  const provider = (settings.aiProvider as string) || 'openai';
  if (!settings.aiApiKey && provider !== 'omniroute') return undefined;

  const model = (settings.aiModel as string) || AI_PROVIDERS[provider]?.defaultModel || 'gpt-4o-mini';
  const apiKey = (settings.aiApiKey as string) || (provider === 'omniroute' ? 'omniroute' : '');
  const baseUrl = (settings.omnirouteBaseUrl as string) || DEFAULT_OMNIROUTE_BASE_URL;

  const description = await getAIDescription(domContext, provider, model, apiKey, baseUrl);
  return description || undefined;
}
