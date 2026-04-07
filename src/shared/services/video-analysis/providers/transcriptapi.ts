import { normalizeTranscript } from '@/shared/lib/video-analysis/transcript';
import { TranscriptSegment } from '@/shared/types/video-analysis';

import {
  TranscriptProvider,
  TranscriptProviderConfig,
  TranscriptTaskResult,
} from './types';

const BASE_URL = 'https://transcriptapi.com/api/v2';

function buildRequestUrl(videoUrl: string) {
  const params = new URLSearchParams({
    video_url: videoUrl,
    format: 'json',
    include_timestamp: 'true',
    send_metadata: 'true',
  });

  return `${BASE_URL}/youtube/transcript?${params.toString()}`;
}

function mapTranscriptSegments(
  raw: Array<{ text?: string; start?: number; duration?: number }>
): TranscriptSegment[] {
  if (!Array.isArray(raw)) return [];

  return normalizeTranscript(
    raw.map((item) => ({
      text: item?.text ?? '',
      start: item?.start ?? 0,
      duration: item?.duration ?? 0,
    }))
  );
}

export class TranscriptApiProvider implements TranscriptProvider {
  name = 'transcriptapi';

  constructor(private readonly config: TranscriptProviderConfig) {}

  async submitVideo(input: { url: string }) {
    const response = await fetch(buildRequestUrl(input.url), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let detail = '';
      try {
        const parsed = JSON.parse(body);
        detail = parsed?.detail || parsed?.message || '';
      } catch {
        detail = body;
      }
      throw new Error(
        `TranscriptAPI error ${response.status}: ${detail || response.statusText}`
      );
    }

    const payload = await response.json();
    const transcript = mapTranscriptSegments(payload?.transcript || []);

    if (transcript.length === 0) {
      throw new Error('TranscriptAPI returned empty transcript');
    }

    const taskId = `transcriptapi-${Date.now()}`;

    return {
      taskId,
      meta: {
        _transcriptResult: {
          status: 'success',
          transcript,
          language: payload?.language,
          title: payload?.metadata?.title,
          author: payload?.metadata?.author_name,
          videoId: payload?.video_id,
          thumbnailUrl: payload?.metadata?.thumbnail_url,
        },
        cacheStatus: response.headers.get('X-Cache-Status') || undefined,
      },
    };
  }

  async getTaskStatus(
    _taskId: string,
    storedMeta?: Record<string, unknown>
  ): Promise<TranscriptTaskResult> {
    const cached = storedMeta?._transcriptResult as
      | Record<string, unknown>
      | undefined;

    if (!cached) {
      return {
        status: 'error',
        errorMessage: 'TranscriptAPI: no stored result found',
      };
    }

    const transcript = normalizeTranscript(
      cached.transcript as TranscriptSegment[]
    );

    return {
      status: transcript.length > 0 ? 'success' : 'error',
      transcript,
      language: cached.language as string | undefined,
      title: cached.title as string | undefined,
      author: cached.author as string | undefined,
      meta: storedMeta,
      errorMessage:
        transcript.length > 0
          ? undefined
          : 'TranscriptAPI: stored transcript is empty',
    };
  }
}
