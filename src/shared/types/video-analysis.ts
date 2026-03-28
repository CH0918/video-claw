export type VideoAnalysisStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'error';

export type TranscriptExportFormat = 'txt' | 'srt';

export type TranscriptSegment = {
  text: string;
  start: number;
  duration: number;
};

export type TopicRangeSegment = {
  start: number;
  end: number;
  text: string;
  startSegmentIdx?: number;
  endSegmentIdx?: number;
  startCharOffset?: number;
  endCharOffset?: number;
  hasCompleteSentences?: boolean;
};

export type TopicRange = {
  id: string;
  label: string;
  segments: TopicRangeSegment[];
  theme?: string;
  durationSeconds?: number;
};

export type VideoSummaryPoint = {
  title: string;
  text: string;
  timestamp?: string;
};

export type VideoSummary = {
  overview: string;
  points: VideoSummaryPoint[];
};

export type VideoInfo = {
  videoId: string;
  url: string;
  title: string;
  author?: string;
  thumbnailUrl?: string;
  description?: string;
  durationSeconds?: number;
  language?: string;
};

export type VideoAnalysisPayload = {
  analysisId: string;
  status: VideoAnalysisStatus;
  videoInfo: VideoInfo;
  transcript: TranscriptSegment[];
  topics: TopicRange[];
  summary: VideoSummary;
};

export type VideoChatMessage = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};
