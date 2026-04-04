import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  Copy,
  Download,
  Languages,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { cn } from '@/shared/lib/utils';

import type { SubtitleItem, VideoChatCopy } from './types';

export function CaptionsPanel({
  activeSubtitleIndex,
  content,
  displayedSubtitleItems,
  isBilingualCaptions,
  isSubtitleTranslating,
  mobile = false,
  subtitleLanguage,
  subtitleLanguages,
  transcriptKey,
  onToggleBilingual,
  onSubtitleLanguageChange,
  onSeekToTimestamp,
  onCopySubtitles,
  onDownloadSubtitles,
}: {
  activeSubtitleIndex: number;
  content: VideoChatCopy;
  displayedSubtitleItems: SubtitleItem[];
  isBilingualCaptions: boolean;
  isSubtitleTranslating: boolean;
  mobile?: boolean;
  subtitleLanguage: string;
  subtitleLanguages: Array<{ value: string; label: string }>;
  transcriptKey: string;
  onToggleBilingual: () => void;
  onSubtitleLanguageChange: (value: string) => void;
  onSeekToTimestamp: (seconds: number) => void;
  onCopySubtitles: () => void | Promise<void>;
  onDownloadSubtitles: () => void;
}) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const autoScrollLockRef = useRef(false);
  const autoScrollUnlockTimeoutRef = useRef<number | null>(null);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const [isCurrentSubtitleInView, setIsCurrentSubtitleInView] = useState(true);

  const currentSubtitle = displayedSubtitleItems[activeSubtitleIndex] || null;

  function checkCurrentSubtitleVisibility() {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    const activeItem = itemRefs.current[activeSubtitleIndex];

    if (!viewport || !activeItem || activeSubtitleIndex < 0) {
      setIsCurrentSubtitleInView(false);
      return false;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const isVisible =
      itemRect.bottom > viewportRect.top && itemRect.top < viewportRect.bottom;

    setIsCurrentSubtitleInView(isVisible);
    return isVisible;
  }

  function scrollToActiveSubtitle(behavior: ScrollBehavior = 'smooth') {
    const activeItem = itemRefs.current[activeSubtitleIndex];
    if (!activeItem) return;

    autoScrollLockRef.current = true;
    activeItem.scrollIntoView({
      behavior,
      block: 'center',
    });

    if (autoScrollUnlockTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollUnlockTimeoutRef.current);
    }

    autoScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      autoScrollLockRef.current = false;
      checkCurrentSubtitleVisibility();
    }, 500);
  }

  useEffect(() => {
    setIsAutoFollowEnabled(true);
    setIsCurrentSubtitleInView(true);
  }, [transcriptKey]);

  useEffect(() => {
    return () => {
      if (autoScrollUnlockTimeoutRef.current !== null) {
        window.clearTimeout(autoScrollUnlockTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;

    const handleScroll = () => {
      const isVisible = checkCurrentSubtitleVisibility();

      if (
        autoScrollLockRef.current ||
        !isAutoFollowEnabled ||
        isVisible ||
        activeSubtitleIndex < 0
      ) {
        return;
      }
      setIsAutoFollowEnabled(false);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [activeSubtitleIndex, isAutoFollowEnabled]);

  useEffect(() => {
    checkCurrentSubtitleVisibility();

    if (!isAutoFollowEnabled || activeSubtitleIndex < 0) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollToActiveSubtitle();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeSubtitleIndex, displayedSubtitleItems, isAutoFollowEnabled]);

  function handleJumpToCurrentSubtitle() {
    setIsAutoFollowEnabled(true);
    scrollToActiveSubtitle();
  }

  return (
    <div
      className={cn(
        'border-border bg-card/80 relative flex h-full min-h-0 flex-col overflow-hidden border shadow-xs',
        mobile ? 'rounded-[18px]' : 'rounded-[18px]'
      )}
    >
      <div
        className={cn(
          'border-border bg-background/95 flex flex-wrap items-center gap-2 border-b',
          mobile ? 'px-2.5 py-1.5' : 'p-3'
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SubtitleActionButton
            icon={Copy}
            label={content.copySubtitles}
            inverted
            compact={mobile}
            onClick={onCopySubtitles}
          />
          <SubtitleActionButton
            icon={Download}
            label={content.downloadSubtitles}
            compact={mobile}
            onClick={onDownloadSubtitles}
          />

          <Select
            value={subtitleLanguage}
            disabled={isSubtitleTranslating}
            onValueChange={onSubtitleLanguageChange}
          >
            <SelectTrigger
              aria-label="Subtitle language"
              className={cn(
                'border-border bg-card text-foreground font-medium shadow-none',
                mobile
                  ? 'h-7 min-w-[50px] gap-1 rounded-md px-2 text-[11px]'
                  : 'h-9 min-w-[168px] rounded-lg text-sm sm:min-w-[220px]'
              )}
            >
              <Languages className={cn('shrink-0', mobile ? 'size-3' : 'size-3.5')} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subtitleLanguages.map((language) => (
                <SelectItem key={language.value} value={language.value}>
                  {language.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <label
              htmlFor="bilingual-captions-switch"
              className={cn(
                'text-foreground font-medium',
                mobile ? 'text-xs' : 'text-sm'
              )}
            >
              {content.bilingualCaptions}
            </label>
            <Switch
              id="bilingual-captions-switch"
              checked={isBilingualCaptions}
              onCheckedChange={onToggleBilingual}
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <ScrollArea ref={scrollAreaRef} className="h-full min-h-0">
          <ul className="m-0 list-none space-y-0 px-2.5 py-2">
            {displayedSubtitleItems.length > 0 ? (
              displayedSubtitleItems.map((item, index) => (
                <li
                  key={`${item.timestamp}-${index}`}
                  ref={(node) => {
                    itemRefs.current[index] = node;
                  }}
                >
                  <MemoizedSubtitleListItem
                    item={item}
                    isActive={index === activeSubtitleIndex}
                    isBilingual={isBilingualCaptions}
                    merged
                    onJumpToTimestamp={onSeekToTimestamp}
                  />
                </li>
              ))
            ) : (
              <li className="text-muted-foreground list-none text-sm leading-7">
                {content.emptyCaptions}
              </li>
            )}
          </ul>
        </ScrollArea>

        {isSubtitleTranslating ? (
          <div className="absolute inset-0 z-10 space-y-0 overflow-hidden px-2.5 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <Skeleton className="mt-0.5 h-5 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {!isAutoFollowEnabled && currentSubtitle && !isCurrentSubtitleInView ? (
        <div className="pointer-events-none absolute top-20 right-4 left-4 z-10 flex justify-center">
          <Button
            type="button"
            onClick={handleJumpToCurrentSubtitle}
            className="pointer-events-auto animate-pulse rounded-full px-4 shadow-lg [animation-duration:2s]"
          >
            <ArrowDown className="size-4" />
            {content.jumpToCurrentSubtitle}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SubtitleActionButton({
  icon: Icon,
  label,
  inverted = false,
  compact = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  inverted?: boolean;
  compact?: boolean;
  onClick?: () => void | Promise<void>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-lg border shadow-none',
        compact ? 'h-7 w-7' : 'h-9 w-9',
        inverted
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent'
          : 'border-border bg-card text-foreground hover:bg-muted'
      )}
    >
      <Icon className={compact ? 'size-3.5' : 'size-4'} />
    </Button>
  );
}

function SubtitleListItem({
  item,
  isBilingual,
  merged,
  isActive,
  onJumpToTimestamp,
}: {
  item: SubtitleItem;
  isBilingual?: boolean;
  merged: boolean;
  isActive?: boolean;
  onJumpToTimestamp?: (seconds: number) => void;
}) {
  const hasTranslatedLine =
    Boolean(item.translatedText) && item.translatedText !== item.originalText;
  const primaryText = isBilingual ? item.originalText : item.text;
  const secondaryText =
    isBilingual && hasTranslatedLine ? item.translatedText : null;

  if (!merged) {
    return (
      <div className="border-border grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[104px_minmax(0,1fr)] md:gap-4">
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => onJumpToTimestamp?.(item.start)}
            className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-85"
          >
            {item.timestamp}
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm leading-7">
            {primaryText}
          </p>
          {secondaryText ? (
            <p className="text-foreground/80 text-sm leading-7">
              {secondaryText}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="py-1.5">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onJumpToTimestamp?.(item.start)}
          className={cn(
            'mt-0.5 inline-flex shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold leading-5 transition-opacity hover:opacity-85',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/12 text-primary dark:bg-primary/18'
          )}
        >
          {item.timestamp}
        </button>
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'text-[13px] leading-6',
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground font-medium'
            )}
          >
            {primaryText}
          </p>
          {secondaryText ? (
            <p className="text-muted-foreground text-[13px] leading-6">
              {secondaryText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MemoizedSubtitleListItem = memo(SubtitleListItem);
