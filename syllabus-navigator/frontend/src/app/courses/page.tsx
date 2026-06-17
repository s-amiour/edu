'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown, ChevronRight, Search } from 'lucide-react';

const COURSES = [
  {
    id: '1', code: 'CS401', name: 'IAM Fundamentals', semester: 'S5',
    modules: [
      { name: 'Introduction to IAM', topics: ['IAM Fundamentals', 'Core IAM Concepts', 'IAM in Cybersecurity', 'IGA vs AM'] },
      { name: 'Authentication Mechanisms', topics: ['Password Auth', 'Multi-Factor Auth', 'Biometric Auth', 'Adaptive Auth'] },
      { name: 'Authorization Models', topics: ['RBAC', 'ABAC', 'Policy Administration', 'Least Privilege'] },
      { name: 'Identity Lifecycle', topics: ['Provisioning', 'Deprovisioning', 'Identity Governance', 'Access Certification'] },
      { name: 'Federated Identity & SSO', topics: ['SAML', 'OAuth 2.0', 'OpenID Connect', 'Identity Providers'] },
      { name: 'Governance', topics: ['Compliance Frameworks', 'Audit & Monitoring', 'Risk Assessment', 'IAM Metrics'] },
    ],
  },
  {
    id: '2', code: 'MA201', name: 'Counting & Enumerating', semester: 'S3',
    modules: [
      { name: 'Cardinal Numbers', topics: ['Finite Set Cardinality', 'Union/Intersection Cardinality', 'Inclusion-Exclusion'] },
      { name: 'Formalizing Counting', topics: ['Problem Modeling', 'Reference Situations', 'Bijection Method'] },
      { name: 'Combinatorics', topics: ['Permutations', 'Arrangements', 'Combinations', 'Binomial Theorem'] },
      { name: 'Applications', topics: ['Algorithmic Counting', 'Binary Representations', 'Graph Counting'] },
    ],
  },
  {
    id: '3', code: 'MA301', name: 'Probability', semester: 'S5',
    modules: [
      { name: 'Probability Space', topics: ['Random Experiments', 'Set Theory Review', 'Probability Functions', 'Kolmogorov Axioms'] },
      { name: 'Conditional Probability', topics: ['Conditional Definition', "Bayes' Theorem", 'Independence', 'Total Probability'] },
      { name: 'Discrete Random Variables', topics: ['PMF & CDF', 'Expected Value & Variance', 'Bernoulli & Binomial', 'Poisson'] },
      { name: 'Continuous Random Variables', topics: ['PDF & CDF', 'Expected Value', 'Normal Distribution', 'Exponential Distribution'] },
    ],
  },
];

export default function CoursesPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleCourse = (id: string) => setExpanded(expanded === id ? null : id);
  const toggleModule = (key: string) => {
    const next = new Set(expandedModules);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedModules(next);
  };

  const filtered = COURSES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-zinc-100">
            Syllabus <span className="text-indigo-400">Navigator</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.map((course) => {
            const isOpen = expanded === course.id;
            const topicCount = course.modules.reduce((a, m) => a + m.topics.length, 0);

            return (
              <Card key={course.id} onClick={() => toggleCourse(course.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="primary">{course.code}</Badge>
                        <h3 className="text-lg font-semibold text-zinc-100">{course.name}</h3>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">
                        {course.semester} &middot; {course.modules.length} modules &middot; {topicCount} topics
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  )}
                </div>

                {isOpen && (
                  <div className="mt-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {course.modules.map((mod, mi) => {
                      const modKey = `${course.id}-${mi}`;
                      const modOpen = expandedModules.has(modKey);
                      return (
                        <div key={mi} className="bg-gray-900 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleModule(modKey)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
                          >
                            <span className="text-sm font-medium text-zinc-200">
                              Module {mi + 1}: {mod.name}
                            </span>
                            {modOpen ? (
                              <ChevronDown className="w-4 h-4 text-zinc-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-zinc-500" />
                            )}
                          </button>
                          {modOpen && (
                            <div className="px-3 pb-3 flex flex-wrap gap-2">
                              {mod.topics.map((t, ti) => (
                                <span
                                  key={ti}
                                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-xs text-zinc-300"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
