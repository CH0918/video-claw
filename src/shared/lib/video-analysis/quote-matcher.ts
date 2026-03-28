import { TranscriptSegment } from '@/shared/types/video-analysis';

export function normalizeWhitespace(text: string) {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForMatching(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[.,?!:;"'`~()[\]{}<>|\\/，。！？：；、…—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type TranscriptIndex = {
  fullText: string;
  normalizedText: string;
  segmentBoundaries: Array<{
    segmentIdx: number;
    startPos: number;
    endPos: number;
    text: string;
    normalizedText: string;
  }>;
  wordIndex: Map<string, number[]>;
};

export function buildTranscriptIndex(transcript: TranscriptSegment[]): TranscriptIndex {
  const segmentBoundaries: TranscriptIndex['segmentBoundaries'] = [];
  const wordIndex = new Map<string, number[]>();

  let fullText = '';
  let normalizedText = '';

  transcript.forEach((segment, index) => {
    if (index > 0) {
      fullText += ' ';
      normalizedText += ' ';
    }

    const normalizedSegmentText = normalizeForMatching(segment.text);
    const startPos = fullText.length;
    fullText += segment.text;
    normalizedText += normalizedSegmentText;

    segmentBoundaries.push({
      segmentIdx: index,
      startPos,
      endPos: fullText.length,
      text: segment.text,
      normalizedText: normalizedSegmentText,
    });

    normalizedSegmentText
      .split(/\s+/)
      .filter((word) => word.length > 1)
      .forEach((word) => {
        const entries = wordIndex.get(word) || [];
        entries.push(index);
        wordIndex.set(word, entries);
      });
  });

  return {
    fullText,
    normalizedText,
    segmentBoundaries,
    wordIndex,
  };
}

function calculateNgramSimilarity(source: string, target: string) {
  const a = source.replace(/\s+/g, '');
  const b = target.replace(/\s+/g, '');

  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  if (a.length < 3 || b.length < 3) return 0;

  const sourceNgrams = new Set<string>();
  const targetNgrams = new Set<string>();

  for (let index = 0; index <= a.length - 3; index += 1) {
    sourceNgrams.add(a.slice(index, index + 3));
  }

  for (let index = 0; index <= b.length - 3; index += 1) {
    targetNgrams.add(b.slice(index, index + 3));
  }

  let intersection = 0;
  sourceNgrams.forEach((gram) => {
    if (targetNgrams.has(gram)) {
      intersection += 1;
    }
  });

  const union = sourceNgrams.size + targetNgrams.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function mapMatchToSegments(
  matchStart: number,
  matchLength: number,
  index: TranscriptIndex
) {
  const matchEnd = matchStart + matchLength;
  let startSegmentIdx = -1;
  let endSegmentIdx = -1;
  let startCharOffset = 0;
  let endCharOffset = 0;

  for (const boundary of index.segmentBoundaries) {
    if (
      startSegmentIdx === -1 &&
      matchStart >= boundary.startPos &&
      matchStart < boundary.endPos
    ) {
      startSegmentIdx = boundary.segmentIdx;
      startCharOffset = matchStart - boundary.startPos;
    }

    if (matchEnd > boundary.startPos && matchEnd <= boundary.endPos) {
      endSegmentIdx = boundary.segmentIdx;
      endCharOffset = matchEnd - boundary.startPos;
      break;
    }

    if (matchEnd > boundary.endPos) {
      endSegmentIdx = boundary.segmentIdx;
      endCharOffset = boundary.text.length;
    }
  }

  if (startSegmentIdx === -1 || endSegmentIdx === -1) {
    return null;
  }

  return {
    found: true,
    startSegmentIdx,
    endSegmentIdx,
    startCharOffset,
    endCharOffset,
  };
}

export function mapNormalizedMatchToSegments(
  normalizedMatchIdx: number,
  normalizedTarget: string,
  index: TranscriptIndex
) {
  const matchEnd = normalizedMatchIdx + normalizedTarget.length;
  let cursor = 0;
  let startSegmentIdx = -1;
  let endSegmentIdx = -1;
  let startCharOffset = 0;
  let endCharOffset = 0;

  for (const boundary of index.segmentBoundaries) {
    const normalizedLength = boundary.normalizedText.length;
    const normalizedEnd = cursor + normalizedLength;

    if (
      startSegmentIdx === -1 &&
      normalizedMatchIdx >= cursor &&
      normalizedMatchIdx < normalizedEnd
    ) {
      startSegmentIdx = boundary.segmentIdx;
      startCharOffset = Math.min(
        normalizedMatchIdx - cursor,
        Math.max(boundary.text.length - 1, 0)
      );
    }

    if (matchEnd > cursor && matchEnd <= normalizedEnd) {
      endSegmentIdx = boundary.segmentIdx;
      endCharOffset = Math.min(matchEnd - cursor, boundary.text.length);
      break;
    }

    cursor = normalizedEnd + 1;
  }

  if (startSegmentIdx === -1 || endSegmentIdx === -1) {
    return null;
  }

  return {
    found: true,
    startSegmentIdx,
    endSegmentIdx,
    startCharOffset,
    endCharOffset,
  };
}

export function findTextInTranscript(
  transcript: TranscriptSegment[],
  targetText: string,
  index: TranscriptIndex
) {
  const exactMatch = index.fullText.indexOf(targetText);
  if (exactMatch !== -1) {
    const result = mapMatchToSegments(exactMatch, targetText.length, index);
    if (result) {
      return {
        ...result,
        matchStrategy: 'exact',
      };
    }
  }

  const normalizedTarget = normalizeForMatching(targetText);
  if (!normalizedTarget) {
    return null;
  }

  const normalizedMatch = index.normalizedText.indexOf(normalizedTarget);
  if (normalizedMatch !== -1) {
    const result = mapNormalizedMatchToSegments(
      normalizedMatch,
      normalizedTarget,
      index
    );
    if (result) {
      return {
        ...result,
        matchStrategy: 'normalized',
      };
    }
  }

  const targetWords = normalizedTarget.split(/\s+/).filter((word) => word.length > 1);
  const scoredSegments = new Map<number, number>();

  targetWords.forEach((word) => {
    (index.wordIndex.get(word) || []).forEach((segmentIndex) => {
      scoredSegments.set(segmentIndex, (scoredSegments.get(segmentIndex) || 0) + 1);
    });
  });

  const candidates = [...scoredSegments.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12);

  for (const [candidateIdx] of candidates) {
    let combinedText = '';

    for (
      let cursor = candidateIdx;
      cursor < Math.min(transcript.length, candidateIdx + 18);
      cursor += 1
    ) {
      combinedText = `${combinedText} ${transcript[cursor]?.text || ''}`.trim();
      const similarity = calculateNgramSimilarity(
        normalizedTarget,
        normalizeForMatching(combinedText)
      );

      if (similarity >= 0.72) {
        return {
          found: true,
          startSegmentIdx: candidateIdx,
          endSegmentIdx: cursor,
          startCharOffset: 0,
          endCharOffset: transcript[cursor]?.text.length || 0,
          matchStrategy: 'fuzzy-ngram',
        };
      }
    }
  }

  return null;
}
