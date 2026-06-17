'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RecommendationCard } from '@/components/dashboard/RecommendationCard';
import { MasteryMap } from '@/components/dashboard/MasteryMap';
import { StreakCounter } from '@/components/dashboard/StreakCounter';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Target, TrendingUp, Flame, Award, Calendar,
  AlertTriangle, CheckCircle2, LogOut, BarChart3,
} from 'lucide-react';

// --- Mock Data ---
const MOCK_TOPICS = [
  { name: 'IAM Fundamentals', state: 'CONFIDENT' as const },
  { name: 'Core IAM Concepts', state: 'CONFIDENT' as const },
  { name: 'IAM in Cybersecurity', state: 'PRACTICED' as const },
  { name: 'IGA vs AM', state: 'PRACTICED' as const },
  { name: 'Password Authentication', state: 'SEEN' as const },
  { name: 'Multi-Factor Auth', state: 'SEEN' as const },
  { name: 'Biometric Auth', state: 'UNSEEN' as const },
  { name: 'RBAC', state: 'UNSEEN' as const },
  { name: 'ABAC', state: 'UNSEEN' as const },
  { name: 'Cardinal Numbers', state: 'CONFIDENT' as const },
  { name: 'Inclusion-Exclusion', state: 'PRACTICED' as const },
  { name: 'Permutations', state: 'SEEN' as const },
  { name: 'Combinations', state: 'UNSEEN' as const },
  { name: 'Probability Space', state: 'UNSEEN' as const },
  { name: 'Bayes Theorem', state: 'UNSEEN' as const },
];

const MOCK_ASSESSMENTS = [
  { name: 'IAM Midterm Exam', course: 'CS401', dueDate: '2025-03-15', type: 'EXAM' },
  { name: 'Counting Homework #3', course: 'MA201', dueDate: '2025-03-18', type: 'HOMEWORK' },
  { name: 'Probability Quiz 2', course: 'MA301', dueDate: '2025-03-22', type: 'QUIZ' },
  { name: 'IAM Group Project', course: 'CS401', dueDate: '2025-04-01', type: 'PROJECT' },
];

const MOCK_ACTIVITIES = [
  { type: 'quiz', description: 'Completed quiz on IAM Fundamentals', timestamp: '2 hours ago' },
  { type: 'view', description: 'Read summary: Multi-Factor Authentication', timestamp: '5 hours ago' },
  { type: 'mastery', description: 'Mastered: Cardinal Numbers', timestamp: '1 day ago' },
  { type: 'quiz', description: 'Completed quiz on Counting Basics', timestamp: '1 day ago' },
  { type: 'view', description: 'Viewed flashcards: RBAC vs ABAC', timestamp: '2 days ago' },
];

const MOCK_QUIZ_DATA = [
  { week: 'W1', accuracy: 65 },
  { week: 'W2', accuracy: 72 },
  { week: 'W3', accuracy: 68 },
  { week: 'W4', accuracy: 78 },
  { week: 'W5', accuracy: 82 },
  { week: 'W6', accuracy: 78 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const weakTopics = MOCK_TOPICS.filter((t) => t.state === 'UNSEEN' || t.state === 'SEEN');
  const strongTopics = MOCK_TOPICS.filter((t) => t.state === 'CONFIDENT' || t.state === 'PRACTICED');
  const masteredCount = MOCK_TOPICS.filter((t) => t.state === 'CONFIDENT').length;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-zinc-100">
              Syllabus <span className="text-indigo-400">Navigator</span>
            </h1>
            <Badge variant="primary">Student</Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user?.name || 'Student'}</span>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">7</p>
              <p className="text-sm text-zinc-400">Day Streak</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">78%</p>
              <p className="text-sm text-zinc-400">Quiz Accuracy</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-100">{masteredCount}/{MOCK_TOPICS.length}</p>
              <p className="text-sm text-zinc-400">Topics Mastered</p>
            </div>
          </Card>
        </div>

        {/* Today's Recommendation */}
        <RecommendationCard
          topic="Consensus Algorithms"
          reason="Tomorrow's lecture on Distributed Systems assumes understanding of Consensus Algorithms. Your mastery is currently SEEN — a quick review will help."
          format="summary"
          urgency="high"
          onStart={() => alert('Starting preparation...')}
          onFeedback={(type) => setFeedback(type)}
        />

        {/* Streak + Mastery Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Streak</CardTitle>
            </CardHeader>
            <StreakCounter streak={7} lastActive={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Mastery Map</CardTitle>
            </CardHeader>
            <MasteryMap topics={MOCK_TOPICS} />
          </Card>
        </div>

        {/* Assessments + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Assessments</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              {MOCK_ASSESSMENTS.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{a.name}</p>
                      <p className="text-xs text-zinc-500">{a.course}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={a.type === 'EXAM' ? 'danger' : a.type === 'QUIZ' ? 'warning' : 'default'}>
                      {a.type}
                    </Badge>
                    <p className="text-xs text-zinc-500 mt-1">{a.dueDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <ActivityFeed activities={MOCK_ACTIVITIES} />
          </Card>
        </div>

        {/* Weak / Strong Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Weak Topics</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t, i) => (
                <Badge key={i} variant="danger">{t.name}</Badge>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Strong Topics</CardTitle>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              {strongTopics.map((t, i) => (
                <Badge key={i} variant="success">{t.name}</Badge>
              ))}
            </div>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Accuracy Over Time</CardTitle>
          </CardHeader>
          <div className="flex items-end gap-3 h-48 px-4">
            {MOCK_QUIZ_DATA.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-zinc-400">{d.accuracy}%</span>
                <div
                  className="w-full bg-indigo-500/80 rounded-t-md transition-all hover:bg-indigo-400"
                  style={{ height: `${d.accuracy * 1.6}px` }}
                />
                <span className="text-xs text-zinc-500">{d.week}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
