"use client";
import { useCallback, useEffect, useState } from "react";
import { parseMultipleChoice } from "@/lib/clean-text";

interface Topic { id: string; title: string; scheduledFor?: string }
interface MCQ { question: string; options: string[]; correctIndex: number; explanation: string }
interface CardData { content: string; topic: Topic }
type AnswerState = "unanswered" | "correct" | "wrong";

export default function QuizPage() {
  const [topics,      setTopics]      = useState<Topic[]>([]);
  const [topicIdx,    setTopicIdx]    = useState(0);
  const [mcq,         setMcq]         = useState<MCQ | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [score,       setScore]       = useState({ correct: 0, total: 0 });

  useEffect(() => {
    fetch("/api/topics").then(r => r.json()).then(setTopics);
  }, []);

  const loadQuestion = useCallback(async (idx: number, attempt = 0) => {
    if (!topics.length) return;
    const topic = topics[idx % topics.length];

    setLoading(true);
    setMcq(null);
    setError(null);
    setSelected(null);
    setAnswerState("unanswered");

    try {
      const res = await fetch("/api/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: topic.id, format: "multiple_choice" }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data: CardData = await res.json();
      const parsed = parseMultipleChoice(data.content);

      if (!parsed && attempt < 2) {
        // Auto-retry up to 2 more times before giving up
        return loadQuestion(idx, attempt + 1);
      }

      setMcq(parsed);
      if (!parsed) setError("Couldn't generate a valid question. Try a different topic.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [topics]);

  // Load first question once topics arrive; reload when topicIdx changes
  useEffect(() => {
    if (topics.length > 0) loadQuestion(topicIdx);
  }, [topics, topicIdx, loadQuestion]);

  function handleSelect(i: number) {
    if (answerState !== "unanswered" || !mcq) return;
    setSelected(i);
    const correct = i === mcq.correctIndex;
    setAnswerState(correct ? "correct" : "wrong");
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function next() {
    setTopicIdx(i => i + 1);
  }

  function optionStyle(i: number) {
    const base = "w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ";
    if (answerState === "unanswered")
      return base + "border-slate-700 bg-slate-800 hover:border-indigo-500 hover:bg-slate-700 text-slate-200 cursor-pointer";
    if (i === mcq?.correctIndex)
      return base + "border-green-500 bg-green-900/40 text-green-200 cursor-default";
    if (i === selected && answerState === "wrong")
      return base + "border-red-500 bg-red-900/40 text-red-300 cursor-default";
    return base + "border-slate-800 bg-slate-900 text-slate-500 cursor-default";
  }

  const topic = topics[topicIdx % Math.max(topics.length, 1)];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Quiz</h1>
          <p className="text-slate-500 text-xs mt-0.5">Multiple choice — AI-generated from your course material</p>
        </div>
        {score.total > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-white">{score.correct}/{score.total}</p>
            <p className="text-xs text-slate-500">correct</p>
          </div>
        )}
      </div>

      {/* Topic badge */}
      {topic && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-400 border border-indigo-800">
            {topic.title}
          </span>
          {topic.scheduledFor && <span>due {topic.scheduledFor}</span>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Generating question…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => loadQuestion(topicIdx)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Try again
            </button>
            <button onClick={next}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              Skip →
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      {!loading && !error && mcq && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-white font-medium leading-relaxed">{mcq.question}</p>
          </div>

          <div className="space-y-2">
            {mcq.options.map((opt, i) => (
              <button key={i} onClick={() => handleSelect(i)} className={optionStyle(i)}>
                <span className="font-semibold mr-2 text-slate-400">{"ABCD"[i]}.</span>
                {opt}
              </button>
            ))}
          </div>

          {/* Feedback */}
          {answerState !== "unanswered" && (
            <div className={`rounded-xl border px-4 py-3 space-y-1 ${
              answerState === "correct" ? "border-green-700 bg-green-900/30" : "border-red-700 bg-red-900/30"
            }`}>
              <p className={`font-semibold text-sm ${answerState === "correct" ? "text-green-400" : "text-red-400"}`}>
                {answerState === "correct" ? "Correct!" : `Incorrect — answer was ${"ABCD"[mcq.correctIndex]}`}
              </p>
              {mcq.explanation && <p className="text-xs text-slate-300">{mcq.explanation}</p>}
            </div>
          )}

          {answerState !== "unanswered" && (
            <button onClick={next}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 text-sm transition-colors">
              Next question →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
