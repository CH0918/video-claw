import {
  buildVideoInfoBlock,
  formatTranscriptForPrompt,
  hydrateTopicCandidates,
  normalizeSummary,
  normalizeTopicCandidates,
} from '@/shared/lib/video-analysis/topic-utils';
import {
  TranscriptSegment,
  VideoChatMessage,
  VideoInfo,
} from '@/shared/types/video-analysis';

import {
  ReasoningProviderConfig,
  VideoReasoningProvider,
} from './types';

function normalizeBaseUrl(baseUrl: string) {
  return (baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
}

function stripCodeFence(text: string) {
  return text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function safeJsonParse<T>(text: string, fallback: T) {
  const cleaned = stripCodeFence(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) return fallback;

    try {
      return JSON.parse(match[1]) as T;
    } catch {
      return fallback;
    }
  }
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

function buildTopicPrompt(
  transcript: TranscriptSegment[],
  videoInfo: Partial<VideoInfo>,
  theme?: string,
  maxTopics = 4
) {
  const themeLine = theme
    ? `Only extract highlights directly related to this theme: "${theme}".`
    : 'Extract the most important highlights from the video.';

  return [
    `You are analyzing a YouTube transcript.`,
    themeLine,
    `Return strict JSON object with shape {"topics":[...]} and at most ${maxTopics} topic items.`,
    `Each topic item must be: {"title":"short label","quote":{"timestamp":"[MM:SS-MM:SS]","text":"exact transcript quote"}}.`,
    `Use timestamps and quote text that exist in the transcript. Do not paraphrase the quote.`,
    buildVideoInfoBlock(videoInfo),
    '<transcript>',
    formatTranscriptForPrompt(transcript, Math.min(transcript.length, 240)),
    '</transcript>',
  ].join('\n');
}

function buildSummaryPrompt(
  transcript: TranscriptSegment[],
  videoInfo: Partial<VideoInfo>
) {
  return [
    `You summarize a YouTube transcript into concise takeaways.`,
    `Return strict JSON object with shape {"overview":"string","points":[{"title":"string","text":"string","timestamp":"MM:SS"}]}.`,
    `Points should be specific, grounded in the transcript, and include timestamps.`,
    buildVideoInfoBlock(videoInfo),
    '<transcript>',
    formatTranscriptForPrompt(transcript, Math.min(transcript.length, 260)),
    '</transcript>',
  ].join('\n');
}

function buildChatPrompt(
  transcript: TranscriptSegment[],
  videoInfo: Partial<VideoInfo>,
  messages: VideoChatMessage[]
) {
  return [
    {
      role: 'system' as const,
      content: [
        'You answer questions about a YouTube transcript.',
        'Every answer must stay grounded in the transcript.',
        'Include inline timestamps like [MM:SS] whenever you reference a fact.',
        'If the transcript does not support an answer, say so directly.',
        buildVideoInfoBlock(videoInfo),
        '<transcript>',
        formatTranscriptForPrompt(transcript, Math.min(transcript.length, 320)),
        '</transcript>',
      ].join('\n'),
    },
    ...messages.map((message) => ({
      role:
        message.role === 'system'
          ? ('assistant' as const)
          : (message.role as 'assistant' | 'user'),
      content: message.content,
    })),
  ];
}

export class DeepseekReasoningProvider implements VideoReasoningProvider {
  name = 'deepseek';

  constructor(private readonly config: ReasoningProviderConfig) {}

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

    const parsed = safeJsonParse<any>(content, []);
    const rawCandidates = Array.isArray(parsed) ? parsed : parsed?.items || parsed?.topics || [];
    return hydrateTopicCandidates(
      input.transcript,
      normalizeTopicCandidates(rawCandidates),
      {
        maxTopics: input.maxTopics,
        theme: input.theme,
      }
    );
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

    return normalizeSummary(safeJsonParse(content, {}));
  }

  async answerQuestion(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
  }) {
    return callDeepseek(this.config, buildChatPrompt(
      input.transcript,
      input.videoInfo,
      input.messages
    ));
  }
}
