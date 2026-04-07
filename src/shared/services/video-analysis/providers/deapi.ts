import {
  normalizeTranscript,
  parseTimestampedTranscript,
} from '@/shared/lib/video-analysis/transcript';
import { TranscriptSegment } from '@/shared/types/video-analysis';

import {
  TranscriptProvider,
  TranscriptProviderConfig,
  TranscriptTaskResult,
} from './types';

function getJsonHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return (baseUrl || 'https://api.deapi.ai').replace(/\/+$/, '');
}

async function parseResponseJson(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function mapTranscriptSegments(raw: any): TranscriptSegment[] {
  const arrays = [
    raw?.segments,
    raw?.transcript?.segments,
    raw?.transcription?.segments,
    raw?.transcription,
    raw?.data?.segments,
    raw?.data?.transcript?.segments,
    raw?.result?.segments,
  ];

  for (const items of arrays) {
    const normalized = normalizeTranscript(items);
    if (normalized.length > 0) {
      return normalized;
    }

    if (Array.isArray(items)) {
      const mapped = normalizeTranscript(
        items.map((item) => ({
          text: item?.text ?? item?.content ?? item?.sentence ?? '',
          start: item?.start ?? item?.start_time ?? item?.from,
          end: item?.end ?? item?.end_time ?? item?.to,
          duration: item?.duration,
        }))
      );
      if (mapped.length > 0) {
        return mapped;
      }
    }
  }

  const textCandidates = [
    raw?.text,
    raw?.transcript?.text,
    raw?.data?.text,
    raw?.result?.text,
  ];

  for (const candidate of textCandidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }

    const parsed = parseTimestampedTranscript(candidate);
    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        text: candidate.trim(),
        start: 0,
        duration: Math.max(candidate.trim().split(/\s+/).length / 2, 5),
      },
    ];
  }

  return [];
}

async function downloadResult(resultUrl?: string) {
  if (!resultUrl) return {};
  const response = await fetch(resultUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain;q=0.9',
    },
    cache: 'no-store',
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function mapStatus(input: string): TranscriptTaskResult['status'] {
  if (input === 'done' || input === 'success') return 'success';
  if (input === 'error' || input === 'failed') return 'error';
  if (input === 'processing') return 'processing';
  return 'pending';
}

export class DeapiTranscriptProvider implements TranscriptProvider {
  name = 'deapi';

  constructor(private readonly config: TranscriptProviderConfig) {}

  async submitVideo(input: { url: string }) {
    const response = await fetch(
      `${normalizeBaseUrl(this.config.baseUrl)}/api/v1/client/vid2txt`,
      {
        method: 'POST',
        headers: getJsonHeaders(this.config.apiKey),
        body: JSON.stringify({
          video_url: input.url,
          include_ts: true,
          model: this.config.model || undefined,
        }),
        cache: 'no-store',
      }
    );

    const payload = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(
        payload?.message || payload?.error || 'deAPI submit request failed'
      );
    }

    const taskId =
      payload?.data?.request_id || payload?.request_id || payload?.data?.id;

    if (!taskId) {
      throw new Error('deAPI did not return request_id');
    }

    return {
      taskId: String(taskId),
      meta: payload?.data || payload,
    };
  }

  async getTaskStatus(taskId: string, _storedMeta?: Record<string, unknown>): Promise<TranscriptTaskResult> {
    const response = await fetch(
      `${normalizeBaseUrl(this.config.baseUrl)}/api/v1/client/request-status/${taskId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const payload = await parseResponseJson(response);
    if (!response.ok) {
      return {
        status: 'error',
        errorMessage:
          payload?.message || payload?.error || 'deAPI status request failed',
        meta: payload,
      };
    }

    const data = payload?.data || payload;
    const status = mapStatus(String(data?.status || 'pending'));

    if (status !== 'success') {
      return {
        status,
        errorMessage:
          status === 'error'
            ? String(data?.error || data?.message || 'deAPI task failed')
            : undefined,
        meta: data,
      };
    }

    const downloadedResult = await downloadResult(data?.result_url);
    const mergedResult = data?.result || downloadedResult;
    const transcript = mapTranscriptSegments(mergedResult);

    return {
      status: transcript.length > 0 ? 'success' : 'error',
      transcript,
      language:
        mergedResult?.language ||
        mergedResult?.detected_language ||
        mergedResult?.transcript?.language,
      title: mergedResult?.title,
      author: mergedResult?.author,
      durationSeconds:
        mergedResult?.duration_seconds ||
        mergedResult?.duration ||
        mergedResult?.video?.duration_seconds,
      meta: {
        ...data,
        result: mergedResult,
      },
      errorMessage:
        transcript.length > 0 ? undefined : 'deAPI returned an empty transcript',
    };
  }
}
