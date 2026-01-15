export type AnswerToken =
  | { type: "text"; value: string }
  | { type: "cite"; id: string; raw: string };

const CITE_RE = /\[([^\[\]\n]{1,40})\]/g;

export function tokenizeAnswer(answer: string): AnswerToken[] {
  const out: AnswerToken[] = [];
  const s = answer ?? "";
  let last = 0;

  for (;;) {
    const m = CITE_RE.exec(s);
    if (!m) break;

    const start = m.index;
    const end = start + m[0].length;

    if (start > last) {
      out.push({ type: "text", value: s.slice(last, start) });
    }

    const id = m[1].trim();
    out.push({ type: "cite", id, raw: m[0] });

    last = end;
  }

  if (last < s.length) out.push({ type: "text", value: s.slice(last) });

  return out;
}

export function extractCitationIds(answer: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = CITE_RE.exec(answer ?? "")) !== null) {
    ids.push(m[1].trim());
  }
  return Array.from(new Set(ids));
}
