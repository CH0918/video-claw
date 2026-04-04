import { memo } from 'react';

import { ClaudeCodeLoading } from '@/shared/components/ui/claude-code-loading';
import { cn } from '@/shared/lib/utils';

import type { Message, VideoChatCopy } from './types';
import { parseChatTimestampReference } from './utils';

export const ChatBubble = memo(function ChatBubble({
  message,
  mobile = false,
  onTimestampClick,
  streamingLabel,
}: {
  message: Message;
  mobile?: boolean;
  onTimestampClick?: (seconds: number) => void;
  streamingLabel?: string;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            'bg-primary/8 dark:bg-primary/12 max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5',
            mobile ? 'text-[13px] leading-6' : 'text-sm leading-6'
          )}
        >
          <p className="text-primary font-semibold">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  const citationsByTimestamp = new Map(
    (message.citations || []).map((citation) => [citation.timestamp, citation])
  );
  const lines = message.text.split('\n');
  const hasMessageText = Boolean(message.text.trim());
  const showBubbleChrome = hasMessageText || !message.isStreaming;

  function renderTextWithTimestamps(
    line: string,
    lineIndex: number,
    keyPrefix = 'line'
  ) {
    const parts: React.ReactNode[] = [];
    const matcher = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.exec(line)) !== null) {
      const [rawMatch, content] = match;
      const timestamps = content
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => parseChatTimestampReference(item))
        .filter(
          (
            item
          ): item is {
            normalized: string;
            seconds: number;
            label: string;
          } => Boolean(item)
        );

      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (timestamps.length === 0) {
        parts.push(rawMatch);
      } else {
        timestamps.forEach((timestamp, timestampIndex) => {
          const citation = citationsByTimestamp.get(timestamp.normalized);
          const targetSeconds = citation?.start ?? timestamp.seconds;

          parts.push(
            <button
              key={`ts-${keyPrefix}-${lineIndex}-${match?.index}-${timestampIndex}`}
              type="button"
              onClick={() => onTimestampClick?.(targetSeconds)}
              className="text-primary hover:bg-primary/10 inline-flex rounded-md px-1 py-0.5 text-sm font-semibold transition-colors"
            >
              [{citation?.timestamp || timestamp.label}]
            </button>
          );
          if (timestampIndex < timestamps.length - 1) {
            parts.push(
              <span
                key={`ts-sep-${keyPrefix}-${lineIndex}-${match?.index}-${timestampIndex}`}
                className="text-muted-foreground px-0.5"
              >
                {' '}
              </span>
            );
          }
        });
      }

      lastIndex = match.index + rawMatch.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
  }

  function renderFormattedLine(line: string, lineIndex: number) {
    const segments = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);

    return segments.map((segment, segmentIndex) => {
      const isBold = segment.startsWith('**') && segment.endsWith('**');
      const content = isBold ? segment.slice(2, -2) : segment;
      const rendered = renderTextWithTimestamps(
        content,
        lineIndex,
        `${segmentIndex}-${isBold ? 'bold' : 'text'}`
      );

      if (!isBold) {
        return <span key={`seg-${lineIndex}-${segmentIndex}`}>{rendered}</span>;
      }

      return (
        <strong
          key={`seg-${lineIndex}-${segmentIndex}`}
          className="text-foreground font-semibold"
        >
          {rendered}
        </strong>
      );
    });
  }

  return (
    <div className="flex items-start">
      <div
        className={cn(
          'text-foreground max-w-full',
          mobile ? 'text-[13px] leading-6' : 'text-sm leading-7',
          showBubbleChrome
            ? 'bg-muted/50 relative rounded-2xl rounded-tl-sm px-3.5 py-2.5'
            : 'py-1'
        )}
      >
        {hasMessageText ? (
          <div className="space-y-2">
            {lines.map((line, index) => {
              if (!line) {
                return <div key={`line-${index}`} className="h-3" />;
              }

              const bulletMatch = line.match(/^(\*|-)\s+(.+)/);
              if (bulletMatch) {
                return (
                  <p key={`line-${index}`} className="flex gap-1.5">
                    <span className="shrink-0 select-none">•</span>
                    <span>{renderFormattedLine(bulletMatch[2], index)}</span>
                  </p>
                );
              }

              return (
                <p key={`line-${index}`}>{renderFormattedLine(line, index)}</p>
              );
            })}
          </div>
        ) : null}
        {message.isStreaming ? (
          <div className={cn(hasMessageText ? 'mt-2' : 'px-1')}>
            <ClaudeCodeLoading label={streamingLabel || 'Streaming response'} />
          </div>
        ) : null}
      </div>
    </div>
  );
});
