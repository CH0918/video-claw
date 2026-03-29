'use client';

import { useEffect, useState } from 'react';
import { UIMessage, UseChatHelpers } from '@ai-sdk/react';
import { BrainCircuitIcon, GlobeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  GENERAL_CHAT_DEFAULT_MODEL,
  getSupportedAIModel,
  SUPPORTED_AI_MODELS,
} from '@/shared/lib/ai-models';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from '@/shared/components/ai-elements/prompt-input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';

export function ChatInput({
  handleSubmit,
  status,
  error,
  onInputChange,
  initialModel = GENERAL_CHAT_DEFAULT_MODEL,
}: {
  handleSubmit: (
    message: PromptInputMessage,
    body: Record<string, any>
  ) => void | Promise<void>;
  status?: UseChatHelpers<UIMessage>['status'];
  error?: string | null;
  onInputChange?: (value: string) => void;
  initialModel?: string;
}) {
  const t = useTranslations('ai.chat.generator');
  const normalizedInitialModel =
    getSupportedAIModel(initialModel)?.id || GENERAL_CHAT_DEFAULT_MODEL;

  const [model, setModel] = useState<string>(normalizedInitialModel);
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const selectedModelLabel =
    getSupportedAIModel(model)?.title ||
    getSupportedAIModel(normalizedInitialModel)?.title ||
    SUPPORTED_AI_MODELS[0]?.title ||
    '';

  useEffect(() => {
    setModel(normalizedInitialModel);
  }, [normalizedInitialModel]);

  return (
    <div className="w-full">
      <PromptInput
        onSubmit={async (message) => {
          try {
            handleSubmit(message, { model, webSearch, reasoning });
            setInput('');
          } catch (err) {
            // Allow parent to control error display/state. Do not clear input.
          }
        }}
        className="mt-4"
        globalDrop
        multiple
      >
        {/* <PromptInputHeader>
        <PromptInputAttachments>
          {(attachment) => <PromptInputAttachment data={attachment} />}
        </PromptInputAttachments>
      </PromptInputHeader> */}
        <PromptInputBody>
          <PromptInputTextarea
            className="overflow-hidden p-4 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder={t('input_placeholder')}
            onChange={(e) => {
              const value = e.target.value;
              setInput(value);
              onInputChange?.(value);
            }}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            {/* <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton
            variant={webSearch ? 'default' : 'ghost'}
            onClick={() => setWebSearch(!webSearch)}
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton> */}
            <div className="flex items-center">
              <Switch
                id="prompt-reasoning-switch"
                checked={reasoning}
                onCheckedChange={setReasoning}
                // className="peer sr-only"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor="prompt-reasoning-switch"
                    className="text-muted-foreground hover:text-foreground peer-data-[state=checked]:text-primary inline-flex cursor-pointer items-center rounded-md p-2 transition-colors"
                  >
                    <BrainCircuitIcon size={16} />
                  </Label>
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>Reasoning</TooltipContent>
              </Tooltip>
            </div>
            <PromptInputSelect
              onValueChange={(value) => {
                setModel(value);
              }}
              value={model}
            >
              <PromptInputSelectTrigger>
                <PromptInputSelectValue>
                  {selectedModelLabel}
                </PromptInputSelectValue>
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {SUPPORTED_AI_MODELS.map((modelOption) => (
                  <PromptInputSelectItem
                    key={modelOption.id}
                    value={modelOption.id}
                  >
                    {modelOption.title}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input || status === 'submitted'}
            status={status}
          />
        </PromptInputFooter>
      </PromptInput>
      {error ? (
        <p className="text-destructive mt-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
