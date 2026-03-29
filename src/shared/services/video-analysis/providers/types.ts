import {
  TopicRange,
  VideoChatAnswer,
  VideoChatStreamChunk,
  TranscriptSegment,
  VideoChatMessage,
  VideoInfo,
  VideoSummary,
} from '@/shared/types/video-analysis';

export type TranscriptProviderConfig = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export type ReasoningProviderConfig = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  models?: Partial<Record<ReasoningModelPurpose, string>>;
};

export type ReasoningModelPurpose =
  | 'default'
  | 'translate'
  | 'topics'
  | 'summary'
  | 'chat';

export function getReasoningModel(
  config: ReasoningProviderConfig,
  purpose: ReasoningModelPurpose,
  overrideModel?: string
) {
  const requestedModel = String(overrideModel || '').trim();
  if (requestedModel) {
    return requestedModel;
  }

  return (
    config.models?.[purpose] ||
    config.models?.default ||
    config.model
  );
}

export type TranscriptTaskResult = {
  status: 'pending' | 'processing' | 'success' | 'error';
  transcript?: TranscriptSegment[];
  language?: string;
  title?: string;
  author?: string;
  durationSeconds?: number;
  meta?: Record<string, unknown>;
  errorMessage?: string;
};

export interface TranscriptProvider {
  name: string;
  submitVideo(input: { url: string }): Promise<{
    taskId: string;
    meta?: Record<string, unknown>;
  }>;
  getTaskStatus(taskId: string): Promise<TranscriptTaskResult>;
}

export interface VideoReasoningProvider {
  name: string;
  translateTexts(input: {
    texts: string[];
    targetLanguage: string;
    sourceLanguage?: string;
    videoInfo?: Partial<VideoInfo>;
  }): Promise<string[]>;
  generateTopics(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    theme?: string;
    maxTopics?: number;
  }): Promise<TopicRange[]>;
  generateSummary(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
  }): Promise<VideoSummary>;
  answerQuestion(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
    model?: string;
  }): Promise<VideoChatAnswer>;
  streamAnswerQuestion?(input: {
    transcript: TranscriptSegment[];
    videoInfo: Partial<VideoInfo>;
    messages: VideoChatMessage[];
    model?: string;
  }): AsyncGenerator<VideoChatStreamChunk, void, void>;
}
