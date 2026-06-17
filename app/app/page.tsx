"use client";
import { useEffect, useState } from "react";
import { parseFlashcards } from "@/lib/clean-text";

type Mastery = "unseen" | "seen" | "practiced" | "confident";
type Format = "summary" | "flashcards" | "worked_example" | "analogy" | "practice_problem";

interface StudentModel {
  mastery: Record<string, Mastery>;
  signals: { topicId: string; event: string; ts: number }[];
}
interface CardData {
  content: string;
  criticPassed: boolean;
  issues?: string[];
  topic: { id: string; title: string; summary: string; objectives: string[]; scheduledFor?: string };
}
interface PlanData { topicId: string; format: Format; reason: string }

const FORMAT_LABELS: Record<Format, string> = {
  summary: "Summary",
  flashcards: "Flashcards",
  worked_example: "Worked Example",
  analogy: "Analogy",
  practice_problem: "Practice Problem",
};

const MASTERY_NEXT: Record<Mastery, Mastery> = {
  unseen: "seen", seen: "practiced", practiced: "confident", confident: "confident",
};

function getStudent(): StudentModel {
  try { return JSON.parse(localStorage.getItem("student") ?? "{}") as StudentModel; }
  catch { return { mastery: {}, signals: [] }; }
}
function saveStudent(s: StudentModel) { localStorage.setItem("student", JSON.stringify(s)); }

/** Render card content based on format */
function CardContent({ content, format }: { content: string; format: Format }) {
  if (format === "flashcards") {
    const cards = parseFlashcards(content);
    if (cards.length > 0) {
      return (
        <div className="space-y-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-700 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300">{c.q}</div>
              <div className="px-4 py-3 text-sm text-slate-200">{c.a}</div>
            </div>
          ))}
        </div>
      );
    }
  }

  if (format === "summary") {
    const bullets = content.split("\n").filter(l => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().match(/^\d+\./));
    if (bullets.length > 0) {
      return (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-200">
              <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
              <span>{b.replace(/^[•\-\d.]\s*/, "").trim()}</span>
            </li>
          ))}
        </ul>
      );
    }
  }

  // Default: paragraphs
  return (
    <div className="space-y-3">
      {content.split("\n\n").filter(Boolean).map((para, i) => (
        <p key={i} className="text-sm text-slate-200 leading-relaxed">{para.trim()}</p>
      ))}
    </div>
  );
}

export default function TodayPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [card, setCard] = useState<CardData | null>(null);
  const [phase, setPhase] = useState<"idle" | "planning" | "generating" | "ready">("idle");
  const [showReason, setShowReason] = useState(false);
  const [done, setDone] = useState(false);

  async function loadCard(mastery: Record<string, Mastery>) {
    setPhase("planning"); setCard(null); setDone(false); setShowReason(false);

    const planRes = await fetch("/api/plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery }),
    });
    const planData: PlanData = await planRes.json();
    setPlan(planData);

    setPhase("generating");
    const cardRes = await fetch("/api/card", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: planData.topicId, format: planData.format }),
    });
    const cardData: CardData = await cardRes.json();
    setCard(cardData); setPhase("ready");
  }

  useEffect(() => { loadCard(getStudent().mastery as Record<string, Mastery>); }, []);

  function handleFeedback(positive: boolean) {
    if (!plan) return;
    const student = getStudent();
    student.mastery ??= {}; student.signals ??= [];
    const cur: Mastery = (student.mastery[plan.topicId] ?? "unseen") as Mastery;
    if (positive) student.mastery[plan.topicId] = MASTERY_NEXT[cur];
    student.signals.push({ topicId: plan.topicId, event: positive ? "got_it" : "thumbs_down", ts: Date.now() });
    saveStudent(student);
    setDone(true);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Today&apos;s Study</h1>
        <p className="text-slate-500 text-xs mt-0.5">AI picks your single most valuable topic right now.</p>
      </div>

      {/* Loading states */}
      {(phase === "planning" || phase === "generating") && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">
            {phase === "planning" ? "Choosing your next topic…" : "Generating your study card…"}
          </p>
        </div>
      )}

      {phase === "ready" && plan && card && (
        <div className="space-y-4">

          {/* Topic header */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-800">
                {FORMAT_LABELS[plan.format]}
              </span>
              {card.topic.scheduledFor && (
                <span className="text-xs text-slate-600">due {card.topic.scheduledFor}</span>
              )}
              {!card.criticPassed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-800">
                  critic-revised
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{card.topic.title}</h2>

            <button
              onClick={() => setShowReason(r => !r)}
              className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
            >
              {showReason ? "▾" : "▸"} Why this topic?
            </button>
            {showReason && (
              <p className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700 leading-relaxed">
                {plan.reason}
              </p>
            )}
          </div>

          {/* Card content */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <CardContent content={card.content} format={plan.format} />
          </div>

          {/* Objectives — max 2, collapsed */}
          {card.topic.objectives.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Objectives</p>
              {card.topic.objectives.slice(0, 2).map((obj, i) => (
                <p key={i} className="text-xs text-slate-400 leading-relaxed">→ {obj}</p>
              ))}
            </div>
          )}

          {/* Feedback */}
          {!done ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(true)}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 text-sm transition-colors"
              >
                Got it ✓
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-lg transition-colors"
                title="Still confused"
              >
                👎
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-green-400 text-sm font-medium">Mastery updated ✓</p>
              <button
                onClick={() => loadCard(getStudent().mastery as Record<string, Mastery>)}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 text-sm transition-colors"
              >
                Next topic →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
