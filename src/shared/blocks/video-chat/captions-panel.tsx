import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ChevronDown,
  Copy,
  Download,
  Languages,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { ClaudeCodeLoading } from '@/shared/components/ui/claude-code-loading';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
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
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const isVisible =
      itemRect.bottom > viewportRect.top && itemRect.top < viewportRect.bottom;

    setIsCurrentSubtitleInView(isVisible);
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
      checkCurrentSubtitleVisibility();

      if (autoScrollLockRef.current || !isAutoFollowEnabled) return;
      setIsAutoFollowEnabled(false);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [isAutoFollowEnabled]);

  useEffect(() => {
    checkCurrentSubtitleVisibility();

    if (!isAutoFollowEnabled || activeSubtitleIndex < 0) return;

    const activeItem = itemRefs.current[activeSubtitleIndex];
    if (!activeItem) return;

    autoScrollLockRef.current = true;
    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    if (autoScrollUnlockTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollUnlockTimeoutRef.current);
    }

    autoScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      autoScrollLockRef.current = false;
      checkCurrentSubtitleVisibility();
    }, 450);
  }, [activeSubtitleIndex, isAutoFollowEnabled]);

  function handleJumpToCurrentSubtitle() {
    setIsAutoFollowEnabled(true);
    const activeItem = itemRefs.current[activeSubtitleIndex];
    if (!activeItem) return;

    autoScrollLockRef.current = true;
    activeItem.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    if (autoScrollUnlockTimeoutRef.current !== null) {
      window.clearTimeout(autoScrollUnlockTimeoutRef.current);
    }

    autoScrollUnlockTimeoutRef.current = window.setTimeout(() => {
      autoScrollLockRef.current = false;
      checkCurrentSubtitleVisibility();
    }, 450);
  }

  return (
    <div
      className={cn(
        'border-border bg-card/80 relative flex h-full min-h-0 flex-col overflow-hidden border shadow-xs',
        mobile ? 'rounded-[18px]' : 'rounded-[18px]'
      )}
    >
      <div className="border-border bg-background/95 flex flex-wrap items-center gap-2 border-b p-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <SubtitleActionButton
            icon={Copy}
            label={content.copySubtitles}
            inverted
            onClick={onCopySubtitles}
          />
          <SubtitleActionButton
            icon={Download}
            label={content.downloadSubtitles}
            onClick={onDownloadSubtitles}
          />

          <div className="relative">
            <Languages className="text-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <select
              aria-label="Subtitle language"
              disabled={isSubtitleTranslating}
              value={subtitleLanguage}
              onChange={(event) => onSubtitleLanguageChange(event.target.value)}
              className={cn(
                'border-border bg-card text-foreground focus-visible:border-primary appearance-none border py-0 pr-9 pl-8 font-medium shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                mobile
                  ? 'h-8 min-w-[50px] rounded-md pr-8 pl-7 text-[11px]'
                  : 'h-9 min-w-[168px] rounded-lg text-sm sm:min-w-[220px]'
              )}
            >
              {subtitleLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <label
              htmlFor="bilingual-captions-switch"
              className="text-foreground text-sm font-medium"
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
          <ul className="space-y-3 p-4 list-none m-0">
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
              <li className="text-muted-foreground text-sm leading-7 list-none">
                {content.emptyCaptions}
              </li>
            )}
          </ul>
        </ScrollArea>

        {isSubtitleTranslating ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <ClaudeCodeLoading label={content.translatingCaptions} />
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
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  inverted?: boolean;
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
        'h-9 w-9 rounded-lg border shadow-none',
        inverted
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent'
          : 'border-border bg-card text-foreground hover:bg-muted'
      )}
    >
      <Icon className="size-4" />
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
    <div
      className={cn(
        'rounded-2xl px-4 py-4',
        isActive ? 'bg-accent/70 dark:bg-accent/35' : 'bg-transparent'
      )}
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => onJumpToTimestamp?.(item.start)}
          className="bg-primary/12 text-primary dark:bg-primary/18 inline-flex shrink-0 rounded-xl px-2.5 py-1.5 text-sm font-semibold transition-opacity hover:opacity-85"
        >
          {item.timestamp}
        </button>
        <div className="min-w-0 space-y-2">
          <p className="text-foreground text-sm leading-7 font-medium">
            {primaryText}
          </p>
          {secondaryText ? (
            <p className="text-muted-foreground text-sm leading-7">
              {secondaryText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const MemoizedSubtitleListItem = memo(SubtitleListItem);
