import { type RefObject } from 'react';
import { Play } from 'lucide-react';

export function VideoPlayerCard({
  iframeRef,
  title,
  videoEmbedUrl,
  onAnalyze,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  title: string;
  videoEmbedUrl: string | null;
  onAnalyze: () => void;
}) {
  return (
    <div className="bg-foreground relative shrink-0 overflow-hidden rounded-2xl shadow-sm">
      {videoEmbedUrl ? (
        <iframe
          ref={iframeRef}
          src={videoEmbedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="aspect-video w-full"
        />
      ) : (
        <div className="aspect-video w-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
      )}

      {!videoEmbedUrl ? (
        <button
          className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/10 text-primary-foreground backdrop-blur-sm transition hover:bg-foreground/15"
          type="button"
          aria-label="Play video"
          onClick={onAnalyze}
        >
          <Play className="size-7 fill-current" />
        </button>
      ) : null}
    </div>
  );
}
