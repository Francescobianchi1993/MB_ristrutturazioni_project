import { IconArrowDown, IconClock, IconShield } from "./icons";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="section relative flex flex-col items-center py-16 text-center sm:py-24">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-4 py-1.5 text-sm font-medium text-brand-700">
          <IconShield className="h-4 w-4" />
          Acquisto diretto immobili · Roma
        </span>

        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Vendi casa in fretta a Roma.
          <br className="hidden sm:block" />{" "}
          <span className="text-brand-600">
            Senza agenzia, senza commissioni.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-ink-soft sm:text-xl">
          Acquistiamo noi il tuo immobile, direttamente. Offerta chiara, tempi
          rapidi, zero costi a tuo carico.
        </p>

        <a href="#form" className="btn-primary mt-8 w-full max-w-sm text-lg">
          Scopri quanto vale casa tua
          <IconArrowDown className="h-5 w-5" />
        </a>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <IconClock className="h-4 w-4 text-brand-600" />
            Risposta entro 24h
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconShield className="h-4 w-4 text-brand-600" />
            Nessun obbligo
          </span>
        </p>
      </div>
    </section>
  );
}
