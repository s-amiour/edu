import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RecommendationCardProps {
  topic: string;
  reason: string;
  format: string;
  urgency: 'high' | 'medium' | 'low';
  onStart: () => void;
  onFeedback: (helpful: boolean) => void;
}

const urgencyConfig = {
  high: { label: 'Urgent', variant: 'danger' as const },
  medium: { label: 'Recommended', variant: 'warning' as const },
  low: { label: 'Optional', variant: 'default' as const },
};

export function RecommendationCard({
  topic,
  reason,
  format,
  urgency,
  onStart,
  onFeedback,
}: RecommendationCardProps) {
  const urgencyInfo = urgencyConfig[urgency];

  return (
    <Card className="border-indigo-500/30 bg-gradient-to-br from-gray-800 to-gray-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today&apos;s Recommendation</CardTitle>
          <Badge variant={urgencyInfo.variant}>{urgencyInfo.label}</Badge>
        </div>
      </CardHeader>
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-semibold text-zinc-100 mb-2">{topic}</h4>
          <p className="text-sm text-zinc-400">{reason}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">{format}</Badge>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button onClick={onStart} variant="primary">
            Start Preparation
          </Button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onFeedback(true)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-zinc-400 hover:text-green-400"
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(false)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors text-zinc-400 hover:text-red-400"
            >
              👎
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
