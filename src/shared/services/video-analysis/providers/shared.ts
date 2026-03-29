import {
  buildVideoInfoBlock,
  formatTranscriptForPrompt,
  hydrateTopicCandidates,
  normalizeSummary,
  normalizeTopicCandidates,
} from '@/shared/lib/video-analysis/topic-utils';
import {
  formatTimestamp,
  parseTimestamp,
} from '@/shared/lib/video-analysis/timestamp';
import {
  TranscriptSegment,
  VideoChatAnswer,
  VideoChatMessage,
  VideoInfo,
} from '@/shared/types/video-analysis';

export function stripCodeFence(text: string) {
  return text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

export function safeJsonParse<T>(text: string, fallback: T) {
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

const TIMESTAMP_MATCHER = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

export function normalizeTimestampValue(value: string) {
  const seconds = parseTimestamp(String(value || '').trim());
  return seconds === null ? null : formatTimestamp(seconds);
}

function extractTimestampsFromText(text: string, limit = 5) {
  const matches = String(text || '').match(TIMESTAMP_MATCHER) || [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const timestamp = normalizeTimestampValue(match);
    if (!timestamp || seen.has(timestamp)) continue;
    seen.add(timestamp);
    normalized.push(timestamp);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(
      `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    );
  } catch {
    return value.replace(/\\"/g, '"');
  }
}

function recoverPartialChatResponse(raw: string): VideoChatAnswer | null {
  const answerMatch = raw.match(/"answer"\s*:\s*"([\s\S]*?)"/);
  if (!answerMatch) {
    return null;
  }

  const answer = decodeJsonString(answerMatch[1]).trim();
  if (!answer) {
    return null;
  }

  return {
    answer,
    timestamps: extractTimestampsFromText(raw),
  };
}

export function parseChatResponse(raw: string): VideoChatAnswer {
  const cleaned = stripCodeFence(String(raw || ''));
  let parsed: any = null;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\{[\s\S]*\})/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        parsed = null;
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    const answer = String(parsed.answer || '').trim();
    const timestamps: string[] = Array.isArray(parsed.timestamps)
      ? parsed.timestamps
          .map((item: unknown) => normalizeTimestampValue(String(item || '')))
          .filter((item: string | null): item is string => Boolean(item))
      : [];

    if (answer) {
      return {
        answer,
        timestamps:
          timestamps.length > 0
            ? Array.from(new Set(timestamps)).slice(0, 5)
            : extractTimestampsFromText(answer),
      };
    }
  }

  const recovered = recoverPartialChatResponse(cleaned);
  if (recovered) {
    return recovered;
  }

  const fallbackAnswer = cleaned.trim();
  return {
    answer: fallbackAnswer,
    timestamps: extractTimestampsFromText(fallbackAnswer),
  };
}

export function buildTopicPrompt(
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

export function buildSummaryPrompt(
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

export function buildTranslatePrompt(
  texts: string[],
  targetLanguage: string,
  sourceLanguage?: string,
  videoInfo?: Partial<VideoInfo>
) {
  return [
    'You are a precise subtitle translator.',
    'Return strict JSON object with shape {"translations":["..."]}.',
    `Translate each item into ${targetLanguage}.`,
    sourceLanguage
      ? `The source language is approximately ${sourceLanguage}.`
      : 'The source language may vary by video.',
    'Preserve the array length and item order exactly.',
    'Keep timestamps, proper nouns, URLs, emojis, and line structure when present.',
    'Do not add commentary. Only return translations.',
    buildVideoInfoBlock(videoInfo || {}),
    JSON.stringify({
      texts,
    }),
  ].join('\n');
}

export function parseTranslateResponse(raw: string, fallbackTexts: string[]) {
  const parsed = safeJsonParse<any>(raw, {});
  const translations = Array.isArray(parsed?.translations)
    ? parsed.translations.map((item: unknown, index: number) =>
        String(item ?? fallbackTexts[index] ?? '').trim() ||
        fallbackTexts[index] ||
        ''
      )
    : [];

  if (translations.length === fallbackTexts.length) {
    return translations;
  }

  return fallbackTexts;
}

export function buildChatPrompt(
  transcript: TranscriptSegment[],
  videoInfo: Partial<VideoInfo>,
  messages: VideoChatMessage[]
) {
  return [
    {
      role: 'system' as const,
      content: [
        'You are an expert assistant for YouTube video transcripts.',
        'When the user asks about the video, answer only with claims supported by the transcript.',
        'When the transcript is relevant, every factual claim must include an inline timestamp like [MM:SS] or [HH:MM:SS].',
        'Prefer single anchor timestamps like [MM:SS]. Do not use ranges like [MM:SS-MM:SS] unless the user explicitly asks for a range.',
        'List the same timestamps in a separate timestamps array, in the order they appear, with no more than five unique timestamps.',
        'If the transcript does not support the answer, say so directly and return an empty timestamps array.',
        'Return strict JSON only with shape {"answer":"string","timestamps":["MM:SS"]}. Do not wrap JSON in markdown fences.',
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

export function buildStreamingChatPrompt(
  transcript: TranscriptSegment[],
  videoInfo: Partial<VideoInfo>,
  messages: VideoChatMessage[]
) {
  return [
    {
      role: 'system' as const,
      content: [
        'You are an expert assistant for YouTube video transcripts.',
        'When the user asks about the video, answer only with claims supported by the transcript.',
        'When the transcript is relevant, every factual claim must include inline timestamps like [MM:SS] or [HH:MM:SS].',
        'Prefer single anchor timestamps like [MM:SS]. Do not use ranges like [MM:SS-MM:SS] unless the user explicitly asks for a range.',
        'If the transcript does not support the answer, say so directly.',
        'Return plain text only. Do not return JSON or markdown code fences.',
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

export function parseTopicCandidates(
  transcript: TranscriptSegment[],
  content: string,
  options?: {
    maxTopics?: number;
    theme?: string;
  }
) {
  const parsed = safeJsonParse<any>(content, []);
  const rawCandidates = Array.isArray(parsed)
    ? parsed
    : parsed?.items || parsed?.topics || [];

  return hydrateTopicCandidates(
    transcript,
    normalizeTopicCandidates(rawCandidates),
    {
      maxTopics: options?.maxTopics,
      theme: options?.theme,
    }
  );
}

export function parseSummaryResponse(content: string) {
  return normalizeSummary(safeJsonParse(content, {}));
}
