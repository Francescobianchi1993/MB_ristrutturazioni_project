import { IconCheck, IconX } from "./icons";

const righe: { voce: string; agenzia: string; noi: string }[] = [
  {
    voce: "Commissioni",
    agenzia: "2–4% + IVA a tuo carico",
    noi: "Zero commissioni",
  },
  {
    voce: "Tempi",
    agenzia: "Anche 6–12 mesi",
    noi: "Offerta in pochi giorni",
  },
  {
    voce: "Visite",
    agenzia: "Decine di visite e appuntamenti",
    noi: "Un solo sopralluogo",
  },
  {
    voce: "Costi a tuo carico",
    agenzia: "Provvigioni, tempi morti, incertezza",
    noi: "Nessun costo a tuo carico",
  },
  {
    voce: "Certezza della vendita",
    agenzia: "Dipende dal mercato e dagli acquirenti",
    noi: "Acquistiamo noi, direttamente",
  },
];

export default function PercheConviene() {
  return (
    <section id="perche" className="bg-slate-50 py-16 sm:py-20">
      <div className="section">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Perché conviene</h2>
          <p className="mt-3 text-ink-muted">
            Il confronto quando hai bisogno di vendere in fretta.
          </p>
        </div>

        {/* Tabella responsive: su mobile diventa una serie di card impilate. */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="grid grid-cols-3 bg-slate-100 text-sm font-semibold text-ink">
            <div className="px-4 py-3.5" />
            <div className="px-4 py-3.5 text-center text-ink-muted">
              Con l&apos;agenzia
            </div>
            <div className="px-4 py-3.5 text-center text-brand-700">Con noi</div>
          </div>

          {righe.map((r, i) => (
            <div
              key={r.voce}
              className={`grid grid-cols-3 items-stretch text-sm ${
                i % 2 ? "bg-white" : "bg-slate-50/50"
              }`}
            >
              <div className="flex items-center px-4 py-4 font-semibold text-ink">
                {r.voce}
              </div>
              <div className="flex items-center gap-2 px-4 py-4 text-ink-muted">
                <IconX className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{r.agenzia}</span>
              </div>
              <div className="flex items-center gap-2 bg-brand-50/60 px-4 py-4 font-medium text-brand-800">
                <IconCheck className="h-4 w-4 shrink-0 text-brand-600" />
                <span>{r.noi}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-ink-muted">
          Il vantaggio economico si riferisce allo scenario di{" "}
          <strong>vendita rapida</strong>: azzerando commissioni, tempi morti e
          incertezza puoi ottenere un incasso netto conveniente rispetto a una
          vendita d&apos;urgenza tramite agenzia. Non è un confronto con la
          vendita a prezzo pieno sui tempi lunghi del mercato.
        </p>

        <div className="mt-8 text-center">
          <a href="#form" className="btn-primary w-full max-w-sm">
            Scopri quanto vale casa tua
          </a>
        </div>
      </div>
    </section>
  );
}
