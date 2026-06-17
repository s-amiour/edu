"use client";
import { useEffect, useState } from "react";

type Mastery = "unseen" | "seen" | "practiced" | "confident";

interface Topic { id: string; title: string; scheduledFor?: string }

const MASTERY_COLOR: Record<Mastery, string> = {
  unseen: "bg-slate-700 text-slate-400",
  seen: "bg-blue-900 text-blue-300",
  practiced: "bg-amber-900 text-amber-300",
  confident: "bg-green-900 text-green-300",
};

export default function ProgressPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mastery, setMastery] = useState<Record<string, Mastery>>({});

  useEffect(() => {
    fetch("/api/topics").then(r => r.json()).then(setTopics);
    try {
      const s = JSON.parse(localStorage.getItem("student") ?? "{}");
      setMastery(s.mastery ?? {});
    } catch { /* empty */ }
  }, []);

  function reset() {
    localStorage.removeItem("student");
    setMastery({});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <button onClick={reset} className="text-sm text-red-400 hover:text-red-300 transition-colors">
          Reset all
        </button>
      </div>

      <div className="flex gap-3 text-xs flex-wrap">
        {(["unseen","seen","practiced","confident"] as Mastery[]).map(m => (
          <span key={m} className={`px-2 py-1 rounded-full ${MASTERY_COLOR[m]}`}>{m}</span>
        ))}
      </div>

      <div className="space-y-2">
        {topics.map(t => {
          const m: Mastery = mastery[t.id] ?? "unseen";
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${MASTERY_COLOR[m]}`}>{m}</span>
              <span className="text-sm text-slate-200 flex-1">{t.title}</span>
              {t.scheduledFor && <span className="text-xs text-slate-500">{t.scheduledFor}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
