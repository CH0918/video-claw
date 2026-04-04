import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Clipboard,
  Eraser,
  Plus,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  SUPPORTED_AI_MODELS,
  SupportedAIModelId,
} from '@/shared/lib/ai-models';
import { cn } from '@/shared/lib/utils';

import { ChatBubble } from './chat-bubble';
import type { Message, VideoChatCopy } from './types';

export function ChatPanel({
  chatInput,
  chatInputPlaceholder,
  chatMessages,
  chatModel,
  chatScrollAreaRef,
  content,
  isChatAutoFollowEnabled,
  isChatLoading,
  analysisState,
  mobile = false,
  selectedSkill,
  onChatAutoFollowChange,
  onChatInputChange,
  onChatModelChange,
  onClearChatInput,
  onClearChat,
  onCopyChatExport,
  onSendChat,
  onSkillSelect,
  onTimestampClick,
}: {
  chatInput: string;
  chatInputPlaceholder: string;
  chatMessages: Message[];
  chatModel: SupportedAIModelId;
  chatScrollAreaRef: RefObject<HTMLDivElement | null>;
  content: VideoChatCopy;
  isChatAutoFollowEnabled: boolean;
  isChatLoading: boolean;
  analysisState: 'idle' | 'submitting' | 'polling' | 'ready' | 'error';
  mobile?: boolean;
  selectedSkill: string;
  onChatAutoFollowChange: (value: boolean) => void;
  onChatInputChange: (value: string) => void;
  onChatModelChange: (value: SupportedAIModelId) => void;
  onClearChatInput: () => void;
  onClearChat: () => void;
  onCopyChatExport: () => void;
  onSendChat: () => void;
  onSkillSelect: (value: string) => void;
  onTimestampClick: (seconds: number) => void;
}) {
  const [isActionCardOpen, setIsActionCardOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const actionCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActionCardOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionCardRef.current &&
        !actionCardRef.current.contains(event.target as Node)
      ) {
        setIsActionCardOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionCardOpen]);

  useEffect(() => {
    const viewport = chatScrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport) return;

    const isNearBottom = () =>
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 32;
    const syncAutoFollow = () => {
      if (viewport.getClientRects().length === 0) return;
      onChatAutoFollowChange(isNearBottom());
    };

    syncAutoFollow();
    viewport.addEventListener('scroll', syncAutoFollow, { passive: true });

    return () => {
      viewport.removeEventListener('scroll', syncAutoFollow);
    };
  }, [chatScrollAreaRef, onChatAutoFollowChange]);

  useEffect(() => {
    if (!isChatAutoFollowEnabled) return;

    const viewport = chatScrollAreaRef.current?.querySelector<HTMLDivElement>(
      '[data-radix-scroll-area-viewport]'
    );
    if (!viewport || viewport.getClientRects().length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'auto',
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [chatScrollAreaRef, isChatAutoFollowEnabled]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className={cn(
          'border-border bg-card/80 flex min-h-0 flex-1 flex-col overflow-hidden border shadow-xs',
          mobile
            ? 'rounded-[18px]'
            : 'rounded-none border-0 bg-transparent shadow-none'
        )}
      >
        <ScrollArea
          ref={chatScrollAreaRef}
          className={cn(
            'h-full min-h-0',
            mobile ? 'px-3 py-3' : 'h-0 flex-1 px-5 py-5'
          )}
        >
          <div className="space-y-4 pb-4" role="log" aria-live="polite">
            {chatMessages.length > 0 ? (
              <ul className="m-0 list-none space-y-4 p-0">
                {chatMessages.map((message, index) => (
                  <li key={`${message.role}-${index}`}>
                    <ChatBubble
                      message={message}
                      mobile={mobile}
                      onTimestampClick={onTimestampClick}
                      streamingLabel={content.chatStreaming}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground text-sm leading-7">
                {content.emptyChat}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          'border-border shrink-0',
          mobile ? 'py-2' : 'space-y-3 border-t px-5 py-4'
        )}
      >
        <div className={cn(mobile ? '' : 'space-y-3 px-1 pt-1')}>
          <div
            className={cn(
              'border-border bg-card w-full border shadow-xs',
              mobile ? 'rounded-[18px] px-3 py-2' : 'rounded-[24px] px-4 py-3'
            )}
          >
            <Textarea
              aria-label="Ask anything about this video"
              rows={mobile ? 1 : 2}
              maxLength={5000}
              value={chatInput}
              onChange={(event) => onChatInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) {
                  return;
                }

                event.preventDefault();
                if (analysisState === 'ready' && !isChatLoading) {
                  onSendChat();
                }
              }}
              className={cn(
                'text-foreground placeholder:text-muted-foreground/50 resize-none border-0 !bg-transparent px-0 py-0 shadow-none focus-visible:ring-offset-0',
                mobile
                  ? 'min-h-10 text-sm focus-visible:ring-0'
                  : 'min-h-20 text-base focus-visible:ring-0'
              )}
              placeholder={chatInputPlaceholder}
            />
            {mobile ? (
              <div className="relative mt-1.5 flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={content.clear}
                  onClick={() => {
                    if (chatMessages.length === 0) return;
                    setIsClearDialogOpen(true);
                  }}
                  className="text-muted-foreground hover:text-foreground size-8 shrink-0 rounded-full"
                >
                  <Eraser className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={content.copy}
                  onClick={onCopyChatExport}
                  className="text-muted-foreground hover:text-foreground size-8 shrink-0 rounded-full"
                >
                  <Clipboard className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={content.moreActions}
                  onClick={() => setIsActionCardOpen((v) => !v)}
                  className={cn(
                    'size-8 shrink-0 rounded-full',
                    isActionCardOpen
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Plus className="size-3.5" />
                </Button>

                {isActionCardOpen && (
                  <div
                    ref={actionCardRef}
                    className="border-border bg-card absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border p-3 shadow-lg"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-foreground text-xs font-medium">
                        {content.chatActionsTitle}
                      </span>
                      <button
                        type="button"
                        aria-label="Close"
                        onClick={() => setIsActionCardOpen(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="relative">
                        <select
                          aria-label={content.skill}
                          value={selectedSkill}
                          onChange={(event) => {
                            onSkillSelect(event.target.value);
                            setIsActionCardOpen(false);
                          }}
                          className="border-border bg-background text-foreground focus-visible:border-primary focus-visible:ring-ring/30 h-8 w-full appearance-none rounded-lg border py-0 pr-8 pl-3 text-xs font-medium shadow-none outline-none focus-visible:ring-2"
                        >
                          <option value="">{content.skill}</option>
                          {content.prompts.map((prompt) => (
                            <option key={prompt} value={prompt}>
                              {prompt}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2" />
                      </div>
                      <div className="relative">
                        <select
                          aria-label={content.modelLabel}
                          value={chatModel}
                          onChange={(event) =>
                            onChatModelChange(
                              event.target.value as SupportedAIModelId
                            )
                          }
                          className="border-border bg-background text-foreground focus-visible:border-primary focus-visible:ring-ring/30 h-8 w-full appearance-none rounded-lg border py-0 pr-8 pl-3 text-xs font-medium shadow-none outline-none focus-visible:ring-2"
                        >
                          {SUPPORTED_AI_MODELS.map((modelOption) => (
                            <option key={modelOption.id} value={modelOption.id}>
                              {modelOption.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex-1" />

                <Button
                  size="icon"
                  type="button"
                  aria-label="Send message"
                  disabled={analysisState !== 'ready' || isChatLoading}
                  onClick={onSendChat}
                  className={cn(
                    'size-8 shrink-0 rounded-full',
                    chatInput.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-primary/20 text-primary hover:bg-primary/25'
                  )}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select
                  value={selectedSkill}
                  onValueChange={onSkillSelect}
                >
                  <SelectTrigger
                    aria-label={content.skill}
                    className="border-border bg-background text-foreground h-10 min-w-[132px] rounded-full border px-4 text-sm font-semibold shadow-none focus:ring-0 focus-visible:ring-0"
                  >
                    <SelectValue placeholder={content.skill} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {content.prompts.map((prompt) => (
                      <SelectItem key={prompt} value={prompt}>
                        {prompt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={chatModel}
                  onValueChange={(value) =>
                    onChatModelChange(value as SupportedAIModelId)
                  }
                >
                  <SelectTrigger
                    aria-label={content.modelLabel}
                    className="border-border bg-background text-foreground h-10 min-w-[182px] rounded-full border px-4 text-sm font-semibold shadow-none focus:ring-0 focus-visible:ring-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {SUPPORTED_AI_MODELS.map((modelOption) => (
                      <SelectItem key={modelOption.id} value={modelOption.id}>
                        {modelOption.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Copy"
                  onClick={onCopyChatExport}
                  className="text-muted-foreground hover:text-foreground size-10 rounded-full"
                >
                  <Clipboard className="size-5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear"
                  onClick={onClearChatInput}
                  className="text-muted-foreground hover:text-foreground size-10 rounded-full"
                >
                  <Eraser className="size-5" />
                </Button>

                <Button
                  size="icon"
                  type="button"
                  aria-label="Send message"
                  disabled={analysisState !== 'ready' || isChatLoading}
                  onClick={onSendChat}
                  className={cn(
                    'ml-auto size-10 rounded-full',
                    chatInput.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-primary/20 text-primary hover:bg-primary/25'
                  )}
                >
                  <ArrowUp className="size-4.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {content.clear}
            </DialogTitle>
            <DialogDescription>
              {content.clearChatConfirm}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setIsClearDialogOpen(false)}
            >
              {content.dismissError}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 rounded-full"
              onClick={() => {
                onClearChat();
                setIsClearDialogOpen(false);
              }}
            >
              {content.clear}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
