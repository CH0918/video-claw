import { type LucideIcon } from 'lucide-react';

import { TabsTrigger } from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

export function WorkspaceTabTrigger({
  value,
  label,
  icon: Icon,
  compact = false,
  className,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  compact?: boolean;
  className?: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        compact
          ? 'h-8 rounded-md px-3 text-[12px] font-medium data-[state=active]:shadow-xs'
          : 'h-9 rounded-lg px-4 text-[13px] font-medium data-[state=active]:shadow-xs',
        className
      )}
    >
      <Icon className={cn(compact ? 'size-3' : 'size-3.5')} />
      {label}
    </TabsTrigger>
  );
}
