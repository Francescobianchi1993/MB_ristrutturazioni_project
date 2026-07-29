import { IconHome, IconEuro, IconHandshake } from "./icons";

const steps = [
  {
    icon: IconHome,
    titolo: "Raccontaci la tua casa",
    testo:
      "Compili il modulo con le caratteristiche dell'immobile. Bastano pochi minuti, tutto online.",
  },
  {
    icon: IconEuro,
    titolo: "Ricevi una valutazione",
    testo:
      "Analizziamo i dati e ti richiamiamo entro 24h con una valutazione basata sul mercato della tua zona.",
  },
  {
    icon: IconHandshake,
    titolo: "Ti facciamo un'offerta",
    testo:
      "Se sei d'accordo, procediamo all'acquisto diretto. Tempi rapidi e nessuna commissione a tuo carico.",
  },
];

export default function ComeFunziona() {
  return (
    <section id="come-funziona" className="section py-16 sm:py-20">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Come funziona</h2>
        <p className="mt-3 text-ink-muted">Tre passi semplici, senza sorprese.</p>
      </div>

      <ol className="grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={s.titolo}
              className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-card"
            >
              <span className="absolute right-5 top-5 text-5xl font-black text-slate-100">
                {i + 1}
              </span>
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{s.titolo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {s.testo}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
