import { useState } from "react";

export function QueryPlan({ plan, subQuestions }: { plan: string; subQuestions: string[] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!plan && (!subQuestions || subQuestions.length === 0)) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-indigo-500/5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/20"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          AI Search Strategy
        </div>
        <span className="text-xs text-indigo-300/70">{isOpen ? "Hide" : "Show"}</span>
      </button>
      
      {isOpen && (
        <div className="p-4">
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/70">The Plan</div>
            <p className="mt-1 text-sm text-indigo-100/90">{plan}</p>
          </div>
          
          {subQuestions && subQuestions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/70">Sub-Queries Executed</div>
              <ul className="mt-2 flex flex-col gap-2">
                {subQuestions.map((sq, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-indigo-100/80">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-300">
                      {i + 1}
                    </span>
                    {sq}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}