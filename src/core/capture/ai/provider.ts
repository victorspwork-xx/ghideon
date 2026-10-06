import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { DEFAULT_OMNIROUTE_BASE_URL } from './models';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export function createModel(provider: string, model: string, apiKey: string, baseUrl?: string) {
  if (provider === 'anthropic') return createAnthropic({ apiKey })(model);
  if (provider === 'deepseek') {
    const targetModel = !model || model.startsWith('deepseek-v4') ? 'deepseek-chat' : model;
    return createOpenAI({ apiKey, baseURL: DEEPSEEK_BASE_URL, name: 'deepseek' })(targetModel);
  }
  if (provider === 'groq') {
    const effectiveBaseUrl = (baseUrl || GROQ_BASE_URL).replace(/\/+$/, '');
    return createOpenAI({ apiKey, baseURL: effectiveBaseUrl, name: 'groq' })(model);
  }
  if (provider === 'omniroute') {
    const effectiveBaseUrl = (baseUrl || DEFAULT_OMNIROUTE_BASE_URL).replace(/\/+$/, '');
    return createOpenAI({
      apiKey: apiKey || 'omniroute',
      baseURL: effectiveBaseUrl,
      name: 'omniroute',
    })(model || 'gemini-2.5-flash');
  }
  return createOpenAI({ apiKey })(model);
}
