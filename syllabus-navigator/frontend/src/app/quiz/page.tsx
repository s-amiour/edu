'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';

type View = 'list' | 'quiz' | 'results';

interface Question {
  id: number;
  type: 'mcq' | 'short';
  text: string;
  options?: string[];
  correct: number | string;
  explanation: string;
}

interface QuizDef {
  id: string;
  title: string;
  topic: string;
  questions: Question[];
}

const QUIZZES: QuizDef[] = [
  {
    id: 'q1', title: 'IAM Fundamentals Quiz', topic: 'IAM Fundamentals',
    questions: [
      { id: 1, type: 'mcq', text: 'What does IAM stand for?', options: ['Identity and Access Management', 'Internet Authentication Mode', 'Internal Audit Mechanism', 'Identity Authorization Module'], correct: 0, explanation: 'IAM stands for Identity and Access Management — ensuring the right individuals have the right access to the right resources at the right time.' },
      { id: 2, type: 'mcq', text: 'Which of the following is NOT one of the four core IAM principles?', options: ['Identity', 'Authentication', 'Encryption', 'Authorization'], correct: 2, explanation: 'The four core IAM principles are Identity, Authentication, Authorization, and Accounting (IAAA). Encryption is a security mechanism, not an IAM principle.' },
      { id: 3, type: 'mcq', text: 'What is the primary purpose of Multi-Factor Authentication?', options: ['Speed up login', 'Verify identity using multiple evidence types', 'Replace passwords entirely', 'Encrypt user data'], correct: 1, explanation: 'MFA verifies identity using two or more authentication factors: something you know, something you have, or something you are.' },
      { id: 4, type: 'short', text: 'Name the three types of authentication factors.', correct: 'knowledge,possession,inherence', explanation: 'The three factors are: knowledge (password), possession (phone/token), and inherence (biometrics like fingerprint).' },
      { id: 5, type: 'mcq', text: 'What does RBAC stand for?', options: ['Role-Based Access Control', 'Rule-Based Authentication Check', 'Remote Binary Access Control', 'Resource-Based Account Classification'], correct: 0, explanation: 'RBAC (Role-Based Access Control) assigns permissions to roles, then assigns users to roles.' },
    ],
  },
  {
    id: 'q2', title: 'Counting & Combinatorics Quiz', topic: 'Counting',
    questions: [
      { id: 1, type: 'mcq', text: 'How many ways can you arrange 4 distinct books on a shelf?', options: ['4', '12', '24', '16'], correct: 2, explanation: '4! = 4 × 3 × 2 × 1 = 24 permutations.' },
      { id: 2, type: 'mcq', text: 'What is C(10,3)?', options: ['30', '120', '720', '1000'], correct: 1, explanation: 'C(10,3) = 10! / (3! × 7!) = (10 × 9 × 8) / (3 × 2 × 1) = 120.' },
      { id: 3, type: 'mcq', text: '|A ∪ B| equals:', options: ['|A| + |B|', '|A| + |B| - |A ∩ B|', '|A| × |B|', '|A| - |B|'], correct: 1, explanation: 'By the inclusion-exclusion principle: |A ∪ B| = |A| + |B| - |A ∩ B|.' },
      { id: 4, type: 'short', text: 'How many binary strings of length 8 are there?', correct: '256', explanation: 'Each position has 2 choices, so 2^8 = 256.' },
    ],
  },
  {
    id: 'q3', title: 'Probability Basics Quiz', topic: 'Probability',
    questions: [
      { id: 1, type: 'mcq', text: 'If P(A) = 0.3 and P(B) = 0.5, and A and B are independent, what is P(A ∩ B)?', options: ['0.8', '0.15', '0.2', '0.35'], correct: 1, explanation: 'For independent events: P(A ∩ B) = P(A) × P(B) = 0.3 × 0.5 = 0.15.' },
      { id: 2, type: 'mcq', text: "Bayes' theorem is used to:", options: ['Count outcomes', 'Update probability given new evidence', 'Calculate variance', 'Determine independence'], correct: 1, explanation: "Bayes' theorem updates prior probability P(H) to posterior P(H|E) given new evidence E." },
      { id: 3, type: 'mcq', text: 'A fair die is rolled. What is P(rolling an even number)?', options: ['1/6', '1/3', '1/2', '2/3'], correct: 2, explanation: 'Even numbers on a die: {2, 4, 6} = 3 outcomes out of 6. P = 3/6 = 1/2.' },
      { id: 4, type: 'short', text: 'What is the expected value of a fair six-sided die?', correct: '3.5', explanation: 'E[X] = (1+2+3+4+5+6)/6 = 21/6 = 3.5.' },
      { id: 5, type: 'mcq', text: 'Which distribution models the number of successes in n independent Bernoulli trials?', options: ['Poisson', 'Normal', 'Binomial', 'Exponential'], correct: 2, explanation: 'The Binomial distribution B(n,p) models the number of successes in n independent trials each with probability p.' },
    ],
  },
];

export default function QuizPage() {
  const [view, setView] = useState<View>('list');
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const startQuiz = (quiz: QuizDef) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setTimeLeft(quiz.questions.length * 60);
    setSubmitted(false);
    setView('quiz');
  };

  useEffect(() => {
    if (view !== 'quiz' || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, submitted]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleAnswer = (ans: number | string) => {
    const next = [...answers];
    next[currentQ] = ans;
    setAnswers(next);
  };

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    setView('results');
  }, []);

  const getScore = () => {
    if (!activeQuiz) return { correct: 0, total: 0 };
    let correct = 0;
    activeQuiz.questions.forEach((q, i) => {
      if (q.type === 'mcq' && answers[i] === q.correct) correct++;
      else if (q.type === 'short' && typeof answers[i] === 'string' && typeof q.correct === 'string') {
        const expected = q.correct.toLowerCase().split(',').map((s) => s.trim());
        const given = (answers[i] as string).toLowerCase().split(',').map((s) => s.trim());
        if (expected.every((e) => given.includes(e))) correct++;
      }
    });
    return { correct, total: activeQuiz.questions.length };
  };

  // --- LIST VIEW ---
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <h1 className="text-xl font-bold text-zinc-100">
              Syllabus <span className="text-indigo-400">Navigator</span>
            </h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <h2 className="text-2xl font-bold text-zinc-100">Available Quizzes</h2>
          <div className="grid gap-4">
            {QUIZZES.map((q) => (
              <Card key={q.id} className="hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100">{q.title}</h3>
                      <p className="text-sm text-zinc-400">{q.topic} &middot; {q.questions.length} questions</p>
                    </div>
                  </div>
                  <Button onClick={() => startQuiz(q)}>Start Quiz</Button>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- QUIZ VIEW ---
  if (view === 'quiz' && activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    return (
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">{activeQuiz.title}</h2>
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-8">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {activeQuiz.questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i === currentQ ? 'bg-indigo-500' : answers[i] !== null ? 'bg-indigo-500/40' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>

          <Card>
            <p className="text-sm text-zinc-500 mb-2">Question {currentQ + 1} of {activeQuiz.questions.length}</p>
            <h3 className="text-lg font-medium text-zinc-100 mb-6">{q.text}</h3>

            {q.type === 'mcq' && q.options ? (
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      answers[currentQ] === i
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                        : 'border-gray-700 bg-gray-900 text-zinc-300 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-sm font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={(answers[currentQ] as string) || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-full p-4 bg-gray-900 border border-gray-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                placeholder="Type your answer..."
              />
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="secondary"
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              {currentQ < activeQuiz.questions.length - 1 ? (
                <Button onClick={() => setCurrentQ(currentQ + 1)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>Submit Quiz</Button>
              )}
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // --- RESULTS VIEW ---
  if (view === 'results' && activeQuiz) {
    const { correct, total } = getScore();
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 bg-gray-900/50">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <h2 className="font-semibold text-zinc-100">Quiz Results</h2>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          <Card className="text-center py-8">
            <div className={`text-5xl font-bold ${pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {pct}%
            </div>
            <p className="text-zinc-400 mt-2">{correct} out of {total} correct</p>
            <Badge variant={pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'}>
              {pct >= 70 ? 'Great job!' : pct >= 50 ? 'Keep practicing' : 'Needs review'}
            </Badge>
          </Card>

          <div className="space-y-4">
            {activeQuiz.questions.map((q, i) => {
              let isCorrect = false;
              if (q.type === 'mcq') isCorrect = answers[i] === q.correct;
              else if (typeof q.correct === 'string' && typeof answers[i] === 'string') {
                const expected = q.correct.toLowerCase().split(',').map((s) => s.trim());
                const given = (answers[i] as string).toLowerCase().split(',').map((s) => s.trim());
                isCorrect = expected.every((e) => given.includes(e));
              }

              return (
                <Card key={i} className={isCorrect ? 'border-green-500/20' : 'border-red-500/20'}>
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-100 mb-2">
                        Q{i + 1}: {q.text}
                      </p>
                      <p className="text-sm text-zinc-400">
                        Your answer: <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {q.type === 'mcq' && typeof answers[i] === 'number' ? q.options?.[answers[i]] : (answers[i] || 'No answer')}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-zinc-400">
                          Correct: <span className="text-green-400">
                            {q.type === 'mcq' ? q.options?.[q.correct as number] : q.correct}
                          </span>
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-2 italic">{q.explanation}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setView('list')}>
              Back to Quizzes
            </Button>
            <Button onClick={() => startQuiz(activeQuiz)}>Retry Quiz</Button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
