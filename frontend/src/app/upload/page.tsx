"use client";

import { useState } from "react";
import { indexPdf } from "@/lib/api";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Spinner } from "@/components/Spinner";
import { FileDropzone } from "@/components/FileDropzone";

export default function UploadPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [chunks, setChunks] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setStatus(null);
    setChunks(null);
    setFileName(file.name);

    try {
      setLoading(true);
      const res = await indexPdf(file);
      setStatus(res.message ?? res.status ?? "Indexed successfully");
      setChunks(typeof res.chunks_indexed === "number" ? res.chunks_indexed : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload PDF</h1>
        <p className="mt-2 text-zinc-300/80">
          Upload a PDF to index into Pinecone. After indexing, go back to <span className="font-semibold text-zinc-200">Ask</span>.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Index a PDF"
          subtitle="This calls POST /index-pdf on your FastAPI backend."
        />
        <CardBody>
          <FileDropzone onFile={onFile} />

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              {fileName ? (
                <>
                  Selected: <span className="text-zinc-200 font-semibold">{fileName}</span>
                </>
              ) : (
                "No file selected."
              )}
            </div>
            {loading ? <Spinner label="Uploading & indexing..." /> : null}
          </div>

          {status ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="font-semibold">{status}</div>
              {chunks !== null ? (
                <div className="mt-1 text-emerald-100/90">
                  Chunks indexed: <span className="font-semibold">{chunks}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
