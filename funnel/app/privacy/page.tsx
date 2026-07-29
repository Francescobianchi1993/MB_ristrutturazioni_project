import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  robots: { index: false, follow: false },
};

// Pagina placeholder: sostituire il testo con l'informativa reale redatta
// secondo il Regolamento UE 2016/679 (GDPR) prima della messa online.
export default function PrivacyPage() {
  return (
    <main className="section max-w-3xl py-16">
      <Link
        href="/"
        className="text-sm font-medium text-brand-700 underline underline-offset-2"
      >
        ← Torna alla home
      </Link>

      <h1 className="mt-6 text-3xl font-bold">Informativa sulla privacy</h1>
      <p className="mt-2 text-sm text-ink-muted">
        [PLACEHOLDER] Documento da completare a cura del titolare del
        trattamento prima della pubblicazione.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-lg font-semibold text-ink">
            1. Titolare del trattamento
          </h2>
          <p className="mt-2">
            [NOME ATTIVITÀ], P.IVA [00000000000], con sede in Roma. Email di
            contatto: [email@esempio.it].
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">2. Dati raccolti</h2>
          <p className="mt-2">
            Tramite il modulo raccogliamo le informazioni sull&apos;immobile
            (tipologia, zona, superficie, stato, ecc.) e i tuoi dati di contatto
            (nome, telefono, email) al solo fine di ricontattarti con una
            valutazione.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">3. Finalità e base giuridica</h2>
          <p className="mt-2">
            I dati sono trattati per rispondere alla tua richiesta di
            valutazione e per l&apos;eventuale trattativa di acquisto, sulla
            base del consenso da te espresso (art. 6, par. 1, lett. a GDPR).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">4. Conservazione</h2>
          <p className="mt-2">
            I dati sono conservati per il tempo necessario a gestire la tua
            richiesta e comunque non oltre [periodo] salvo obblighi di legge.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">5. I tuoi diritti</h2>
          <p className="mt-2">
            Puoi in ogni momento richiedere accesso, rettifica, cancellazione o
            limitazione del trattamento, nonché revocare il consenso, scrivendo
            a [email@esempio.it].
          </p>
        </section>
      </div>
    </main>
  );
}
