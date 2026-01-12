"use client";

import { useState } from "react";

/* =======================
   Types
======================= */

interface IndexPdfResponse {
  message?: string;
  status?: string;
}

/* =======================
   API helper
======================= */

async function indexPdf(file: File): Promise<IndexPdfResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/index-pdf`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to index PDF");
  }

  return res.json();
}

/* =======================
   Page
======================= */

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setStatus(null);
    setError(null);

    try {
      setLoading(true);
      const res = await indexPdf(file);
      setStatus(res.message ?? res.status ?? "Indexed successfully");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Upload failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">
          Upload PDF for Indexing
        </h1>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>

        {status && (
          <p className="mt-4 text-green-600 font-medium">
            {status}
          </p>
        )}

        {error && (
          <p className="mt-4 text-red-600 font-medium">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
