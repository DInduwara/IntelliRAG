/**
 * Application footer
 *
 * Goals:
 * - Professional and minimal
 * - Clearly communicate project context
 * - Suitable for academic evaluation and demos
 *
 * Footer sections:
 * - Project identity
 * - Technology stack
 * - Attribution / purpose
 */

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Project identity */}
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-950 text-sm font-black">
                IR
              </span>
              <span className="text-sm font-semibold text-zinc-100">
                IntelliRAG
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Multi-Agent Retrieval-Augmented Generation system with
              evidence-aware answers and chunk-level citations.
            </p>
          </div>

          {/* Technology stack */}
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              Technology Stack
            </div>
            <ul className="mt-2 space-y-1 text-xs text-zinc-400">
              <li>LangChain v1 + LangGraph</li>
              <li>FastAPI backend</li>
              <li>Pinecone vector database</li>
              <li>Next.js + Tailwind CSS</li>
              <li>OpenAI embeddings & chat models</li>
            </ul>
          </div>

          {/* Academic / project context */}
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              Project Context
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Developed as part of the IKMS Multi-Agent RAG extension.
              Focused on transparency, citation accuracy, and agentic
              orchestration.
            </p>

            <p className="mt-3 text-xs text-zinc-500">
              © {new Date().getFullYear()} IntelliRAG
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
