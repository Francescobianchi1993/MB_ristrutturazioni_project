"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {optional && (
          <span className="text-xs font-normal text-ink-muted">facoltativo</span>
        )}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border bg-white px-4 py-3.5 text-base text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function TextInput({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${
        error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300"
      }`}
    />
  );
}

export function SelectInput({
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={`${inputBase} appearance-none bg-[length:1.25rem] bg-[right_0.9rem_center] bg-no-repeat pr-11 ${
        error ? "border-red-400" : "border-slate-300"
      }`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      {children}
    </select>
  );
}

/** Gruppo di card selezionabili (radio touch-friendly). */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
  error,
}: {
  options: { value: T; label: string; sub?: string }[];
  value: T | "";
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
  error?: boolean;
}) {
  const cols =
    columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid gap-3 ${cols}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`flex flex-col items-start rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
              active
                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
                : error
                  ? "border-red-300 bg-white hover:border-slate-400"
                  : "border-slate-300 bg-white hover:border-brand-300"
            }`}
          >
            <span
              className={`text-sm font-semibold ${active ? "text-brand-800" : "text-ink"}`}
            >
              {o.label}
            </span>
            {o.sub && (
              <span className="mt-0.5 text-xs text-ink-muted">{o.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
