import { Space_Grotesk } from 'next/font/google';
import { useTranslations } from 'next-intl';

import {
  formatTimestamp,
  parseTimestamp,
} from '@/shared/lib/video-analysis/timestamp';
import { exportTranscript } from '@/shared/lib/video-analysis/transcript';
import {
  TranscriptExportFormat,
  TranscriptSegment,
  VideoAnalysisPayload,
} from '@/shared/types/video-analysis';

import type {
  ApiEnvelope,
  Message,
  SubtitleItem,
  VideoChatCopy,
  YouTubeNamespace,
} from './types';

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
});

let youtubeIframeApiPromise: Promise<YouTubeNamespace> | null = null;

export async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'request failed');
  }

  return payload.data as T;
}

export async function readSseStream(
  response: Response,
  onEvent: (payload: any) => void
) {
  if (!response.body) {
    throw new Error('empty stream response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
        if (!data) {
          continue;
        }

        onEvent(JSON.parse(data));
      }
    }

    if (done) {
      break;
    }
  }
}

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube iframe API requires a browser'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const previousReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }

      reject(new Error('YouTube iframe API did not initialize correctly'));
    };

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () =>
      reject(new Error('Failed to load YouTube iframe API'));
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
}

export function slugify(value: string) {
  return String(value || 'video')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeLocaleLanguage(value?: string | null) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';

  return null;
}

export function buildAssistantIntro(
  analysis: VideoAnalysisPayload,
  locale: string,
  userName?: string | null
): Message {
  const overview = analysis.summary.overview?.trim();
  const points = analysis.summary.points
    .slice(0, 4)
    .map((point, index) => {
      const prefix = point.timestamp ? `[${point.timestamp}] ` : '';
      return `${index + 1}. ${prefix}${point.title || point.text}`.trim();
    })
    .join('\n');
  const normalizedLocale = normalizeLocaleLanguage(locale) || 'en';
  const safeUserName = String(userName || '').trim();
  const displayName =
    safeUserName || (normalizedLocale === 'zh' ? '朋友' : 'there');

  const sections =
    normalizedLocale === 'zh'
      ? [
          `Hi，${displayName}，这个视频的内容总结如下：`,
          `${overview || '我先帮你提炼了这段视频最核心的内容。'}`,
          points ? `**你可以先看这几个重点：**\n${points}` : '',
          '如果你对视频里任何部分有疑问，欢迎继续和我讨论。',
        ]
      : [
          `Hi, ${displayName}, here's a polished summary of this video:`,
          ` ${overview || `I've pulled together the most important points for you.`}`,
          points ? `**Here are the key takeaways:**\n${points}` : '',
          `If anything in the video is unclear, feel free to ask and we can go through it together.`,
        ];

  return {
    role: 'assistant',
    text: sections.filter(Boolean).join('\n'),
  };
}

export function getSubtitleItems(
  transcript: TranscriptSegment[],
  translatedTexts?: string[]
): SubtitleItem[] {
  return transcript.map((segment, index) => ({
    timestamp: formatTimestamp(segment.start),
    text: translatedTexts?.[index] || segment.text,
    start: segment.start,
    originalText: segment.text,
    translatedText: translatedTexts?.[index],
  }));
}

export function findActiveSubtitleIndex(
  transcript: TranscriptSegment[],
  currentTime: number
) {
  if (!transcript.length) return -1;

  for (let index = 0; index < transcript.length; index += 1) {
    const segment = transcript[index];
    const nextStart = transcript[index + 1]?.start;
    const segmentEnd =
      typeof nextStart === 'number' && nextStart > segment.start
        ? nextStart
        : segment.start + Math.max(segment.duration, 0.25);

    if (currentTime >= segment.start && currentTime < segmentEnd) {
      return index;
    }
  }

  if (currentTime < transcript[0].start) {
    return 0;
  }

  return transcript.length - 1;
}

export function getDefaultSubtitleLanguage(
  locale: string,
  analysis?: VideoAnalysisPayload | null
) {
  return (
    normalizeLocaleLanguage(analysis?.videoInfo.language) ||
    normalizeLocaleLanguage(locale) ||
    'en'
  );
}

export function getSubtitleCacheKey(analysisId: string, language: string) {
  return `${analysisId}:${normalizeLocaleLanguage(language) || language}`;
}

export function parseSummaryTimestamp(value?: string | null) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const direct = parseTimestamp(rawValue);
  if (direct !== null) {
    return {
      label: formatTimestamp(direct),
      seconds: direct,
    };
  }

  const firstMatch = rawValue.match(/\d{1,2}:\d{2}(?::\d{2})?/);
  if (!firstMatch) return null;

  const seconds = parseTimestamp(firstMatch[0]);
  if (seconds === null) return null;

  return {
    label: firstMatch[0],
    seconds,
  };
}

export function parseChatTimestampReference(value: string) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const match = rawValue.match(
    /^\[?((?:\d{1,2}:)?\d{1,2}:\d{1,2})(?:\s*-\s*((?:\d{1,2}:)?\d{1,2}:\d{1,2}))?\]?$/
  );

  if (!match) return null;

  const startSeconds = parseTimestamp(match[1]);
  if (startSeconds === null) return null;

  const endSeconds = match[2] ? parseTimestamp(match[2]) : null;

  return {
    normalized: formatTimestamp(startSeconds),
    seconds: startSeconds,
    label:
      endSeconds === null
        ? formatTimestamp(startSeconds)
        : `${formatTimestamp(startSeconds)}-${formatTimestamp(endSeconds)}`,
  };
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export { exportTranscript };
export type { TranscriptExportFormat };

export function buildVideoChatCopy(
  t: ReturnType<typeof useTranslations<'pages.video.chat'>>
): VideoChatCopy {
  return {
    analyze: t('analyze'),
    askPlaceholder: t('askPlaceholder'),
    authLanguage: t('authLanguage'),
    bilingualCaptions: t('bilingualCaptions'),
    captions: t('captions'),
    chat: t('chat'),
    chatStreaming: t('chatStreaming'),
    copyReply: t('copyReply'),
    copyReplyFailed: t('copyReplyFailed'),
    copyReplySuccess: t('copyReplySuccess'),
    copySubtitles: t('copySubtitles'),
    collapseVideo: t('collapseVideo'),
    credits: t('credits'),
    downloadSubtitles: t('downloadSubtitles'),
    emptyCaptions: t('emptyCaptions'),
    emptyChat: t('emptyChat'),
    expandVideo: t('expandVideo'),
    exportPrompt: t('exportPrompt'),
    jumpToCurrentSubtitle: t('jumpToCurrentSubtitle'),
    modelLabel: t('modelLabel'),
    mindMap: t('mindMap'),
    mindMapBody: t('mindMapBody'),
    mindMapHeading: t('mindMapHeading'),
    notes: t('notes'),
    notesBody: t('notesBody'),
    notesHeading: t('notesHeading'),
    pasteLink: t('pasteLink'),
    pasteLinkFailed: t('pasteLinkFailed'),
    pasteLinkSuccess: t('pasteLinkSuccess'),
    prompts: t.raw('prompts') as string[],
    searchPlaceholder: t('searchPlaceholder'),
    sendFailed: t('sendFailed'),
    summary: t('summary'),
    summaryEmpty: t('summaryEmpty'),
    summaryHeading: t('summaryHeading'),
    summaryLoading: t('summaryLoading'),
    analysisFailed: t('analysisFailed'),
    translatingCaptions: t('translatingCaptions'),
    translationFailed: t('translationFailed'),
    moreActions: t('moreActions'),
    chatActionsTitle: t('chatActionsTitle'),
    chatActionsDescription: t('chatActionsDescription'),
    copy: t('copy'),
    clear: t('clear'),
    clearChatConfirm: t('clearChatConfirm'),
    skill: t('skill'),
    skipToContent: t('skipToContent'),
    dismissError: t('dismissError'),
  };
}
