import {
  TranscriptSegment,
  VideoChatMessage,
  VideoInfo,
} from '@/shared/types/video-analysis';

import {
  buildChatPrompt,
  buildSummaryPrompt,
  buildTopicPrompt,
  buildTranslatePrompt,
  parseChatResponse,
  parseSummaryResponse,
  parseTopicCandidates,
  parseTranslateResponse,
} from './shared';
import {
  ReasoningProviderConfig,
  VideoReasoningProvider,
} from './types';

function normalizeBaseUrl(baseUrl: string) {
  return (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
}

async function callDeepseek(
  config: ReasoningProviderConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    responseFormat?: { type: 'json_object' };
    temperature?: number;
  }
) {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.2,
      response_format: options?.responseFormat,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        'DeepSeek request failed'
    );
  }

  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

export class DeepseekReasoningProvider implements VideoReasoningProvider {
  name = 'deepseek';

  constructor(private readonly config: ReasoningProviderConfig) {}

  async translateTexts(input: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
    videoInfo?: Partial<VideoInfo>;
  }) {
    if (!input.texts.length) {
      return [];
    }

    const content = await callDeepseek(
      this.config,
      [
        {
          role: 'system',
          content:
            'Return strict JSON only. Do not wrap JSON in markdown fences.',
        },
        {
          role: 'user',
          content: buildTranslatePrompt(
            input.texts,
            input.targetLanguage,
            input.sourceLanguage,
            input.videoInfo
          ),
        },
      ],
      { responseFormat: { type: 'json_object' }, temperature: 0.1 }
    );

    return parseTranslateResponse(content, input.texts);
  }

  async generateTopics(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    theme?: string;
    maxTopics?: number;
  }) {
    const content = await callDeepseek(
      this.config,
      [
        {
          role: 'system',
          content:
            'Return strict JSON only. Do not wrap JSON in markdown fences.',
        },
        {
          role: 'user',
          content: buildTopicPrompt(
            input.transcript,
            input.videoInfo,
            input.theme,
            input.maxTopics || 4
          ),
        },
      ],
      { responseFormat: { type: 'json_object' } }
    );

    return parseTopicCandidates(input.transcript, content, {
      maxTopics: input.maxTopics,
      theme: input.theme,
    });
  }

  async generateSummary(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
  }) {
    const content = await callDeepseek(
      this.config,
      [
        {
          role: 'system',
          content:
            'Return strict JSON only. Do not wrap JSON in markdown fences.',
        },
        {
          role: 'user',
          content: buildSummaryPrompt(input.transcript, input.videoInfo),
        },
      ],
      { responseFormat: { type: 'json_object' } }
    );

    return parseSummaryResponse(content);
  }

  async answerQuestion(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
    model?: string;
  }) {
    const content = await callDeepseek(
      this.config,
      buildChatPrompt(input.transcript, input.videoInfo, input.messages),
      { responseFormat: { type: 'json_object' } }
    );

    return parseChatResponse(content);
  }
}
