import { cn } from '@/lib/utils';
import { MasteryState } from '@/types';

interface MasteryTopic {
  name: string;
  state: MasteryState;
}

interface MasteryMapProps {
  topics: MasteryTopic[];
  className?: string;
}

const stateColors: Record<MasteryState, string> = {
  [MasteryState.UNSEEN]: 'bg-gray-600 text-zinc-300',
  [MasteryState.SEEN]: 'bg-blue-500/80 text-white',
  [MasteryState.PRACTICED]: 'bg-yellow-500/80 text-gray-900',
  [MasteryState.CONFIDENT]: 'bg-green-500/80 text-white',
};

export function MasteryMap({ topics, className }: MasteryMapProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {topics.map((topic, index) => (
        <span
          key={index}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            stateColors[topic.state]
          )}
        >
          {topic.name}
        </span>
      ))}
    </div>
  );
}
