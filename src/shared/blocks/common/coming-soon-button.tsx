'use client';

import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

import { SmartIcon } from './smart-icon';

export function ComingSoonButton({
  title,
  message,
  icon,
  variant = 'default',
  size = 'default',
}: {
  title: string;
  message: string;
  icon?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => {
        toast.info(message);
      }}
    >
      {icon && <SmartIcon name={icon} />}
      {title}
    </Button>
  );
}
