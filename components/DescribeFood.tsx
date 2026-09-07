"use client";

import { FormEvent, useState } from "react";
import { Food } from "@/lib/types";
import { useAnalysis } from "@/lib/useAnalysis";
import Button from "./Button";
import Spinner from "./Spinner";
import ErrorNotice from "./ErrorNotice";
import AnalysisResult from "./AnalysisResult";
import AnalysisSkeleton from "./AnalysisSkeleton";

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

  const remaining = MAX_LENGTH - description.length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label
          htmlFor="meal-description"
          className="block text-sm text-ink-2"
        >
          Write what you ate in your own words. Rough amounts help.
        </label>
        <textarea
          id="meal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
          rows={3}
          placeholder="Two scrambled eggs, a slice of toast and a flat white"
          className="w-full resize-y rounded-xl border border-rule-strong bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
        />
        <div className="flex items-center justify-between gap-3">
          {/* Only worth showing once it starts to matter. */}
          <span
            className={`text-xs ${remaining <= 50 ? "text-warn" : "text-ink-3"}`}
          >
            {remaining <= 50 ? `${remaining} characters left` : ""}
          </span>
          {/* Once there is a result on screen, adding it is the primary action
              and looking it up again is not. */}
          <Button
            type="submit"
            variant={status === "done" ? "secondary" : "primary"}
            disabled={!description.trim() || status === "loading"}
          >
            {status === "loading" ? (
              <Spinner label="Reading" />
            ) : status === "done" ? (
              "Look up again"
            ) : (
              "Look up nutrition"
            )}
          </Button>
        </div>
      </form>

      {status === "loading" && (
        <AnalysisSkeleton message="Working out what is in that meal" />
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
          emptyMessage="No food found in that description. Try naming the dish and roughly how much of it."
        />
      )}
    </div>
  );
}
