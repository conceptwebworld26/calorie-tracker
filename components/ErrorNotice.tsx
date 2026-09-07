import Button from "./Button";

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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-over/25 bg-over-wash px-4 py-3 text-sm text-over"
    >
      <span className="min-w-0">{message}</span>
      {onRetry && (
        <Button
          type="button"
          size="sm"
          onClick={onRetry}
          className="border-over/30 bg-transparent text-over hover:bg-over/10"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
