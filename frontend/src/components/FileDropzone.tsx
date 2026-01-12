"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "./Button";

export function FileDropzone({
  accept = ".pdf,application/pdf",
  onFile,
}: {
  accept?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handlePick = () => {
    const f = inputRef.current?.files?.[0];
    if (f) onFile(f);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={onDrop}
      className={[
        "rounded-2xl border border-dashed p-6 transition",
        isOver ? "border-white/40 bg-white/10" : "border-white/15 bg-white/5",
      ].join(" ")}
    >
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-semibold">Upload a PDF</p>
        <p className="text-sm text-zinc-300/80">
          Drag & drop your PDF here, or pick a file.
        </p>

        <div className="mt-2 flex items-center gap-3">
          <Button type="button" onClick={openPicker} variant="primary">
            Choose PDF
          </Button>
          <span className="text-xs text-zinc-400">Accepted: .pdf</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handlePick}
          className="hidden"
        />
      </div>
    </div>
  );
}
