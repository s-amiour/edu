import { cn } from '@/lib/utils';

interface StreakCounterProps {
  count: number;
  lastSevenDays: boolean[];
  className?: string;
}

export function StreakCounter({ count, lastSevenDays, className }: StreakCounterProps) {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <span className="text-2xl font-bold text-zinc-100">{count}</span>
        <span className="text-sm text-zinc-400">day streak</span>
      </div>
      <div className="flex items-center gap-1.5 ml-4">
        {lastSevenDays.map((active, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-colors',
                active
                  ? 'bg-indigo-500 border-indigo-400'
                  : 'bg-gray-700 border-gray-600'
              )}
            />
            <span className="text-[10px] text-zinc-500">{dayLabels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
