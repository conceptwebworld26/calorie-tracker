export default function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium transition hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
        >
          Try again
        </button>
      )}
    </div>
  );
}
