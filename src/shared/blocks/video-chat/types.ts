import type {
  VideoChatCitation,
} from '@/shared/types/video-analysis';

export type VideoChatCopy = {
  analyze: string;
  askPlaceholder: string;
  authLanguage: string;
  bilingualCaptions: string;
  captions: string;
  chat: string;
  chatStreaming: string;
  copyReply: string;
  copyReplyFailed: string;
  copyReplySuccess: string;
  copySubtitles: string;
  collapseVideo: string;
  credits: string;
  downloadSubtitles: string;
  emptyCaptions: string;
  emptyChat: string;
  expandVideo: string;
  exportPrompt: string;
  jumpToCurrentSubtitle: string;
  modelLabel: string;
  mindMap: string;
  mindMapBody: string;
  mindMapHeading: string;
  notes: string;
  notesBody: string;
  notesHeading: string;
  pasteLink: string;
  pasteLinkFailed: string;
  pasteLinkSuccess: string;
  prompts: string[];
  searchPlaceholder: string;
  sendFailed: string;
  summary: string;
  summaryEmpty: string;
  summaryHeading: string;
  summaryLoading: string;
  analysisFailed: string;
  translatingCaptions: string;
  translationFailed: string;
  moreActions: string;
  chatActionsTitle: string;
  chatActionsDescription: string;
  copy: string;
  clear: string;
  clearChatConfirm: string;
  skill: string;
  skipToContent: string;
  dismissError: string;
};

export type VideoChatPageProps = {
  locale: string;
  initialUrl?: string;
};

export type Message = {
  role: 'assistant' | 'user';
  text: string;
  timestamps?: string[];
  citations?: VideoChatCitation[];
  isStreaming?: boolean;
};

export type SubtitleItem = {
  timestamp: string;
  text: string;
  start: number;
  originalText: string;
  translatedText?: string;
};

export type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime: () => number;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

export type YouTubeNamespace = {
  Player: new (
    element: HTMLIFrameElement,
    options?: {
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data?: T;
};
