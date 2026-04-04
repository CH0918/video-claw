import { Copy, Share2, type LucideIcon } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { TabsContent } from '@/shared/components/ui/tabs';

export function SidebarContent({
  value,
  title,
  body,
  icon: Icon,
  children,
}: {
  value: string;
  title?: string;
  body?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <TabsContent
      value={value}
      className="mt-0 flex min-h-0 flex-1 outline-none"
    >
      {children ? (
        children
      ) : (
        <div className="flex flex-1 items-center justify-center p-5">
          <div className="border-border bg-background w-full max-w-xl rounded-2xl border p-6 shadow-xs">
            <div className="flex items-center gap-3">
              {Icon ? (
                <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
              ) : null}
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {body}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" className="border-border rounded-full">
                <Copy className="size-4" />
                Copy
              </Button>
              <Button variant="outline" className="border-border rounded-full">
                <Share2 className="size-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      )}
    </TabsContent>
  );
}
