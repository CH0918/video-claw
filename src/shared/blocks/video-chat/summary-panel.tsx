import { memo } from 'react';

import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';
import { VideoAnalysisPayload } from '@/shared/types/video-analysis';

import type { VideoChatCopy } from './types';
import { parseSummaryTimestamp } from './utils';

export const SummaryPanel = memo(function SummaryPanel({
  content,
  analysis,
  isLoading,
  mobile = false,
  onTimestampClick,
}: {
  content: VideoChatCopy;
  analysis: VideoAnalysisPayload | null;
  isLoading: boolean;
  mobile?: boolean;
  onTimestampClick?: (seconds: number) => void;
}) {
  return (
    <div
      className={cn(
        'border-border bg-card/70 h-full overflow-hidden border shadow-xs',
        mobile ? 'rounded-[18px]' : 'rounded-2xl'
      )}
    >
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-5 p-5">
          <h1 className="text-base font-bold tracking-tight lg:text-lg">
            {analysis?.videoInfo.title || 'YouTube Video'}
          </h1>

          <div>
            <p className="text-muted-foreground text-[13px] leading-6">
              {isLoading
                ? content.summaryLoading
                : analysis?.summary.overview || content.summaryEmpty}
            </p>

            <div className="mt-5 space-y-4">
              {(analysis?.summary.points || []).map((point, index) => {
                const timestamp = parseSummaryTimestamp(point.timestamp);

                return (
                  <div
                    key={`${point.timestamp || 'point'}-${index}`}
                    className="flex gap-1.5"
                  >
                    <div className="text-primary shrink-0 pt-0.5 text-[13px] font-semibold">
                      {index + 1}.
                    </div>
                    <p className="text-muted-foreground text-[13px] leading-6">
                      {timestamp ? (
                        <button
                          type="button"
                          onClick={() => onTimestampClick?.(timestamp.seconds)}
                          className="text-primary hover:bg-primary/10 mr-1 inline-flex rounded-md px-1 py-0.5 text-sm font-semibold transition-colors"
                        >
                          [{timestamp.label}]
                        </button>
                      ) : null}
                      {point.title ? `${point.title}: ` : ''}
                      {point.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});
