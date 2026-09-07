"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Food } from "@/lib/types";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  useAnalysis,
} from "@/lib/useAnalysis";
import Button from "./Button";
import ErrorNotice from "./ErrorNotice";
import AnalysisResult from "./AnalysisResult";
import AnalysisSkeleton from "./AnalysisSkeleton";

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / 1024 / 1024;

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
      fail(
        "That file isn't a supported image. Use a JPEG, PNG, WebP or HEIC photo."
      );
      return;
    }
    if (chosen.size > MAX_IMAGE_BYTES) {
      setPicked(null);
      fail(
        `That photo is ${(chosen.size / 1024 / 1024).toFixed(1)}MB. Photos need to be under ${MAX_IMAGE_MB}MB.`
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
    <div className="space-y-4">
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
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-rule-strong px-4 py-12 text-center transition-colors hover:border-ink hover:bg-hover has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            className="size-7 text-ink-3"
          >
            <rect
              x="2.75"
              y="5.75"
              width="18.5"
              height="14.5"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M8.5 5.75l1.2-2.1a1 1 0 01.87-.5h2.86a1 1 0 01.87.5l1.2 2.1"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="13"
              r="3.75"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span className="font-medium">Take or upload a photo</span>
          <span className="text-sm text-ink-3">
            JPEG, PNG, WebP or HEIC, up to {MAX_IMAGE_MB}MB
          </span>
        </label>
      )}

      {previewUrl && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview of a
              local file; next/image needs a static or remote-configured source. */}
          <img
            src={previewUrl}
            alt="The meal you uploaded"
            className="max-h-72 w-full rounded-xl border border-rule bg-sunken object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={startOver}
          >
            Choose a different photo
          </Button>
        </div>
      )}

      {status === "loading" && (
        <AnalysisSkeleton message="Looking at your plate" />
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
          emptyMessage="No food spotted in that photo. Try a clearer shot of the whole plate."
        />
      )}
    </div>
  );
}
