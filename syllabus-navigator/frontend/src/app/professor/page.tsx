'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  Users, Award, Activity, AlertTriangle, BookOpen,
  TrendingUp, BarChart3, LogOut, Brain, Shield,
} from 'lucide-react';

// --- Mock Data ---
const TOPIC_UNDERSTANDING = [
  { topic: 'IAM Fundamentals', pct: 89 },
  { topic: 'MFA', pct: 72 },
  { topic: 'RBAC', pct: 58 },
  { topic: 'SAML / SSO', pct: 41 },
  { topic: 'Cardinal Numbers', pct: 85 },
  { topic: 'Combinatorics', pct: 63 },
  { topic: 'Bayes Theorem', pct: 37 },
  { topic: 'Normal Distribution', pct: 45 },
];

const QUIZ_SCORES = [
  { week: 'W1', avg: 68 },
  { week: 'W2', avg: 71 },
  { week: 'W3', avg: 65 },
  { week: 'W4', avg: 74 },
  { week: 'W5', avg: 72 },
  { week: 'W6', avg: 78 },
];

const DIFFICULT_TOPICS = [
  { name: 'Bayes Theorem', difficulty: 78 },
  { name: 'SAML / SSO', difficulty: 71 },
  { name: 'Normal Distribution', difficulty: 65 },
  { name: 'ABAC', difficulty: 58 },
  { name: 'Combinatorics', difficulty: 52 },
];

const ENGAGEMENT = [
  { day: 'Mon', users: 98 }, { day: 'Tue', users: 112 }, { day: 'Wed', users: 105 },
  { day: 'Thu', users: 89 }, { day: 'Fri', users: 76 }, { day: 'Sat', users: 45 },
  { day: 'Sun', users: 52 }, { day: 'Mon', users: 101 }, { day: 'Tue', users: 118 },
  { day: 'Wed', users: 108 }, { day: 'Thu', users: 95 }, { day: 'Fri', users: 82 },
  { day: 'Sat', users: 48 }, { day: 'Sun', users: 55 },
];

const RISK_AREAS = [
  { topic: 'Bayes Theorem', risk: 'HIGH' as const, students: 34, reason: 'Low quiz scores + prerequisite for 3 topics' },
  { topic: 'SAML / SSO', risk: 'HIGH' as const, students: 28, reason: 'Complex topic, low engagement' },
  { topic: 'Normal Distribution', risk: 'MEDIUM' as const, students: 22, reason: 'Requires weak prerequisite: Combinatorics' },
  { topic: 'ABAC', risk: 'MEDIUM' as const, students: 19, reason: 'New topic, limited practice material' },
];

const TOPIC_COVERAGE = [
  { topic: 'IAM Fundamentals', coverage: 95 },
  { topic: 'Authentication', coverage: 82 },
  { topic: 'Authorization', coverage: 68 },
  { topic: 'Identity Lifecycle', coverage: 55 },
  { topic: 'Counting', coverage: 88 },
  { topic: 'Combinatorics', coverage: 72 },
  { topic: 'Probability Space', coverage: 60 },
  { topic: 'Random Variables', coverage: 45 },
];

const LEARNING_GAPS = [
  { description: 'Missing prerequisite link: Password Auth → MFA', severity: 'low' },
  { description: 'No assessment coverage for Identity Governance module', severity: 'medium' },
  { description: 'Students struggle with Bayes Theorem but no remedial content exists', severity: 'high' },
  { description: 'Probability Space → Conditional Probability edge has low confidence (0.4)', severity: 'low' },
];

export default function ProfessorDashboard() {
  const router = useRouter();
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-zinc-100">
              Syllabus <span className="text-indigo-400">Navigator</span>
            </h1>
            <Badge variant="warning">Professor</Badge>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="text-zinc-400 hover:text-zinc-200">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Students', value: '142', icon: Users, color: 'indigo' },
            { label: 'Avg Score', value: '72%', icon: Award, color: 'green' },
            { label: 'Active This Week', value: '89', icon: Activity, color: 'blue' },
            { label: 'At-Risk Students', value: '12', icon: AlertTriangle, color: 'red' },
          ].map((s, i) => (
            <Card key={i} className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-${s.color}-500/10 flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 text-${s.color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">{s.value}</p>
                <p className="text-sm text-zinc-400">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topic Understanding Bar Chart */}
          <Card>
            <CardHeader><CardTitle>Topic Understanding</CardTitle></CardHeader>
            <div className="space-y-3">
              {TOPIC_UNDERSTANDING.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-300">{t.topic}</span>
                    <span className="text-zinc-400">{t.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        t.pct >= 75 ? 'bg-green-500' : t.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quiz Scores Line Chart */}
          <Card>
            <CardHeader><CardTitle>Average Quiz Scores</CardTitle></CardHeader>
            <div className="flex items-end gap-4 h-52 px-4 pt-4">
              {QUIZ_SCORES.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-zinc-400">{d.avg}%</span>
                  <div className="w-full relative">
                    <div
                      className="w-full bg-indigo-500/80 rounded-t-md hover:bg-indigo-400 transition-colors"
                      style={{ height: `${d.avg * 1.8}px` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{d.week}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Difficult Topics + Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Most Difficult Topics</CardTitle></CardHeader>
            <div className="space-y-3">
              {DIFFICULT_TOPICS.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-zinc-500">#{i + 1}</span>
                    <span className="text-sm text-zinc-200">{t.name}</span>
                  </div>
                  <Badge variant={t.difficulty >= 70 ? 'danger' : t.difficulty >= 50 ? 'warning' : 'default'}>
                    {t.difficulty}% struggle
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Engagement Trends (14 days)</CardTitle></CardHeader>
            <div className="flex items-end gap-1.5 h-48 px-2">
              {ENGAGEMENT.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-cyan-500/60 rounded-t-sm hover:bg-cyan-400 transition-colors"
                    style={{ height: `${(d.users / 120) * 160}px` }}
                  />
                  {(i % 2 === 0) && <span className="text-[10px] text-zinc-600">{d.day}</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Risk Areas + Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Predicted Exam Risk Areas</CardTitle></CardHeader>
            <div className="space-y-3">
              {RISK_AREAS.map((r, i) => (
                <div key={i} className="p-4 bg-gray-900 rounded-lg border-l-4 border-l-red-500">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-100">{r.topic}</span>
                    <Badge variant={r.risk === 'HIGH' ? 'danger' : 'warning'}>{r.risk}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">{r.reason}</p>
                  <p className="text-xs text-zinc-500 mt-1">{r.students} students affected</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Topic Coverage</CardTitle></CardHeader>
            <div className="space-y-4">
              {TOPIC_COVERAGE.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{t.topic}</span>
                    <span className="text-zinc-400">{t.coverage}%</span>
                  </div>
                  <Progress value={t.coverage} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Learning Gaps */}
        <Card>
          <CardHeader><CardTitle>Graph-Based Learning Gaps</CardTitle></CardHeader>
          <div className="space-y-3">
            {LEARNING_GAPS.map((g, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg">
                <Brain className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-200">{g.description}</p>
                  <Badge variant={g.severity === 'high' ? 'danger' : g.severity === 'medium' ? 'warning' : 'default'}>
                    {g.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
