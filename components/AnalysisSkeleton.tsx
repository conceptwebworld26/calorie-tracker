import Spinner from "./Spinner";

/**
 * Stands in for the result list while the model is working, at roughly the
 * height the answer will be, so the panel does not jump when it arrives.
 */
export default function AnalysisSkeleton({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <p className="text-sm text-ink-2">
        <Spinner label={message} />
      </p>
      <div className="mt-4 space-y-3" aria-hidden>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <div className="size-4 shrink-0 animate-pulse rounded bg-sunken" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3 animate-pulse rounded bg-sunken"
                style={{ width: `${70 - row * 12}%` }}
              />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
