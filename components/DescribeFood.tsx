"use client";

import { FormEvent, useState } from "react";
import { Food } from "@/lib/types";
import { useAnalysis } from "@/lib/useAnalysis";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";
import AnalysisResult from "./AnalysisResult";

const MAX_LENGTH = 500;

export default function DescribeFood({
  onAddMany,
}: {
  onAddMany: (foods: Food[]) => Promise<void>;
}) {
  const [description, setDescription] = useState("");
  const { status, result, error, analyzeText, reset } = useAnalysis();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = description.trim();
    if (!trimmed || status === "loading") return;
    analyzeText(trimmed);
  }

  function startOver() {
    reset();
    setDescription("");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="meal-description" className="sr-only">
          Describe what you ate
        </label>
        <textarea
          id="meal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
          rows={3}
          placeholder="Describe what you ate — e.g. “grilled chicken with rice and salad”"
          className="w-full resize-y rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-white/10 dark:bg-neutral-900"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400 tabular-nums">
            {description.length}/{MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!description.trim() || status === "loading"}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {status === "loading" ? <Spinner label="Analyzing…" /> : "Look up nutrition"}
          </button>
        </div>
      </form>

      {status === "loading" && (
        <p className="text-neutral-500">
          <Spinner label="Asking the AI about your meal…" />
        </p>
      )}

      {status === "error" && error && (
        <ErrorNotice
          message={error}
          onRetry={() => analyzeText(description.trim())}
        />
      )}

      {status === "done" && result && (
        <AnalysisResult
          analysis={result}
          onAddMany={onAddMany}
          onDismiss={startOver}
          emptyMessage="No food found in that description. Try naming the dish and roughly how much."
        />
      )}
    </div>
  );
}
