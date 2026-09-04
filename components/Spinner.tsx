export default function Spinner({ label }: { label?: string }) {
  return (
    /* Colour is inherited so this reads correctly both on the page and inside
       a dark primary button. */
    <span className="inline-flex items-center gap-2 text-sm">
      {/* When a label is visible it is the accessible name, so the disc is
          hidden from assistive tech to avoid announcing the text twice. */}
      <span
        aria-hidden={label ? true : undefined}
        role={label ? undefined : "status"}
        aria-label={label ? undefined : "Loading"}
        className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {label && <span role="status">{label}</span>}
    </span>
  );
}
