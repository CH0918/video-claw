import { useState, type RefObject } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Clipboard,
  Eraser,
  SlidersHorizontal,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
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
  isChatLoading,
  analysisState,
  mobile = false,
  selectedSkill,
  onChatInputChange,
  onChatModelChange,
  onClearChatInput,
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
  isChatLoading: boolean;
  analysisState: 'idle' | 'submitting' | 'polling' | 'ready' | 'error';
  mobile?: boolean;
  selectedSkill: string;
  onChatInputChange: (value: string) => void;
  onChatModelChange: (value: SupportedAIModelId) => void;
  onClearChatInput: () => void;
  onCopyChatExport: () => void;
  onSendChat: () => void;
  onSkillSelect: (value: string) => void;
  onTimestampClick: (seconds: number) => void;
}) {
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);

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
              <ul className="space-y-4 list-none p-0 m-0">
                {chatMessages.map((message, index) => (
                  <li key={`${message.role}-${index}`}>
                    <ChatBubble
                      copyFailedLabel={content.copyReplyFailed}
                      copyLabel={content.copyReply}
                      copySuccessLabel={content.copyReplySuccess}
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
                'text-foreground resize-none border-0 !bg-transparent px-0 py-0 shadow-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0',
                mobile
                  ? 'min-h-10 text-sm placeholder:text-[11px]'
                  : 'min-h-20 text-base placeholder:text-sm'
              )}
              placeholder={chatInputPlaceholder}
            />
            {mobile ? (
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsActionDrawerOpen(true)}
                  className="border-border bg-background text-foreground h-11 flex-1 justify-center rounded-full px-3 text-xs font-medium shadow-none"
                >
                  <SlidersHorizontal className="size-3.5" />
                  {content.moreActions}
                </Button>

                <Button
                  size="icon"
                  type="button"
                  aria-label="Send message"
                  disabled={analysisState !== 'ready' || isChatLoading}
                  onClick={onSendChat}
                  className={cn(
                    'size-11 shrink-0 rounded-full',
                    chatInput.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-primary/20 text-primary hover:bg-primary/25'
                  )}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <select
                    aria-label={content.skill}
                    value={selectedSkill}
                    onChange={(event) => onSkillSelect(event.target.value)}
                    className="border-border bg-background text-foreground focus-visible:border-primary h-10 min-w-[132px] appearance-none rounded-full border py-0 pr-9 pl-4 text-sm font-semibold shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <option value="">{content.skill}</option>
                    {content.prompts.map((prompt) => (
                      <option key={prompt} value={prompt}>
                        {prompt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
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
                    className="border-border bg-background text-foreground focus-visible:border-primary h-10 min-w-[182px] appearance-none rounded-full border py-0 pr-9 pl-4 text-sm font-semibold shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {SUPPORTED_AI_MODELS.map((modelOption) => (
                      <option key={modelOption.id} value={modelOption.id}>
                        {modelOption.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
                </div>

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

      {mobile ? (
        <Drawer open={isActionDrawerOpen} onOpenChange={setIsActionDrawerOpen}>
          <DrawerContent className="rounded-t-[28px]">
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-base">{content.chatActionsTitle}</DrawerTitle>
              <DrawerDescription>
                {content.chatActionsDescription}
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-2">
                <label className="text-foreground text-xs font-medium">
                  {content.skill}
                </label>
                <div className="relative">
                  <select
                    aria-label={content.skill}
                    value={selectedSkill}
                    onChange={(event) => {
                      onSkillSelect(event.target.value);
                      setIsActionDrawerOpen(false);
                    }}
                    className="border-border bg-background text-foreground focus-visible:border-primary h-11 w-full appearance-none rounded-2xl border py-0 pr-10 pl-4 text-sm font-medium shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <option value="">{content.skill}</option>
                    {content.prompts.map((prompt) => (
                      <option key={prompt} value={prompt}>
                        {prompt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-foreground text-xs font-medium">
                  {content.modelLabel}
                </label>
                <div className="relative">
                  <select
                    aria-label={content.modelLabel}
                    value={chatModel}
                    onChange={(event) =>
                      onChatModelChange(
                        event.target.value as SupportedAIModelId
                      )
                    }
                    className="border-border bg-background text-foreground focus-visible:border-primary h-11 w-full appearance-none rounded-2xl border py-0 pr-10 pl-4 text-sm font-medium shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {SUPPORTED_AI_MODELS.map((modelOption) => (
                      <option key={modelOption.id} value={modelOption.id}>
                        {modelOption.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCopyChatExport}
                  className="h-10 rounded-xl"
                >
                  <Clipboard className="size-4" />
                  {content.copy}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearChatInput}
                  className="h-10 rounded-xl"
                >
                  <Eraser className="size-4" />
                  {content.clear}
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}
    </div>
  );
}
