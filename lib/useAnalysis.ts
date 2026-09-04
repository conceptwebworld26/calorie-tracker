"use client";

import { useCallback, useRef, useState } from "react";
import { NutritionAnalysis } from "@/lib/types";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/**
 * Turns whatever went wrong into something worth showing a person. The API's
 * own 400 messages are already specific and actionable, so those pass through;
 * everything else gets a plain-language stand-in.
 */
async function friendlyError(res: Response): Promise<string> {
  let apiMessage = "";
  try {
    const body = await res.json();
    if (typeof body?.error === "string") apiMessage = body.error;
  } catch {
    // Non-JSON error body — fall through to the status-based message.
  }

  if (res.status === 400 && apiMessage) return apiMessage;
  if (res.status === 500 && apiMessage.includes("GEMINI_API_KEY")) {
    return "The AI service isn't set up yet. Add GEMINI_API_KEY to .env and restart the server.";
  }
  if (res.status === 502) {
    return "The AI couldn't work that out just now. Please try again in a moment.";
  }
  if (res.status === 413) {
    return "That file is too large to upload.";
  }
  return "Something went wrong on our end. Please try again.";
}

type Status = "idle" | "loading" | "done" | "error";

/**
 * Owns the request lifecycle for both AI lookup routes. The text and photo
 * panels differ only in what they send, so they share this.
 */
export function useAnalysis() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<NutritionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first request overwriting a newer one's result.
  const requestId = useRef(0);

  const run = useCallback(async (input: RequestInit & { url: string }) => {
    const id = ++requestId.current;
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const { url, ...init } = input;
      const res = await fetch(url, init);
      if (id !== requestId.current) return;

      if (!res.ok) {
        setError(await friendlyError(res));
        setStatus("error");
        return;
      }

      const data: NutritionAnalysis = await res.json();
      if (id !== requestId.current) return;

      setResult(data);
      setStatus("done");
    } catch {
      if (id !== requestId.current) return;
      setError("Couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }, []);

  const analyzeText = useCallback(
    (description: string) =>
      run({
        url: "/api/analyze/text",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      }),
    [run]
  );

  const analyzeImage = useCallback(
    (file: File) => {
      const form = new FormData();
      form.append("image", file);
      return run({ url: "/api/analyze/image", method: "POST", body: form });
    },
    [run]
  );

  const reset = useCallback(() => {
    requestId.current++;
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const fail = useCallback((message: string) => {
    requestId.current++;
    setResult(null);
    setError(message);
    setStatus("error");
  }, []);

  return { status, result, error, analyzeText, analyzeImage, reset, fail };
}
