import {
  TopicRange,
  TopicRangeSegment,
  TranscriptSegment,
  VideoInfo,
} from '@/shared/types/video-analysis';

import {
  buildTranscriptIndex,
  findTextInTranscript,
} from './quote-matcher';
import { formatTimestamp, parseTimestampRange } from './timestamp';

type TopicCandidate = {
  title: string;
  quote?: {
    timestamp?: string;
    text?: string;
  };
};

function approximateTimeOffset(segment: TranscriptSegment, charOffset?: number) {
  if (
    typeof charOffset !== 'number' ||
    !segment.text ||
    !segment.duration ||
    segment.text.length === 0
  ) {
    return 0;
  }

  const ratio = Math.max(0, Math.min(charOffset / segment.text.length, 1));
  return ratio * segment.duration;
}

function createSegmentFromMatch(
  transcript: TranscriptSegment[],
  match: NonNullable<ReturnType<typeof findTextInTranscript>>,
  preferredText?: string
) {
  const startSegment = transcript[match.startSegmentIdx];
  const endSegment = transcript[match.endSegmentIdx];
  if (!startSegment || !endSegment) return null;

  const start =
    startSegment.start + approximateTimeOffset(startSegment, match.startCharOffset);
  const roughEnd =
    endSegment.start + approximateTimeOffset(endSegment, match.endCharOffset);
  const end = roughEnd > start ? roughEnd : endSegment.start + endSegment.duration;

  return {
    start,
    end: Math.max(end, start + 5),
    text:
      preferredText?.trim() ||
      transcript
        .slice(match.startSegmentIdx, match.endSegmentIdx + 1)
        .map((segment) => segment.text)
        .join(' ')
        .trim(),
    startSegmentIdx: match.startSegmentIdx,
    endSegmentIdx: match.endSegmentIdx,
    startCharOffset: match.startCharOffset,
    endCharOffset: match.endCharOffset,
    hasCompleteSentences: match.matchStrategy !== 'fuzzy-ngram',
  } satisfies TopicRangeSegment;
}

function findSegmentIndexByTime(transcript: TranscriptSegment[], time: number) {
  for (let index = 0; index < transcript.length; index += 1) {
    const segment = transcript[index];
    const end = segment.start + segment.duration;
    if (time >= segment.start && time <= end) {
      return index;
    }
    if (time < segment.start) {
      return Math.max(index - 1, 0);
    }
  }

  return Math.max(transcript.length - 1, 0);
}

function createSegmentFromTimestamp(
  transcript: TranscriptSegment[],
  timestamp?: string,
  preferredText?: string
) {
  const range = parseTimestampRange(timestamp || '');
  if (!range || transcript.length === 0) return null;

  const startSegmentIdx = findSegmentIndexByTime(transcript, range.start);
  const endSegmentIdx = findSegmentIndexByTime(transcript, range.end);
  const endSegment = transcript[endSegmentIdx];

  return {
    start: range.start,
    end: Math.max(range.end, range.start + 5),
    text:
      preferredText?.trim() ||
      transcript
        .slice(startSegmentIdx, endSegmentIdx + 1)
        .map((segment) => segment.text)
        .join(' ')
        .trim(),
    startSegmentIdx,
    endSegmentIdx,
    startCharOffset: 0,
    endCharOffset: endSegment?.text.length || 0,
    hasCompleteSentences: false,
  } satisfies TopicRangeSegment;
}

function computeDuration(segments: TopicRangeSegment[]) {
  return segments.reduce((total, segment) => total + Math.max(segment.end - segment.start, 0), 0);
}

export function hydrateTopicCandidates(
  transcript: TranscriptSegment[],
  candidates: TopicCandidate[],
  options?: {
    maxTopics?: number;
    theme?: string;
  }
) {
  const normalizedTranscript = transcript.filter(
    (segment) =>
      typeof segment.text === 'string' &&
      Number.isFinite(segment.start) &&
      Number.isFinite(segment.duration)
  );
  const index = buildTranscriptIndex(normalizedTranscript);

  const result: TopicRange[] = [];
  const maxTopics = options?.maxTopics || 4;

  candidates.forEach((candidate, topicIndex) => {
    if (result.length >= maxTopics) {
      return;
    }

    const title = String(candidate.title || '').trim();
    const quoteText = String(candidate.quote?.text || '').trim();
    const quoteTimestamp = String(candidate.quote?.timestamp || '').trim();

    if (!title || (!quoteText && !quoteTimestamp)) {
      return;
    }

    const matchedQuote = quoteText
      ? findTextInTranscript(normalizedTranscript, quoteText, index)
      : null;

    let segment =
      (matchedQuote
        ? createSegmentFromMatch(normalizedTranscript, matchedQuote, quoteText)
        : null) ||
      createSegmentFromTimestamp(normalizedTranscript, quoteTimestamp, quoteText);

    if (!segment) {
      return;
    }

    result.push({
      id: `topic-${topicIndex + 1}-${title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')}`,
      label: title,
      theme: options?.theme,
      durationSeconds: computeDuration([segment]),
      segments: [segment],
    });
  });

  return result;
}

export function formatTranscriptForPrompt(
  transcript: TranscriptSegment[],
  maxSegments = transcript.length
) {
  return transcript
    .slice(0, maxSegments)
    .map(
      (segment) =>
        `[${formatTimestamp(segment.start)}-${formatTimestamp(segment.start + segment.duration)}] ${segment.text}`
    )
    .join('\n');
}

export function buildVideoInfoBlock(videoInfo?: Partial<VideoInfo>) {
  return [
    videoInfo?.title ? `Title: ${videoInfo.title}` : null,
    videoInfo?.author ? `Author: ${videoInfo.author}` : null,
    videoInfo?.description ? `Description: ${videoInfo.description}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function normalizeTopicCandidates(input: unknown): TopicCandidate[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      title: String((item as any)?.title || ''),
      quote:
        (item as any)?.quote || (item as any)?.clip
          ? {
              timestamp: String(
                (item as any)?.quote?.timestamp ||
                  (item as any)?.clip?.timestamp ||
                  ''
              ),
              text: String(
                (item as any)?.quote?.text || (item as any)?.clip?.text || ''
              ),
            }
          : undefined,
    }))
    .filter((item) => item.title && (item.quote?.text || item.quote?.timestamp));
}

export function normalizeSummary(input: unknown) {
  const overview = String((input as any)?.overview || '').trim();
  const points = Array.isArray((input as any)?.points)
    ? (input as any).points
        .map((point: any) => ({
          title: String(point?.title || '').trim(),
          text: String(point?.text || '').trim(),
          timestamp: String(point?.timestamp || '').trim() || undefined,
        }))
        .filter((point: any) => point.title || point.text)
    : [];

  return {
    overview,
    points,
  };
}
