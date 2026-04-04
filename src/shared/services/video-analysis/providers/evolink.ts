import { normalizeEvolinkBaseUrl } from '@/shared/lib/evolink';
import {
  TranscriptSegment,
  VideoChatMessage,
  VideoChatStreamChunk,
  VideoInfo,
} from '@/shared/types/video-analysis';

import {
  buildChatPrompt,
  buildStreamingChatPrompt,
  buildSummaryPrompt,
  buildTopicPrompt,
  buildTranslatePrompt,
  parseChatResponse,
  parseSummaryResponse,
  parseTopicCandidates,
  parseTranslateResponse,
} from './shared';
import {
  getReasoningModel,
  ReasoningProviderConfig,
  VideoReasoningProvider,
} from './types';

async function callEvolink(
  config: ReasoningProviderConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    responseFormat?: { type: 'json_object' };
    temperature?: number;
  }
) {
  const resolvedModel = options?.model || getReasoningModel(config, 'default');
  const requestBody = {
    model: resolvedModel,
    messages,
    stream: false,
    temperature: options?.temperature ?? 0.2,
    response_format: options?.responseFormat,
  };

  console.log('[Evolink] request:', {
    url: `${normalizeEvolinkBaseUrl(config.baseUrl)}/chat/completions`,
    model: resolvedModel,
    temperature: requestBody.temperature,
    response_format: requestBody.response_format,
    messageCount: messages.length,
    messageRoles: messages.map((m) => m.role),
  });

  const response = await fetch(
    `${normalizeEvolinkBaseUrl(config.baseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.log('[Evolink] error:', payload);
    throw new Error(
      payload?.error?.message || payload?.message || 'Evolink request failed'
    );
  }

  return String(payload?.choices?.[0]?.message?.content || '').trim();
}

function extractStreamDelta(payload: any) {
  const choice = payload?.choices?.[0];
  const content = choice?.delta?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item?.type === 'text' && typeof item?.text === 'string') {
          return item.text;
        }

        return '';
      })
      .join('');
  }

  return '';
}

async function* streamEvolink(
  config: ReasoningProviderConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string
): AsyncGenerator<VideoChatStreamChunk, void, void> {
  console.log('[Evolink] stream request:', {
    url: `${normalizeEvolinkBaseUrl(config.baseUrl)}/chat/completions`,
    model,
    stream: true,
    temperature: 0.2,
    messageCount: messages.length,
    messageRoles: messages.map((m) => m.role),
  });

  const response = await fetch(
    `${normalizeEvolinkBaseUrl(config.baseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.2,
      }),
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error?.message || payload?.message || 'Evolink request failed'
    );
  }

  if (!response.body) {
    throw new Error('Evolink stream response is empty');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), {
      stream: !done,
    });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue;
        }

        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') {
          continue;
        }

        const payload = JSON.parse(data);
        const delta = extractStreamDelta(payload);
        if (!delta) {
          continue;
        }

        answer += delta;
        yield {
          type: 'delta',
          text: delta,
        };
      }
    }

    if (done) {
      break;
    }
  }

  const parsed = parseChatResponse(answer);
  yield {
    type: 'done',
    answer: parsed.answer,
    timestamps: parsed.timestamps,
  };
}

export class EvolinkReasoningProvider implements VideoReasoningProvider {
  name = 'evolink';

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

    const content = await callEvolink(
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
      {
        model: getReasoningModel(this.config, 'translate'),
        responseFormat: { type: 'json_object' },
        temperature: 0.1,
      }
    );

    return parseTranslateResponse(content, input.texts);
  }

  async generateTopics(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    theme?: string;
    maxTopics?: number;
  }) {
    const content = await callEvolink(
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
      {
        model: getReasoningModel(this.config, 'topics'),
        responseFormat: { type: 'json_object' },
      }
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
    const content = await callEvolink(
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
      {
        model: getReasoningModel(this.config, 'summary'),
        responseFormat: { type: 'json_object' },
      }
    );

    return parseSummaryResponse(content);
  }

  async answerQuestion(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
    model?: string;
  }) {
    const content = await callEvolink(
      this.config,
      buildChatPrompt(input.transcript, input.videoInfo, input.messages),
      {
        model: getReasoningModel(this.config, 'chat', input.model),
        responseFormat: { type: 'json_object' },
      }
    );

    return parseChatResponse(content);
  }

  async *streamAnswerQuestion(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
    model?: string;
  }) {
    yield* streamEvolink(
      this.config,
      buildStreamingChatPrompt(
        input.transcript,
        input.videoInfo,
        input.messages
      ),
      getReasoningModel(this.config, 'chat', input.model)
    );
  }
}
