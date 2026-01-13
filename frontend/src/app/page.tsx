"use client";

import { useMemo, useState } from "react";
import { askQuestion } from "@/lib/api";
import type { QAResponse } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";

export default function Page() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QAResponse | null>(null);

  const canAsk = useMemo(() => question.trim().length > 2 && !loading, [question, loading]);

  async function onAsk() {
    setError(null);
    setData(null);

    try {
      setLoading(true);
      const res = await askQuestion({ question: question.trim() });
      setData(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ask IntelliRAG</h1>
        <p className="mt-2 text-zinc-300/80">
          Ask questions after indexing your PDF. Results come from your RAG backend.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Question"
          subtitle="Type a question and submit. Make sure your backend is running on port 8000."
          right={
            <Button onClick={onAsk} disabled={!canAsk}>
              {loading ? "Asking..." : "Ask"}
            </Button>
          }
        />
        <CardBody>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What are the main challenges of vector databases?"
            className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm
                       placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              Tip: Index a PDF first in <span className="font-semibold text-zinc-200">Upload PDF</span>.
            </div>
            {loading ? <Spinner label="Calling /qa..." /> : null}
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Answer" subtitle="The assistant response returned by your API." />
        <CardBody>
          {data?.answer ? (
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed">{data.answer}</p>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">
              No answer yet. Ask a question to see results here.
            </div>
          )}

          {data?.sources?.length ? (
            <div className="mt-6">
              <div className="text-sm font-semibold">Sources</div>
              <div className="mt-3 grid gap-3">
                {data.sources.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-zinc-400">Source #{i + 1}</div>
                    {s.text ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100/90">
                        {s.text}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-400">(No text)</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}