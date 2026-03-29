'use client';

import { cn } from '@/shared/lib/utils';

export function ClaudeCodeLoading({
  className,
  label = 'Loading',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'text-primary inline-flex items-center gap-1.5',
        className
      )}
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>

      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="bg-current inline-block h-2.5 w-0.5 rounded-full"
          style={{
            animation: 'claude-code-loading 1s ease-in-out infinite',
            animationDelay: `${index * 0.12}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes claude-code-loading {
          0%, 100% {
            transform: translateY(0) scaleY(0.72);
            opacity: 0.32;
          }
          40% {
            transform: translateY(-1px) scaleY(1.45);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
