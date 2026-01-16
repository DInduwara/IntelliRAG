/**
 * Helpers for working with citation tokens in answer strings.
 * Tokens must be formatted in square brackets, e.g.:
 * - [C1]
 * - [P7-C1]
 * - [P7-C12]
 *
 * This module:
 * - extracts citation ids
 * - tokenizes answer to render citations as interactive elements
 */

export type AnswerToken =
  | { type: "text"; value: string }
  | { type: "citation"; id: string };

/**
 * Extract citation IDs in the order they appear (deduplicated).
 */
export function extractCitationIds(answer: string): string[] {
  const re = /\[([^\[\]\n]{1,40})\]/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(answer)) !== null) {
    ids.push(m[1]);
  }

  // Deduplicate while preserving order
  return Array.from(new Set(ids));
}

/**
 * Split answer into text and citation tokens.
 * This allows rendering clickable citation chips inside the answer.
 */
export function tokenizeAnswer(answer: string): AnswerToken[] {
  const re = /\[([^\[\]\n]{1,40})\]/g;
  const out: AnswerToken[] = [];

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(answer)) !== null) {
    const start = m.index;
    const end = re.lastIndex;

    if (start > lastIndex) {
      out.push({ type: "text", value: answer.slice(lastIndex, start) });
    }

    out.push({ type: "citation", id: m[1] });
    lastIndex = end;
  }

  if (lastIndex < answer.length) {
    out.push({ type: "text", value: answer.slice(lastIndex) });
  }

  return out;
}
