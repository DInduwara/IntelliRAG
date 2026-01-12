"use client";

import { useState } from "react";

/* =======================
   Types
======================= */

interface QARequest {
  question: string;
}

interface QAResponse {
  answer?: string;
}

/* =======================
   API helper
======================= */

async function askQuestion(payload: QARequest): Promise<QAResponse> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/qa`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch answer");
  }

  return res.json();
}

/* =======================
   Page
======================= */

export default function HomePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setAnswer(null);
    setError(null);

    try {
      setLoading(true);
      const res = await askQuestion({ question });
      setAnswer(res.answer ?? "(No answer returned)");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">
          IntelliRAG – Question Answering
        </h1>

        <textarea
          className="w-full border rounded p-3 mb-4 resize-none"
          rows={4}
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>

        {error && (
          <p className="mt-4 text-red-600 font-medium">
            {error}
          </p>
        )}

        {answer && (
          <div className="mt-6 p-4 bg-gray-50 border rounded">
            <h2 className="font-semibold mb-2">Answer</h2>
            <p className="whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </div>
    </main>
  );
}
