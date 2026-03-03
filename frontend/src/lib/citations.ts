/**
 * Citation Parsing & Tokenization Module
 *
 * Helpers for working with citation tokens in LLM answer strings.
 * Tokens must be formatted in square brackets.
 * * Architecture Note (Feature 4): 
 * The regex `/\[([^\[\]\n]{1,40})\]/g` is strictly coupled to the Python backend's
 * `_CITATION_RE = re.compile(r"\[([^\[\]\n]{1,40})\]")`. This ensures that exactly 
 * what the LangGraph verification node outputs is safely parsed by the React frontend.
 */

export type AnswerToken =
  | { type: "text"; value: string }
  | { type: "citation"; id: string };

/**
 * Extracts all unique citation IDs from an answer string in the order they appear.
 * Used to calculate which evidence cards need to be rendered in the UI sidebar.
 */
export function extractCitationIds(answer: string): string[] {
  const re = /\[([^\[\]\n]{1,40})\]/g;
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(answer)) !== null) {
    ids.push(m[1]);
  }

  // Deduplicate while preserving original appearance order
  return Array.from(new Set(ids));
}

/**
 * Splits an unbroken answer string into text and citation tokens.
 * This allows the UI to render the string safely, while injecting the interactive 
 * <CitationTag /> React component wherever a bracketed ID is found.
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

  // Push any remaining text after the final citation
  if (lastIndex < answer.length) {
    out.push({ type: "text", value: answer.slice(lastIndex) });
  }

  return out;
}
