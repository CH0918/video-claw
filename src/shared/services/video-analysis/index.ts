import { getAllConfigs } from '@/shared/models/config';
import {
  buildVideoAnalysisPayload,
  createVideoAnalysis,
  findVideoAnalysisById,
  findVideoAnalysisBySource,
  updateVideoAnalysis,
} from '@/shared/models/video_analysis';
import {
  TranscriptSegment,
  VideoAnalysisPayload,
  VideoChatMessage,
} from '@/shared/types/video-analysis';

import { normalizeTranscript } from '@/shared/lib/video-analysis/transcript';
import { normalizeYouTubeUrl, extractYouTubeVideoId } from '@/shared/lib/video-analysis/youtube';

import {
  getTranscriptProvider,
  getVideoReasoningProvider,
} from './providers';

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
      provider: configs.video_transcript_provider || 'deapi',
      baseUrl: configs.video_transcript_base_url || 'https://api.deapi.ai',
      apiKey: requireValue(
        configs.video_transcript_api_key || '',
        'video_transcript_api_key is not set'
      ),
      model: configs.video_transcript_model || 'WhisperLargeV3',
    },
    reasoning: {
      provider: configs.video_reasoning_provider || 'deepseek',
      baseUrl: configs.video_reasoning_base_url || 'https://api.deepseek.com',
      apiKey: requireValue(
        configs.video_reasoning_api_key || '',
        'video_reasoning_api_key is not set'
      ),
      model: configs.video_reasoning_model || 'deepseek-chat',
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

export async function startVideoAnalysis(url: string) {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const sourceId = extractYouTubeVideoId(url);

  if (!normalizedUrl || !sourceId) {
    throw new Error('Only YouTube URLs are supported');
  }

  const existing = await findVideoAnalysisBySource('youtube', sourceId);
  if (existing?.status === 'success') {
    return {
      analysisId: existing.id,
      status: 'success' as const,
      analysis: buildVideoAnalysisPayload(existing),
    };
  }

  if (existing?.status === 'pending' || existing?.status === 'processing') {
    return {
      analysisId: existing.id,
      status: existing.status as 'pending' | 'processing',
    };
  }

  const providerConfigs = await getVideoAnalysisConfigs();
  const transcriptProvider = getTranscriptProvider(providerConfigs.transcript);
  const oembed = await fetchYouTubeOEmbed(normalizedUrl);
  const submitted = await transcriptProvider.submitVideo({ url: normalizedUrl });

  const now = new Date();

  const record =
    existing
      ? await updateVideoAnalysis(existing.id, {
          sourceUrl: normalizedUrl,
          status: 'pending',
          title: oembed.title || existing.title,
          author: oembed.author || existing.author,
          thumbnailUrl: oembed.thumbnailUrl || existing.thumbnailUrl,
          provider: providerConfigs.transcript.provider,
          providerModel: providerConfigs.transcript.model,
          providerTaskId: submitted.taskId,
          providerMeta: JSON.stringify(submitted.meta || {}),
          errorMessage: null,
          updatedAt: now,
        })
      : await createVideoAnalysis({
          id: crypto.randomUUID(),
          sourceType: 'youtube',
          sourceId,
          sourceUrl: normalizedUrl,
          status: 'pending',
          title: oembed.title || '',
          author: oembed.author || '',
          thumbnailUrl: oembed.thumbnailUrl || '',
          provider: providerConfigs.transcript.provider,
          providerModel: providerConfigs.transcript.model,
          providerTaskId: submitted.taskId,
          providerMeta: JSON.stringify(submitted.meta || {}),
          createdAt: now,
          updatedAt: now,
        });

  return {
    analysisId: record.id,
    status: 'pending' as const,
  };
}

async function runReasoningForTranscript(
  transcript: TranscriptSegment[],
  videoInfo: ReturnType<typeof buildVideoMetadata>
) {
  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);
  const [topics, summary] = await Promise.all([
    reasoningProvider.generateTopics({
      transcript,
      videoInfo,
      maxTopics: 4,
    }),
    reasoningProvider.generateSummary({
      transcript,
      videoInfo,
    }),
  ]);

  return {
    providerName: providerConfigs.reasoning.provider,
    providerModel: providerConfigs.reasoning.model,
    topics,
    summary,
  };
}

export async function getVideoAnalysisStatus(analysisId: string) {
  const record = await findVideoAnalysisById(analysisId);
  if (!record) {
    throw new Error('analysis not found');
  }

  if (record.status === 'success') {
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
  const transcriptProvider = getTranscriptProvider(providerConfigs.transcript);
  const task = await transcriptProvider.getTaskStatus(record.providerTaskId);

  if (task.status === 'pending' || task.status === 'processing') {
    await updateVideoAnalysis(record.id, {
      status: task.status,
      providerMeta: JSON.stringify(task.meta || {}),
      errorMessage: null,
      updatedAt: new Date(),
    });

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
  messages: VideoChatMessage[]
) {
  const record = await findVideoAnalysisById(analysisId);
  if (!record || record.status !== 'success') {
    throw new Error('analysis is not ready');
  }

  const transcript = normalizeTranscript(JSON.parse(record.transcript || '[]'));
  const providerConfigs = await getVideoAnalysisConfigs();
  const reasoningProvider = getVideoReasoningProvider(providerConfigs.reasoning);

  return reasoningProvider.answerQuestion({
    transcript,
    videoInfo: buildVideoAnalysisPayload(record).videoInfo,
    messages,
  });
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
