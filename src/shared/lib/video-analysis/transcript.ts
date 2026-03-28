import {
  TranscriptExportFormat,
  TranscriptSegment,
} from '@/shared/types/video-analysis';

import {
  formatSrtTimestamp,
  formatTimestamp,
  parseTimestamp,
} from './timestamp';

const TIMESTAMPED_BLOCK_REGEX =
  /\[((?:\d{1,2}:)?\d{1,2}:\d{1,2})\s*-\s*((?:\d{1,2}:)?\d{1,2}:\d{1,2})\]\s*/g;

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeSegmentText(value: string) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function estimateDurationFromText(text: string) {
  const words = normalizeSegmentText(text).split(' ').filter(Boolean).length;
  return Math.max(Math.min(words / 2, 12), 2);
}

function sanitizeTranscriptSegments(transcript: TranscriptSegment[]) {
  const sorted = transcript
    .map((segment) => ({
      text: normalizeSegmentText(segment.text),
      start: segment.start,
      duration: segment.duration,
    }))
    .filter(
      (segment) =>
        segment.text &&
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.duration)
    )
    .sort((left, right) => left.start - right.start);

  const deduped: TranscriptSegment[] = [];

  sorted.forEach((segment) => {
    const previous = deduped[deduped.length - 1];
    if (
      previous &&
      Math.abs(previous.start - segment.start) < 0.01 &&
      previous.text === segment.text
    ) {
      return;
    }

    if (previous && Math.abs(previous.start - segment.start) < 0.01) {
      if (segment.text.length > previous.text.length) {
        previous.text = segment.text;
        previous.duration = Math.max(previous.duration, segment.duration);
      }
      return;
    }

    deduped.push(segment);
  });

  return deduped.reduce<TranscriptSegment[]>((result, segment, index) => {
    const next = deduped[index + 1];
    let duration = Math.max(segment.duration, 0);

    if (next && next.start > segment.start) {
      duration = Math.min(duration || next.start - segment.start, next.start - segment.start);
    }

    if (duration <= 0 && next && next.start > segment.start) {
      duration = next.start - segment.start;
    }

    if (duration <= 0) {
      duration = estimateDurationFromText(segment.text);
    }

    result.push({
      text: segment.text,
      start: segment.start,
      duration,
    });

    return result;
  }, []);
}

export function parseTimestampedTranscript(text: string) {
  const source = String(text || '').trim();
  if (!source) return [] as TranscriptSegment[];

  const matches = Array.from(source.matchAll(TIMESTAMPED_BLOCK_REGEX));
  if (matches.length === 0) {
    return [] as TranscriptSegment[];
  }

  const transcript = matches
    .map((match, index) => {
      if (typeof match.index !== 'number') return null;

      const start = parseTimestamp(match[1]);
      if (start === null) return null;

      const parsedEnd = parseTimestamp(match[2]);
      const nextMatch = matches[index + 1];
      const nextStart = nextMatch ? parseTimestamp(nextMatch[1]) : null;
      const textStart = match.index + match[0].length;
      const textEnd =
        typeof nextMatch?.index === 'number' ? nextMatch.index : source.length;
      const body = normalizeSegmentText(source.slice(textStart, textEnd));

      if (!body) return null;

      let end =
        parsedEnd !== null && parsedEnd > start ? parsedEnd : null;

      if ((end === null || end <= start) && nextStart !== null && nextStart > start) {
        end = nextStart;
      }

      if (end === null || end <= start) {
        end = start + estimateDurationFromText(body);
      }

      return {
        text: body,
        start,
        duration: end - start,
      } satisfies TranscriptSegment;
    })
    .filter((segment): segment is TranscriptSegment => Boolean(segment));

  return sanitizeTranscriptSegments(transcript);
}

export function normalizeTranscript(
  input: Array<Partial<TranscriptSegment> & Record<string, unknown>> | null | undefined
) {
  if (!Array.isArray(input)) {
    return [] as TranscriptSegment[];
  }

  return sanitizeTranscriptSegments(
    input.flatMap((segment) => {
      const embeddedTranscript = parseTimestampedTranscript(
        String(segment.text || '')
      );
      if (embeddedTranscript.length > 1) {
        return embeddedTranscript;
      }

      const start = toNumber(segment.start);
      const duration =
        toNumber(segment.duration) ??
        (() => {
          const end = toNumber((segment as any).end);
          return start !== null && end !== null && end > start ? end - start : null;
        })();

      if (start === null || duration === null || duration <= 0) {
        return [];
      }

      const text = String(segment.text || '').trim();
      if (!text) return [];

      return [{
        text,
        start,
        duration,
      } satisfies TranscriptSegment];
    })
  );
}

export function transcriptToTxt(transcript: TranscriptSegment[]) {
  return transcript
    .map((segment) => `${formatTimestamp(segment.start)} ${segment.text}`)
    .join('\n\n');
}

export function transcriptToSrt(transcript: TranscriptSegment[]) {
  return transcript
    .map((segment, index) => {
      const end = segment.start + Math.max(segment.duration, 1);
      return [
        String(index + 1),
        `${formatSrtTimestamp(segment.start)} --> ${formatSrtTimestamp(end)}`,
        segment.text,
      ].join('\n');
    })
    .join('\n\n');
}

export function exportTranscript(
  transcript: TranscriptSegment[],
  format: TranscriptExportFormat
) {
  return format === 'srt'
    ? transcriptToSrt(transcript)
    : transcriptToTxt(transcript);
}
