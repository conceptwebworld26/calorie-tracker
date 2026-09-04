"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Food } from "@/lib/types";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  useAnalysis,
} from "@/lib/useAnalysis";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";
import AnalysisResult from "./AnalysisResult";

export default function PhotoFood({
  onAddMany,
}: {
  onAddMany: (foods: Food[]) => Promise<void>;
}) {
  // File and its preview URL are stored together so the URL is created once,
  // at pick time, rather than derived in an effect on every render.
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, result, error, analyzeImage, reset, fail } = useAnalysis();

  const file = picked?.file ?? null;
  const previewUrl = picked?.url ?? null;

  // Object URLs leak until revoked. This cleanup fires both when `picked` is
  // replaced and on unmount, so every URL created is released exactly once.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    if (!chosen) return;

    // Check locally first so an obviously bad file never costs an upload.
    if (!ALLOWED_IMAGE_TYPES.includes(chosen.type)) {
      setPicked(null);
      fail("That file isn't a supported image. Use a JPEG, PNG, WebP or HEIC photo.");
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setPicked(null);
      fail(
        `That photo is ${(chosen.size / 1024 / 1024).toFixed(1)}MB — please use one under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`
      );
      return;
    }

    reset();
    setPicked({ file: chosen, url: URL.createObjectURL(chosen) });
    analyzeImage(chosen);
  }

  function startOver() {
    reset();
    setPicked(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id="meal-photo"
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        onChange={handleFileChange}
        className="sr-only"
      />

      {!file && (
        <label
          htmlFor="meal-photo"
          className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-black/15 px-4 py-10 text-center transition hover:border-neutral-400 hover:bg-black/[0.02] dark:border-white/15 dark:hover:bg-white/[0.03]"
        >
          <span className="text-sm font-medium">Take or upload a photo</span>
          <span className="text-xs text-neutral-500">
            JPEG, PNG, WebP or HEIC · up to {MAX_IMAGE_BYTES / 1024 / 1024}MB
          </span>
        </label>
      )}

      {previewUrl && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview of a
              local file; next/image needs a static or remote-configured source. */}
          <img
            src={previewUrl}
            alt="The meal you uploaded"
            className="max-h-64 w-full rounded-lg border border-black/10 object-contain dark:border-white/10"
          />
          <button
            type="button"
            onClick={startOver}
            className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Choose a different photo
          </button>
        </div>
      )}

      {status === "loading" && (
        <p className="text-neutral-500">
          <Spinner label="Looking at your photo…" />
        </p>
      )}

      {status === "error" && error && (
        <ErrorNotice
          message={error}
          onRetry={file ? () => analyzeImage(file) : undefined}
        />
      )}

      {status === "done" && result && (
        <AnalysisResult
          analysis={result}
          onAddMany={onAddMany}
          onDismiss={startOver}
          emptyMessage="No food spotted in that photo. Try a clearer shot of the plate."
        />
      )}
    </div>
  );
}
