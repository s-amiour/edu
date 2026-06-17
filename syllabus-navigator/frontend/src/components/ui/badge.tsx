import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-700 text-zinc-300',
  primary: 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30',
  success: 'bg-green-600/20 text-green-400 border border-green-500/30',
  warning: 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30',
  danger: 'bg-red-600/20 text-red-400 border border-red-500/30',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
