import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils';

interface Activity {
  type: string;
  description: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

const typeColors: Record<string, string> = {
  quiz_completed: 'bg-indigo-500',
  topic_viewed: 'bg-blue-500',
  recommendation_accepted: 'bg-green-500',
  assessment_submitted: 'bg-yellow-500',
  streak_milestone: 'bg-orange-500',
};

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {activities.map((activity, index) => (
        <div key={index} className="flex gap-3 relative">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-3 h-3 rounded-full mt-1.5 shrink-0',
                typeColors[activity.type] || 'bg-gray-500'
              )}
            />
            {index < activities.length - 1 && (
              <div className="w-px h-full bg-gray-700 mt-1" />
            )}
          </div>
          <div className="pb-4">
            <p className="text-sm text-zinc-200">{activity.description}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
