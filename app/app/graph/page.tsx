"use client";
import { useEffect, useState } from "react";

type Mastery = "unseen" | "seen" | "practiced" | "confident";
interface Topic {
  id: string;
  title: string;
  scheduledFor?: string;
}
interface Edge {
  from: string;
  to: string;
  reason: string;
}

// Show all topics — filter removed so any loaded dataset works

const MASTERY_COLOR: Record<Mastery, string> = {
  unseen: "#1e293b",
  seen: "#1e3a5f",
  practiced: "#78350f",
  confident: "#14532d",
};
const MASTERY_BORDER: Record<Mastery, string> = {
  unseen: "#475569",
  seen: "#3b82f6",
  practiced: "#f59e0b",
  confident: "#22c55e",
};
const MASTERY_LABEL: Record<Mastery, string> = {
  unseen: "Not started",
  seen: "Seen",
  practiced: "Practiced",
  confident: "Confident",
};

const W = 160,
  H = 56,
  GAP_X = 200,
  GAP_Y = 80,
  PAD = 24;

function layoutTopics(topics: Topic[]) {
  const positions = new Map<string, { x: number; y: number }>();
  // Group by shared prefix (source) into columns
  const groups: string[][] = [];
  const seen = new Map<string, number>();
  for (const t of topics) {
    const col = t.id.split("-").slice(0, 3).join("-");
    if (!seen.has(col)) {
      seen.set(col, groups.length);
      groups.push([]);
    }
    groups[seen.get(col)!].push(t.id);
  }
  const maxRows = Math.max(...groups.map((g) => g.length), 1);
  groups.forEach((ids, ci) =>
    ids.forEach((id, ri) => {
      positions.set(id, { x: PAD + ci * GAP_X, y: PAD + ri * GAP_Y });
    }),
  );
  return {
    positions,
    svgW: PAD * 2 + groups.length * GAP_X,
    svgH: PAD * 2 + maxRows * GAP_Y,
  };
}

export default function GraphPage() {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [mastery, setMastery] = useState<Record<string, Mastery>>({});
  const [selected, setSelected] = useState<Topic | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setAllTopics);
    fetch("/api/graph")
      .then((r) => r.json())
      .then((d: { edges: Edge[] }) => setAllEdges(d.edges));
    try {
      const s = JSON.parse(localStorage.getItem("student") ?? "{}");
      setMastery(s.mastery ?? {});
    } catch {
      /* empty */
    }
  }, []);

  const topics = allTopics;
  const topicIds = new Set(topics.map((t) => t.id));
  const edges = allEdges.filter(
    (e) => topicIds.has(e.from) && topicIds.has(e.to),
  );

  const { positions, svgW, svgH } = layoutTopics(topics);

  const masteryCount = (m: Mastery) =>
    topics.filter((t) => (mastery[t.id] ?? "unseen") === m).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">
          Statistics Prerequisite Graph
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          {topics.length} topics across{" "}
          {
            new Set(topics.map((t) => t.id.split("-").slice(0, 3).join("-")))
              .size
          }{" "}
          courses. Click a node for details.
        </p>
      </div>

      {/* Mastery legend */}
      <div className="flex gap-3 flex-wrap text-xs">
        {(["unseen", "seen", "practiced", "confident"] as Mastery[]).map(
          (m) => (
            <div key={m} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border"
                style={{
                  background: MASTERY_COLOR[m],
                  borderColor: MASTERY_BORDER[m],
                }}
              />
              <span className="text-slate-400">
                {MASTERY_LABEL[m]} ({masteryCount(m)})
              </span>
            </div>
          ),
        )}
      </div>

      {/* Column headers */}
      <div
        className="flex gap-0"
        style={{ paddingLeft: PAD, gap: GAP_X - W + W }}
      >
        <div
          style={{ width: W }}
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center"
        ></div>
        <div
          style={{ width: W, marginLeft: GAP_X - W }}
          className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center"
        ></div>
      </div>

      {/* Graph */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-auto">
        <svg width={svgW} height={svgH}>
          <defs>
            <marker
              id="arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="#475569" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const f = positions.get(e.from);
            const t = positions.get(e.to);
            if (!f || !t) return null;
            const x1 = f.x + W / 2,
              y1 = f.y + H / 2;
            const x2 = t.x + W / 2,
              y2 = t.y + H / 2;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#334155"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            );
          })}

          {/* Nodes */}
          {topics.map((t) => {
            const pos = positions.get(t.id);
            if (!pos) return null;
            const m: Mastery = (mastery[t.id] ?? "unseen") as Mastery;
            const isSelected = selected?.id === t.id;
            return (
              <g
                key={t.id}
                onClick={() =>
                  setSelected((prev) => (prev?.id === t.id ? null : t))
                }
                className="cursor-pointer group"
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={W}
                  height={H}
                  rx={10}
                  fill={MASTERY_COLOR[m]}
                  stroke={isSelected ? "#818cf8" : MASTERY_BORDER[m]}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                <foreignObject
                  x={pos.x + 8}
                  y={pos.y + 6}
                  width={W - 16}
                  height={H - 12}
                >
                  <div className="text-xs text-white leading-tight font-medium">
                    {t.title}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="rounded-2xl border border-indigo-800/50 bg-slate-900 p-5 space-y-3">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-white">{selected.title}</h3>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-600 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span
              className="px-2 py-0.5 rounded-full border"
              style={{
                background:
                  MASTERY_COLOR[(mastery[selected.id] ?? "unseen") as Mastery],
                borderColor:
                  MASTERY_BORDER[(mastery[selected.id] ?? "unseen") as Mastery],
                color: "white",
              }}
            >
              {MASTERY_LABEL[(mastery[selected.id] ?? "unseen") as Mastery]}
            </span>
            {selected.scheduledFor && (
              <span className="text-slate-500">
                Due {selected.scheduledFor}
              </span>
            )}
          </div>

          {edges.filter((e) => e.to === selected.id).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                Prerequisites
              </p>
              {edges
                .filter((e) => e.to === selected.id)
                .map((e, i) => {
                  const fromTopic = allTopics.find((t) => t.id === e.from);
                  return (
                    <p key={i} className="text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">
                        {fromTopic?.title ?? e.from}
                      </span>
                      {" — "}
                      {e.reason}
                    </p>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
