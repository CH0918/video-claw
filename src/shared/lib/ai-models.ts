export type SupportedAIModelId =
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash'
  | 'gpt-5.4'
  | 'claude-sonnet-4-6';

export type SupportedAIModel = {
  id: SupportedAIModelId;
  title: string;
  provider: 'google' | 'openai' | 'anthropic';
};

export const SUPPORTED_AI_MODELS: SupportedAIModel[] = [
  {
    id: 'gemini-2.5-flash-lite',
    title: 'Gemini 2.5 Flash Lite',
    provider: 'google',
  },
  {
    id: 'gemini-2.5-flash',
    title: 'Gemini 2.5 Flash',
    provider: 'google',
  },
  {
    id: 'gpt-5.4',
    title: 'GPT 5.4',
    provider: 'openai',
  },
  {
    id: 'claude-sonnet-4-6',
    title: 'Claude',
    provider: 'anthropic',
  },
];

export const GENERAL_CHAT_DEFAULT_MODEL: SupportedAIModelId =
  'gemini-2.5-flash';

export const VIDEO_SYSTEM_DEFAULT_MODEL: SupportedAIModelId =
  'gemini-2.5-flash-lite';

export const VIDEO_CHAT_DEFAULT_MODEL: SupportedAIModelId =
  'gemini-2.5-flash';

export function isSupportedAIModel(value: string): value is SupportedAIModelId {
  return SUPPORTED_AI_MODELS.some((model) => model.id === value);
}

export function getSupportedAIModel(value?: string | null) {
  if (!value) {
    return null;
  }

  return SUPPORTED_AI_MODELS.find((model) => model.id === value) || null;
}

export function requireSupportedAIModel(
  value: string | undefined | null,
  fallback: SupportedAIModelId = GENERAL_CHAT_DEFAULT_MODEL
): SupportedAIModelId {
  const candidate = String(value || fallback).trim();
  if (!isSupportedAIModel(candidate)) {
    throw new Error(`unsupported model: ${candidate}`);
  }

  return candidate;
}
