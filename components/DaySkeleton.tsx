/**
 * The first paint while today's log and goals are fetched. It mirrors the real
 * layout rather than showing a spinner, so nothing jumps when the data lands.
 */
export default function DaySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading today's log"
      className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-8"
    >
      <div className="rounded-2xl border border-rule bg-surface p-5 shadow-card sm:p-6">
        <div className="h-3.5 w-24 animate-pulse rounded bg-sunken" />
        <div className="mt-3 h-11 w-40 animate-pulse rounded bg-sunken" />
        <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-sunken" />
        <div className="mt-6 space-y-4 border-t border-rule pt-5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-1.5 w-full animate-pulse rounded-full bg-sunken" />
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-2xl border border-rule bg-surface p-4 shadow-card sm:p-5">
          <div className="h-4 w-28 animate-pulse rounded bg-sunken" />
          <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-sunken" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((card) => (
              <div
                key={card}
                className="h-[5.5rem] animate-pulse rounded-xl bg-sunken"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
