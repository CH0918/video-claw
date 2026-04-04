import { type RefObject } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

import { VideoPlayerCard } from './video-player-card';

export function MobileVideoDock({
  iframeRef,
  title,
  videoEmbedUrl,
  isCollapsed,
  collapseLabel,
  expandLabel,
  onAnalyze,
  onToggleCollapse,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  title: string;
  videoEmbedUrl: string | null;
  isCollapsed: boolean;
  collapseLabel: string;
  expandLabel: string;
  onAnalyze: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'grid overflow-hidden rounded-2xl transition-[grid-template-rows,opacity] duration-300',
          isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        )}
      >
        <div className="min-h-0">
          <VideoPlayerCard
            iframeRef={iframeRef}
            title={title}
            videoEmbedUrl={videoEmbedUrl}
            onAnalyze={onAnalyze}
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
        className="bg-background/96 border-border text-foreground h-9 w-full rounded-full shadow-xs backdrop-blur"
      >
        {isCollapsed ? expandLabel : collapseLabel}
        {isCollapsed ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronUp className="size-4" />
        )}
      </Button>
    </div>
  );
}
