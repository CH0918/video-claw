import {
  ArrowRight,
  Clipboard,
  LoaderCircle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

export function HeaderSearchBar({
  inputUrl,
  isAnalyzing,
  searchPlaceholder,
  analyzeLabel,
  pasteLabel,
  pasteSuccessLabel,
  pasteFailedLabel,
  onAnalyze,
  onChange,
  className,
  mobile = false,
  expanded = false,
}: {
  inputUrl: string;
  isAnalyzing: boolean;
  searchPlaceholder: string;
  analyzeLabel: string;
  pasteLabel: string;
  pasteSuccessLabel: string;
  pasteFailedLabel: string;
  onAnalyze: () => void;
  onChange: (value: string) => void;
  className?: string;
  mobile?: boolean;
  expanded?: boolean;
}) {
  async function handlePaste() {
    if (!navigator.clipboard?.readText) {
      toast.error(pasteFailedLabel);
      return;
    }

    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) {
        toast.error(pasteFailedLabel);
        return;
      }

      onChange(clipboardText);
      toast.success(pasteSuccessLabel);
    } catch {
      toast.error(pasteFailedLabel);
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
      <Input
        aria-label="video search"
        autoFocus={expanded}
        className={cn(
          'border-primary bg-card focus-visible:border-primary h-10 rounded-xl pr-20 pl-10 shadow-xs focus-visible:ring-2 focus-visible:ring-ring/30',
          mobile
            ? 'text-[13px] placeholder:text-[12px]'
            : 'text-sm placeholder:text-sm'
        )}
        value={inputUrl}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onAnalyze();
          }
        }}
        placeholder={searchPlaceholder}
      />
      <button
        type="button"
        onClick={() => void handlePaste()}
        aria-label={pasteLabel}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-10 -translate-y-1/2"
      >
        <Clipboard className="size-4" />
      </button>
      <button
        type="button"
        onClick={onAnalyze}
        aria-label={analyzeLabel}
        disabled={isAnalyzing}
        className="text-muted-foreground absolute top-1/2 right-3.5 -translate-y-1/2 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
      </button>
    </div>
  );
}
