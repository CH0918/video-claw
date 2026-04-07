import { getAllConfigs } from '@/shared/models/config';
import {
  VIDEO_CHAT_DEFAULT_MODEL,
  VIDEO_SYSTEM_DEFAULT_MODEL,
} from '@/shared/lib/ai-models';
import { normalizeEvolinkBaseUrl } from '@/shared/lib/evolink';
import { SUBTITLE_LANGUAGE_CODES } from '@/shared/lib/subtitle-languages';
import {
  buildVideoAnalysisPayload,
  createVideoAnalysis,
  deleteVideoAnalysis,
  findVideoAnalysisById,
  findVideoAnalysisBySource,
  updateVideoAnalysis,
} from '@/shared/models/video_analysis';
import { isUniqueConstraintError } from '@/shared/lib/db-error';
import {
  TranscriptSegment,
  VideoAnalysisPayload,
  VideoChatAnswer,
  VideoChatCitation,
  VideoChatStreamChunk,
  VideoChatMessage,
} from '@/shared/types/video-analysis';

import { normalizeTranscript } from '@/shared/lib/video-analysis/transcript';
import {
  formatTimestamp,
  parseTimestamp,
} from '@/shared/lib/video-analysis/timestamp';
import { normalizeYouTubeUrl, extractYouTubeVideoId } from '@/shared/lib/video-analysis/youtube';

import {
  getTranscriptProvider,
  getVideoReasoningProvider,
} from './providers';
import { getReasoningModel } from './providers/types';

function requireValue(value: string, message: string) {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

export async function getVideoAnalysisConfigs() {
  const configs = await getAllConfigs();

  return {
    transcript: {
      provider: 'transcriptapi' as const,
      baseUrl: 'https://transcriptapi.com/api/v2',
      apiKey: requireValue(
        configs.video_transcriptapi_api_key || '',
        'video_transcriptapi_api_key is not set'
      ),
      model: '',
    },
    deapiTranscript: {
      provider: 'deapi' as const,
      baseUrl: configs.video_transcript_base_url || 'https://api.deapi.ai',
      apiKey: requireValue(
        configs.video_transcript_api_key || '',
        'video_transcript_api_key is not set (needed as fallback)'
      ),
      model: configs.video_transcript_model || 'WhisperLargeV3',
    },
    reasoning: {
      provider: configs.video_reasoning_provider || 'evolink',
      baseUrl:
        configs.video_reasoning_provider === 'deepseek'
          ? configs.video_reasoning_base_url || 'https://api.deepseek.com'
          : normalizeEvolinkBaseUrl(configs.evolink_base_url),
      apiKey:
        configs.video_reasoning_provider === 'deepseek'
          ? requireValue(
              configs.video_reasoning_api_key || '',
              'video_reasoning_api_key is not set'
            )
          : requireValue(
              configs.evolink_api_key || '',
              'evolink_api_key is not set'
            ),
      model:
        configs.video_reasoning_provider === 'deepseek'
          ? configs.video_reasoning_model || 'deepseek-chat'
          : configs.video_reasoning_evolink_model || VIDEO_CHAT_DEFAULT_MODEL,
      models:
        configs.video_reasoning_provider === 'deepseek'
          ? undefined
          : {
              default:
                configs.video_reasoning_evolink_model ||
                VIDEO_CHAT_DEFAULT_MODEL,
              chat:
                configs.video_reasoning_evolink_model ||
                VIDEO_CHAT_DEFAULT_MODEL,
              translate: VIDEO_SYSTEM_DEFAULT_MODEL,
              summary: VIDEO_SYSTEM_DEFAULT_MODEL,
              topics: VIDEO_SYSTEM_DEFAULT_MODEL,
            },
    },
  };
}

async function fetchYouTubeOEmbed(url: string) {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      {
        cache: 'no-store',
      }
    );
    if (!response.ok) return {};
    const payload = await response.json();
    return {
      title: payload?.title ? String(payload.title) : undefined,
      author: payload?.author_name ? String(payload.author_name) : undefined,
      thumbnailUrl: payload?.thumbnail_url
        ? String(payload.thumbnail_url)
        : undefined,
    };
  } catch {
    return {};
  }
}

function buildVideoMetadata(
  sourceUrl: string,
  sourceId: string,
  metadata: Record<string, unknown>
) {
  return {
    videoId: sourceId,
    url: sourceUrl,
    title: String(metadata.title || ''),
    author: metadata.author ? String(metadata.author) : undefined,
    thumbnailUrl: metadata.thumbnailUrl
      ? String(metadata.thumbnailUrl)
      : undefined,
    description: metadata.description
      ? String(metadata.description)
      : undefined,
    durationSeconds:
      typeof metadata.durationSeconds === 'number'
        ? metadata.durationSeconds
        : undefined,
    language: metadata.language ? String(metadata.language) : undefined,
  };
}

function normalizeTimestampList(timestamps: string[], limit = 5) {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of timestamps) {
    const seconds = parseTimestamp(String(value || '').trim());
    if (seconds === null) continue;

    const timestamp = formatTimestamp(seconds);
    if (seen.has(timestamp)) continue;

    seen.add(timestamp);
    normalized.push(timestamp);

    if (normalized.length >= limit) break;
  }

  return normalized;
}

function extractInlineTimestamps(text: string, limit = 5) {
  const matches = String(text || '').match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g) || [];
  return normalizeTimestampList(matches, limit);
}

function findClosestSegment(
  transcript: TranscriptSegment[],
  targetSeconds: number
) {
  if (!transcript.length) return null;

  let closestIndex = 0;
  let minDiff = Math.abs(transcript[0].start - targetSeconds);

  for (let index = 1; index < transcript.length; index += 1) {
    const diff = Math.abs(transcript[index].start - targetSeconds);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = index;
    }
  }

  const segment = transcript[closestIndex];
  return {
    segment,
    index: closestIndex,
  };
}

function buildChatCitations(
  transcript: TranscriptSegment[],
  timestamps: string[]
): VideoChatCitation[] {
  const citations: VideoChatCitation[] = [];

  for (const timestamp of timestamps) {
    const seconds = parseTimestamp(timestamp);
    if (seconds === null) continue;

    const closest = findClosestSegment(transcript, seconds);
    if (!closest) continue;

    citations.push({
      timestamp,
      seconds,
      start: closest.segment.start,
      end: closest.segment.start + closest.segment.duration,
      text: closest.segment.text,
      segmentIndex: closest.index,
    });
  }

  return citations.sort((left, right) => left.seconds - right.seconds);
}

function normalizeLanguageToLocale(language?: string | null) {
  const value = String(language || '')
    .trim()
    .toLowerCase();

  if (!value) return null;

  if (SUBTITLE_LANGUAGE_CODES.has(value)) return value;

  const prefix = value.split('-')[0];
  if (SUBTITLE_LANGUAGE_CODES.has(prefix)) return prefix;

  return null;
}

export type PreparedVideoAnalysisStart =
  | {
      action: 'reuse';
      response:
        | {
            analysisId: string;
            status: 'success';
            analysis: VideoAnalysisPayload;
          }
        | {
            analysisId: string;
            status: 'pending' | 'processing';
            isNew: false;
          };
    }
  | {
      action: 'start';
      cleanupMode: 'delete' | 'reset-error';
      recordId: string;
      sourceType: 'youtube';
      sourceId: string;
      sourceUrl: string;
    };

export async function prepareVideoAnalysisStart(
  url: string
): Promise<PreparedVideoAnalysisStart> {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const sourceId = extractYouTubeVideoId(url);

  if (!normalizedUrl || !sourceId) {
    throw new Error('Only YouTube URLs are supported');
  }

  const existing = await findVideoAnalysisBySource('youtube', sourceId);
  if (existing?.status === 'success') {
    return {
      action: 'reuse',
      response: {
        analysisId: existing.id,
        status: 'success',
        analysis: buildVideoAnalysisPayload(existing),
      },
    };
  }

  if (existing?.status === 'pending' || existing?.status === 'processing') {
    return {
      action: 'reuse',
      response: {
        analysisId: existing.id,
        status: existing.status as 'pending' | 'processing',
        isNew: false,
      },
    };
  }

  const now = new Date();

  if (existing) {
    const updated = await updateVideoAnalysis(existing.id, {
      sourceUrl: normalizedUrl,
      status: 'pending',
      provider: '',
      providerModel: '',
      providerTaskId: null,
      providerMeta: null,
      errorMessage: null,
      updatedAt: now,
    });

    return {
      action: 'start',
      cleanupMode: 'reset-error',
      recordId: updated.id,
      sourceType: 'youtube',
      sourceId,
      sourceUrl: normalizedUrl,
    };
  }

  try {
    const record = await createVideoAnalysis({
      id: crypto.randomUUID(),
      sourceType: 'youtube',
      sourceId,
      sourceUrl: normalizedUrl,
      status: 'pending',
      provider: '',
      providerModel: '',
      createdAt: now,
      updatedAt: now,
    });

    return {
      action: 'start',
      cleanupMode: 'delete',
      recordId: record.id,
      sourceType: 'youtube',
      sourceId,
      sourceUrl: normalizedUrl,
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const current = await findVideoAnalysisBySource('youtube', sourceId);
    if (!current) {
      throw error;
    }

    if (current.status === 'success') {
      return {
        action: 'reuse',
        response: {
          analysisId: current.id,
          status: 'success',
          analysis: buildVideoAnalysisPayload(current),
        },
      };
    }

    return {
      action: 'reuse',
      response: {
        analysisId: current.id,
        status:
          current.status === 'processing' ? 'processing' : 'pending',
        isNew: false,
      },
    };
  }
}

export async function cleanupPreparedVideoAnalysisStart(
  prepared: Extract<PreparedVideoAnalysisStart, { action: 'start' }>,
  errorMessage: string
) {
  if (prepared.cleanupMode === 'delete') {
    await deleteVideoAnalysis(prepared.recordId);
    return;
  }

  await updateVideoAnalysis(prepared.recordId, {
    status: 'error',
    provider: '',
    providerModel: '',
    providerTaskId: null,
    providerMeta: null,
    errorMessage,
    updatedAt: new Date(),
  });
}

export async function markVideoAnalysisAsError(
  recordId: string,
  errorMessage: string
) {
  await updateVideoAnalysis(recordId, {
    status: 'error',
    errorMessage,
    updatedAt: new Date(),
  });
}

export async function startPreparedVideoAnalysis(
  prepared: Extract<PreparedVideoAnalysisStart, { action: 'start' }>
) {
  const record = await findVideoAnalysisById(prepared.recordId);
  if (!record) {
    throw new Error('analysis not found');
  }

  const providerConfigs = await getVideoAnalysisConfigs();
  const transcriptProvider = getTranscriptProvider(providerConfigs.transcript);
  const oembed = await fetchYouTubeOEmbed(prepared.sourceUrl);

  let submitted: { taskId: string; meta?: Record<string, unknown> };
  let actualProvider: string = providerConfigs.transcript.provider;

  try {
    submitted = await transcriptProvider.submitVideo({
      url: prepared.sourceUrl,
    });
  } catch (error) {
    if (
      actualProvider === 'transcriptapi' &&
      providerConfigs.deapiTranscript.apiKey
    ) {
      console.log(
        `[fallback] TranscriptAPI failed, falling back to deAPI:`,
        error instanceof Error ? error.message : error
      );
      const fallbackProvider = getTranscriptProvider(
        providerConfigs.deapiTranscript
      );
      submitted = await fallbackProvider.submitVideo({
        url: prepared.sourceUrl,
      });
      actualProvider = 'deapi';
    } else {
      throw error;
    }
  }

  const updated = await updateVideoAnalysis(record.id, {
    sourceUrl: prepared.sourceUrl,
    status: 'pending',
    title: oembed.title || record.title,
    author: oembed.author || record.author,
    thumbnailUrl: oembed.thumbnailUrl || record.thumbnailUrl,
    provider: actualProvider,
    providerModel: providerConfigs.transcript.model,
    providerTaskId: submitted.taskId,
    providerMeta: JSON.stringify(submitted.meta || {}),
    errorMessage: null,
    updatedAt: new Date(),
  });

  return {
    analysisId: updated.id,
    status: 'pending' as const,
    isNew: true,
  };
}

export async function translateVideoCaptions(
  analysisId: string,
  targetLanguage: string
) {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('video analysis is not ready');
  }

  const analysis = buildVideoAnalysisPayload(record);
  const transcript = normalizeTranscript(analysis.transcript);
  if (!transcript.length) {
    return {
      language: targetLanguage,
      translations: [] as string[],
    };
  }

  const normalizedTarget = normalizeLanguageToLocale(targetLanguage) || targetLanguage;
  const normalizedSource = normalizeLanguageToLocale(analysis.videoInfo.language);
  if (normalizedSource && normalizedSource === normalizedTarget) {
    return {
      language: normalizedTarget,
      translations: transcript.map((segment) => segment.text),
    };
  }

  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);

  const CHUNK_SIZE = 40;
  const chunks: Array<{ start: number; texts: string[] }> = [];

  for (let index = 0; index < transcript.length; index += CHUNK_SIZE) {
    chunks.push({
      start: index,
      texts: transcript.slice(index, index + CHUNK_SIZE).map((segment) => segment.text),
    });
  }

  const translations: string[] = new Array(transcript.length);

  for (const chunk of chunks) {
    const translatedChunk = await reasoningProvider.translateTexts({
      texts: chunk.texts,
      targetLanguage: normalizedTarget,
      sourceLanguage: analysis.videoInfo.language,
      videoInfo: analysis.videoInfo,
    });

    translatedChunk.forEach((text, offset) => {
      translations[chunk.start + offset] = text;
    });
  }

  return {
    language: normalizedTarget,
    translations: translations.map((text, index) => text || transcript[index]?.text || ''),
  };
}

async function runReasoningForTranscript(
  transcript: TranscriptSegment[],
  videoInfo: ReturnType<typeof buildVideoMetadata>
) {
  const reasoningStart = Date.now();
  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);

  const topicsStart = Date.now();
  const summaryStart = Date.now();

  const [topics, summary] = await Promise.all([
    reasoningProvider.generateTopics({
      transcript,
      videoInfo,
      maxTopics: 4,
    }).then((result) => {
      console.log(`[perf] generateTopics took ${Date.now() - topicsStart}ms`);
      return result;
    }),
    reasoningProvider.generateSummary({
      transcript,
      videoInfo,
    }).then((result) => {
      console.log(`[perf] generateSummary took ${Date.now() - summaryStart}ms`);
      return result;
    }),
  ]);

  console.log(`[perf] runReasoningForTranscript total took ${Date.now() - reasoningStart}ms (transcript segments: ${transcript.length})`);

  return {
    providerName: providerConfigs.reasoning.provider,
    providerModel: getReasoningModel(providerConfigs.reasoning, 'summary'),
    topics,
    summary,
  };
}

export async function getVideoAnalysisStatus(analysisId: string) {
  const statusStart = Date.now();
  const record = await findVideoAnalysisById(analysisId);
  if (!record) {
    throw new Error('analysis not found');
  }

  if (record.status === 'success') {
    console.log(`[perf] getVideoAnalysisStatus(${analysisId}) hit cache, took ${Date.now() - statusStart}ms`);
    return {
      analysisId: record.id,
      status: 'success' as const,
      analysis: buildVideoAnalysisPayload(record),
    };
  }

  if (!record.providerTaskId) {
    throw new Error('analysis task id is missing');
  }

  const providerConfigs = await getVideoAnalysisConfigs();
  const storedProvider = record.provider || providerConfigs.transcript.provider;
  const transcriptConfig =
    storedProvider === 'deapi'
      ? providerConfigs.deapiTranscript
      : providerConfigs.transcript;
  const transcriptProvider = getTranscriptProvider(transcriptConfig);

  const storedMeta = record.providerMeta
    ? JSON.parse(record.providerMeta)
    : undefined;

  const taskStatusStart = Date.now();
  const task = await transcriptProvider.getTaskStatus(
    record.providerTaskId,
    storedMeta
  );
  console.log(`[perf] ${storedProvider} getTaskStatus took ${Date.now() - taskStatusStart}ms (status: ${task.status})`);

  if (task.status === 'pending' || task.status === 'processing') {
    const dbStart = Date.now();
    await updateVideoAnalysis(record.id, {
      status: task.status,
      providerMeta: JSON.stringify(task.meta || {}),
      errorMessage: null,
      updatedAt: new Date(),
    });
    console.log(`[perf] updateVideoAnalysis (${task.status}) took ${Date.now() - dbStart}ms`);
    console.log(`[perf] getVideoAnalysisStatus(${analysisId}) total took ${Date.now() - statusStart}ms`);

    return {
      analysisId: record.id,
      status: task.status,
    };
  }

  if (task.status === 'error') {
    await updateVideoAnalysis(record.id, {
      status: 'error',
      providerMeta: JSON.stringify(task.meta || {}),
      errorMessage: task.errorMessage || 'Transcript generation failed',
      updatedAt: new Date(),
    });

    console.log(`[perf] getVideoAnalysisStatus(${analysisId}) error, total took ${Date.now() - statusStart}ms`);
    return {
      analysisId: record.id,
      status: 'error' as const,
      error: task.errorMessage || 'Transcript generation failed',
    };
  }

  const transcript = normalizeTranscript(task.transcript || []);
  if (transcript.length === 0) {
    await updateVideoAnalysis(record.id, {
      status: 'error',
      errorMessage: 'Transcript is empty',
      updatedAt: new Date(),
    });

    return {
      analysisId: record.id,
      status: 'error' as const,
      error: 'Transcript is empty',
    };
  }

  const videoInfo = buildVideoMetadata(record.sourceUrl, record.sourceId, {
    title: task.title || record.title,
    author: task.author || record.author,
    thumbnailUrl: record.thumbnailUrl,
    description: record.description,
    durationSeconds: task.durationSeconds || record.durationSeconds,
    language: task.language || record.language,
  });

  const reasoning = await runReasoningForTranscript(transcript, videoInfo);

  const dbWriteStart = Date.now();
  const updated = await updateVideoAnalysis(record.id, {
    status: 'success',
    title: videoInfo.title,
    author: videoInfo.author || '',
    thumbnailUrl: videoInfo.thumbnailUrl || '',
    durationSeconds: videoInfo.durationSeconds,
    language: videoInfo.language || '',
    transcript: JSON.stringify(transcript),
    topics: JSON.stringify(reasoning.topics),
    summary: JSON.stringify(reasoning.summary),
    provider: reasoning.providerName,
    providerModel: reasoning.providerModel,
    providerMeta: JSON.stringify(task.meta || {}),
    errorMessage: null,
    updatedAt: new Date(),
  });
  console.log(`[perf] updateVideoAnalysis (success) took ${Date.now() - dbWriteStart}ms`);
  console.log(`[perf] getVideoAnalysisStatus(${analysisId}) completed, total took ${Date.now() - statusStart}ms`);

  return {
    analysisId: updated.id,
    status: 'success' as const,
    analysis: buildVideoAnalysisPayload(updated),
  };
}

export async function generateThemeTopics(analysisId: string, theme: string) {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('analysis is not ready');
  }

  const transcript = normalizeTranscript(JSON.parse(record.transcript || '[]'));
  if (transcript.length === 0) {
    throw new Error('transcript is empty');
  }

  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);

  return reasoningProvider.generateTopics({
    transcript,
    videoInfo: buildVideoAnalysisPayload(record).videoInfo,
    theme,
    maxTopics: 3,
  });
}

export async function answerVideoQuestion(
  analysisId: string,
  messages: VideoChatMessage[],
  model?: string
): Promise<VideoChatAnswer> {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('analysis is not ready');
  }

  const transcript = normalizeTranscript(JSON.parse(record.transcript || '[]'));
  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);

  const response = await reasoningProvider.answerQuestion({
    transcript,
    videoInfo: buildVideoAnalysisPayload(record).videoInfo,
    messages,
    model,
  });

  const answer = String(response.answer || '').trim();
  const timestamps = normalizeTimestampList(
    response.timestamps?.length ? response.timestamps : extractInlineTimestamps(answer)
  );

  return {
    answer,
    timestamps,
    citations: buildChatCitations(transcript, timestamps),
  };
}

export async function* streamVideoQuestionAnswer(
  analysisId: string,
  messages: VideoChatMessage[],
  model?: string
): AsyncGenerator<
  | VideoChatStreamChunk
  | (VideoChatStreamChunk & { citations?: VideoChatCitation[] }),
  void,
  void
> {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('analysis is not ready');
  }

  const transcript = normalizeTranscript(JSON.parse(record.transcript || '[]'));
  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);
  const videoInfo = buildVideoAnalysisPayload(record).videoInfo;

  if (reasoningProvider.streamAnswerQuestion) {
    for await (const chunk of reasoningProvider.streamAnswerQuestion({
      transcript,
      videoInfo,
      messages,
      model,
    })) {
      if (chunk.type === 'delta') {
        yield chunk;
        continue;
      }

      const timestamps = normalizeTimestampList(
        chunk.timestamps?.length ? chunk.timestamps : extractInlineTimestamps(chunk.answer)
      );

      yield {
        type: 'done',
        answer: String(chunk.answer || '').trim(),
        timestamps,
        citations: buildChatCitations(transcript, timestamps),
      };
    }

    return;
  }

  const answer = await answerVideoQuestion(analysisId, messages, model);
  yield {
    type: 'delta',
    text: answer.answer,
  };
  yield {
    type: 'done',
    answer: answer.answer,
    timestamps: answer.timestamps,
    citations: answer.citations,
  };
}

export async function getVideoAnalysisPayload(
  analysisId: string
): Promise<VideoAnalysisPayload> {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('analysis is not ready');
  }

  return buildVideoAnalysisPayload(record);
}

export async function detectLanguageFromText(text: string): Promise<string> {
  const sample = String(text || '').trim().slice(0, 500);
  if (!sample) return 'en';

  const providerConfigs = await getVideoAnalysisConfigs();
  const { baseUrl, apiKey } = providerConfigs.reasoning;

  const response = await fetch(
    `${normalizeEvolinkBaseUrl(baseUrl)}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'user',
            content: [
              'Detect the language of the following text.',
              'Return ONLY the ISO 639-1 two-letter lowercase code (e.g. en, zh, ja, ko, fr, de, es, pt, ru, ar, hi, it, nl, pl, tr, vi, th, id, ms, sv, da, fi, no, uk, cs, ro, el, he, hu, bn).',
              'Do not return anything else.',
              '',
              text,
            ].join('\n'),
          },
        ],
        stream: false,
        temperature: 0,
      }),
      cache: 'no-store',
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.log('[detectLanguage] error:', payload);
    return 'en';
  }

  const raw = String(payload?.choices?.[0]?.message?.content || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  return raw.length === 2 ? raw : 'en';
}
