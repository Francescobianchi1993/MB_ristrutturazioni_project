// Placeholder da personalizzare con i dati reali dell'attività.
const NOME_ATTIVITA = "[NOME ATTIVITÀ]";
const PARTITA_IVA = "[P.IVA 00000000000]";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="section flex flex-col items-center gap-3 py-10 text-center text-sm text-ink-muted">
        <p className="font-semibold text-ink">{NOME_ATTIVITA}</p>
        <p>P.IVA {PARTITA_IVA} · Roma</p>
        <p>
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-brand-700"
          >
            Informativa sulla privacy
          </a>
        </p>
        <p className="max-w-xl text-xs leading-relaxed text-slate-400">
          Le valutazioni fornite tramite questo sito sono puramente indicative e
          non vincolanti. Non costituiscono una proposta di acquisto né una
          perizia ufficiale.
        </p>
      </div>
    </footer>
  );
}
