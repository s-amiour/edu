'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GraphNode, GraphEdge } from '@/types';

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
}

const typeColors: Record<string, string> = {
  Course: '#6366f1',
  Module: '#a855f7',
  Topic: '#06b6d4',
};

const typeRadii: Record<string, number> = {
  Course: 28,
  Module: 22,
  Topic: 16,
};

export function GraphVisualization({
  nodes: initialNodes,
  edges,
  width = 800,
  height = 500,
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);

  useEffect(() => {
    const initialized = initialNodes.map((node, i) => ({
      ...node,
      x: node.x ?? width / 2 + (Math.random() - 0.5) * 300,
      y: node.y ?? height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
    setNodes(initialized);
    nodesRef.current = initialized;
  }, [initialNodes, width, height]);

  const simulate = useCallback(() => {
    const current = nodesRef.current;
    if (current.length === 0) return;

    const updated = current.map((node) => ({ ...node }));

    for (let i = 0; i < updated.length; i++) {
      for (let j = i + 1; j < updated.length; j++) {
        const dx = (updated[j].x ?? 0) - (updated[i].x ?? 0);
        const dy = (updated[j].y ?? 0) - (updated[i].y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 2000 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        updated[i].vx = (updated[i].vx ?? 0) - fx;
        updated[i].vy = (updated[i].vy ?? 0) - fy;
        updated[j].vx = (updated[j].vx ?? 0) + fx;
        updated[j].vy = (updated[j].vy ?? 0) - fy;
      }
    }

    for (const edge of edges) {
      const source = updated.find((n) => n.id === edge.source);
      const target = updated.find((n) => n.id === edge.target);
      if (!source || !target) continue;
      const dx = (target.x ?? 0) - (source.x ?? 0);
      const dy = (target.y ?? 0) - (source.y ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 100) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      source.vx = (source.vx ?? 0) + fx;
      source.vy = (source.vy ?? 0) + fy;
      target.vx = (target.vx ?? 0) - fx;
      target.vy = (target.vy ?? 0) - fy;
    }

    for (const node of updated) {
      if (node.id === dragging) continue;
      node.vx = (node.vx ?? 0) * 0.85;
      node.vy = (node.vy ?? 0) * 0.85;
      node.x = Math.max(30, Math.min(width - 30, (node.x ?? 0) + (node.vx ?? 0)));
      node.y = Math.max(30, Math.min(height - 30, (node.y ?? 0) + (node.vy ?? 0)));
    }

    nodesRef.current = updated;
    setNodes([...updated]);
    animRef.current = requestAnimationFrame(simulate);
  }, [edges, width, height, dragging]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [simulate]);

  const handleMouseDown = (nodeId: string) => {
    setDragging(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    nodesRef.current = nodesRef.current.map((node) =>
      node.id === dragging ? { ...node, x, y, vx: 0, vy: 0 } : node
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-gray-900/50 rounded-xl border border-gray-700"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {edges.map((edge, i) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return null;
        return (
          <line
            key={i}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="#4b5563"
            strokeWidth="1.5"
            strokeOpacity={0.6}
          />
        );
      })}
      {nodes.map((node) => {
        const radius = typeRadii[node.type] || 16;
        const color = typeColors[node.type] || '#6366f1';
        return (
          <g
            key={node.id}
            transform={`translate(${node.x ?? 0}, ${node.y ?? 0})`}
            onMouseDown={() => handleMouseDown(node.id)}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle r={radius} fill={color} fillOpacity={0.8} stroke={color} strokeWidth="2" strokeOpacity={0.4} />
            <text
              textAnchor="middle"
              dy={radius + 14}
              fill="#a1a1aa"
              fontSize="10"
              fontFamily="sans-serif"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
