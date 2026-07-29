"use client";

import { TELEFONO, TELEFONO_HREF } from "@/lib/contatti";
import { IconCheck, IconPhone } from "../icons";

export default function ThankYou() {
  return (
    <div className="animate-fade-in-up py-4 text-center">
      <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <IconCheck className="h-8 w-8" />
      </div>

      <h3 className="text-2xl font-bold sm:text-3xl">Grazie!</h3>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        Abbiamo ricevuto la tua richiesta. Ti ricontattiamo{" "}
        <strong>entro 24h</strong> con una valutazione reale, senza alcun
        impegno da parte tua.
      </p>

      <p className="mt-6 text-sm text-ink-muted">Preferisci parlarci subito?</p>
      <a
        href={TELEFONO_HREF}
        className="btn-secondary mt-3 w-full max-w-xs"
      >
        <IconPhone className="h-5 w-5 text-brand-600" />
        {TELEFONO}
      </a>
    </div>
  );
}
