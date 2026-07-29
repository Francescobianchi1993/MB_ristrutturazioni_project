"use client";

import { formatEuro } from "@/lib/stima";
import type { Stima } from "@/lib/types";
import { IconEuro } from "../icons";

export default function StimaResult({
  stima,
  onContinua,
}: {
  stima: Stima;
  onContinua: () => void;
}) {
  return (
    <div className="animate-fade-in-up text-center">
      <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <IconEuro className="h-7 w-7" />
      </div>

      <h3 className="text-xl font-bold sm:text-2xl">
        La tua stima indicativa
      </h3>
      <p className="mt-2 text-sm text-ink-muted">
        In base a zona, superficie e stato dichiarati.
      </p>

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
        <p className="text-3xl font-extrabold tracking-tight text-brand-700 sm:text-4xl">
          {formatEuro(stima.min)}
          <span className="mx-2 text-ink-muted">–</span>
          {formatEuro(stima.max)}
        </p>
      </div>

      <div className="mx-auto mt-5 max-w-md rounded-xl bg-amber-50 p-4 text-left">
        <p className="text-xs leading-relaxed text-amber-800">
          <strong>Stima puramente indicativa e non vincolante.</strong> È un
          semplice ordine di grandezza calcolato in automatico. Ti
          ricontatteremo con una valutazione reale, basata su un&apos;analisi
          effettiva dell&apos;immobile.
        </p>
      </div>

      <button type="button" onClick={onContinua} className="btn-primary mt-7 w-full">
        Perfetto, ricontattatemi
      </button>
    </div>
  );
}
