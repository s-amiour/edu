import { cn } from '@/lib/utils';

type ColorVariant = 'indigo' | 'green' | 'yellow' | 'red' | 'blue';

interface ProgressProps {
  value: number;
  label?: string;
  color?: ColorVariant;
  className?: string;
  showValue?: boolean;
}

const colorClasses: Record<ColorVariant, string> = {
  indigo: 'bg-indigo-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};

export function Progress({
  value,
  label,
  color = 'indigo',
  className,
  showValue = true,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-zinc-400">{label}</span>}
          {showValue && <span className="text-sm text-zinc-400">{clampedValue}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-500', colorClasses[color])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
