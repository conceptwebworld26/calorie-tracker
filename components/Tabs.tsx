"use client";

import { KeyboardEvent, useRef } from "react";

/**
 * A tab strip with the keyboard behaviour the role promises: arrows move
 * between tabs, Home and End jump to the ends, and only the selected tab is
 * in the tab order. Declaring `role="tablist"` without this is a broken
 * promise to anyone not using a mouse.
 */
export default function Tabs<Id extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly { id: Id; label: string }[];
  active: Id;
  onChange: (id: Id) => void;
  label: string;
}) {
  const strip = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offset =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    let next: number | null = null;
    const current = tabs.findIndex((tab) => tab.id === active);

    if (offset !== 0) next = (current + offset + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;

    event.preventDefault();
    onChange(tabs[next].id);
    // Selection follows focus here, so focus has to follow selection too.
    strip.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex gap-1 rounded-xl border border-rule bg-sunken p-1"
    >
      {tabs.map(({ id, label: tabLabel }) => (
        <button
          key={id}
          role="tab"
          type="button"
          id={`tab-${id}`}
          aria-selected={active === id}
          aria-controls={`panel-${id}`}
          tabIndex={active === id ? 0 : -1}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            active === id
              ? "bg-surface text-ink shadow-card"
              : "text-ink-2 hover:text-ink"
          }`}
        >
          {tabLabel}
        </button>
      ))}
    </div>
  );
}
