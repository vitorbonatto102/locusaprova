"use client";

import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categories = [
  ["fact", "Fato juridicamente relevante", "bg-amber-100"],
  ["procedure", "Dado processual", "bg-sky-100"],
  ["time", "Marco temporal", "bg-rose-100"],
  ["term", "Termo técnico", "bg-violet-100"],
  ["request", "Pedido implícito", "bg-emerald-100"],
  ["distractor", "Distrator", "bg-slate-200"],
] as const;

type Mark = { text: string; category: string; label: string; className: string };

export function ActiveReading({ text, compact = false }: { text: string; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState("");
  const [marks, setMarks] = useState<Mark[]>([]);
  const parts = useMemo(() => {
    if (!marks.length) return [{ text, mark: null as Mark | null }];
    const found = marks.map((mark) => ({ mark, index: text.indexOf(mark.text) })).filter((entry) => entry.index >= 0).sort((a, b) => a.index - b.index);
    const result: { text: string; mark: Mark | null }[] = [];
    let cursor = 0;
    for (const entry of found) {
      if (entry.index < cursor) continue;
      if (entry.index > cursor) result.push({ text: text.slice(cursor, entry.index), mark: null });
      result.push({ text: entry.mark.text, mark: entry.mark });
      cursor = entry.index + entry.mark.text.length;
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor), mark: null });
    return result;
  }, [marks, text]);

  function captureSelection() {
    const current = window.getSelection();
    if (!current || !container.current?.contains(current.anchorNode)) return;
    const value = current.toString().trim();
    if (value.length >= 3) setSelection(value);
  }

  function mark(category: typeof categories[number]) {
    if (!selection) return;
    setMarks((current) => [...current.filter((item) => item.text !== selection), { text: selection, category: category[0], label: category[1], className: category[2] }]);
    setSelection("");
    window.getSelection()?.removeAllRanges();
  }

  return <div>
    <div ref={container} onMouseUp={captureSelection} className={`whitespace-pre-wrap rounded-2xl border bg-[var(--mist)] text-[var(--ink)] ${compact ? "max-h-72 overflow-y-auto p-4 text-sm leading-6" : "max-h-[520px] overflow-y-auto p-5 text-sm leading-7"}`}>
      {parts.map((part, index) => part.mark ? <mark key={`${part.text}-${index}`} title={part.mark.label} className={`${part.mark.className} rounded px-0.5 text-inherit`}>{part.text}</mark> : <span key={index}>{part.text}</span>)}
    </div>
    {selection && <div className="mt-3 rounded-2xl border bg-white p-3">
      <p className="text-xs font-semibold text-[var(--muted-ink)]">Classifique: “{selection.slice(0, 90)}{selection.length > 90 ? "…" : ""}”</p>
      <div className="mt-2 flex flex-wrap gap-2">{categories.map((category) => <Button key={category[0]} onClick={() => mark(category)} size="sm" variant="outline" className="h-8 rounded-lg text-[11px]">{category[1]}</Button>)}</div>
    </div>}
    {marks.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{marks.map((item, index) => <Badge key={`${item.text}-${index}`} variant="outline" className={item.className}>{item.label}: {item.text.slice(0, 34)}</Badge>)}</div>}
  </div>;
}
