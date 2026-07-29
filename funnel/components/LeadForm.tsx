"use client";

import { useMemo, useState } from "react";
import type { LeadForm as LeadFormData, LeadPayload, Stima } from "@/lib/types";
import { calcolaStima } from "@/lib/stima";
import {
  StepImmobile,
  StepDettagli,
  StepSituazione,
  StepContatti,
} from "./form/steps";
import StimaResult from "./form/StimaResult";
import ThankYou from "./form/ThankYou";

const EMPTY: LeadFormData = {
  tipo_immobile: "",
  zona: "",
  indirizzo: "",
  mq: "",
  piano: "",
  ascensore: "",
  locali: "",
  bagni: "",
  stato: "",
  classe_energetica: "",
  anno_costruzione: "",
  motivo_vendita: "",
  tempistica: "",
  prezzo_atteso: "",
  nome: "",
  telefono: "",
  email: "",
  consenso_privacy: false,
};

const STEP_TITOLI = ["Immobile", "Dettagli", "Situazione", "Contatti"];
const TOTAL_STEPS = STEP_TITOLI.length;

type Errors = Partial<Record<keyof LeadFormData, string>>;
type Phase = "form" | "stima" | "thankyou";

// Validazione per singolo step: ritorna la mappa errori (vuota = ok).
function validateStep(step: number, d: LeadFormData): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!d.tipo_immobile) e.tipo_immobile = "Seleziona il tipo di immobile.";
    if (!d.zona) e.zona = "Seleziona la zona.";
    const mq = Number(d.mq);
    if (!d.mq || !Number.isFinite(mq) || mq <= 0)
      e.mq = "Inserisci i metri quadri.";
  } else if (step === 1) {
    if (!d.piano.trim()) e.piano = "Indica il piano.";
    if (!d.ascensore) e.ascensore = "Indica se c'è l'ascensore.";
    if (!d.locali || Number(d.locali) <= 0) e.locali = "Indica i locali.";
    if (!d.bagni || Number(d.bagni) <= 0) e.bagni = "Indica i bagni.";
    if (!d.stato) e.stato = "Seleziona lo stato.";
  } else if (step === 2) {
    if (!d.motivo_vendita) e.motivo_vendita = "Seleziona il motivo.";
    if (!d.tempistica) e.tempistica = "Seleziona la tempistica.";
  } else if (step === 3) {
    if (!d.nome.trim()) e.nome = "Inserisci il tuo nome.";
    if (!d.telefono.trim() || d.telefono.replace(/\D/g, "").length < 6)
      e.telefono = "Inserisci un telefono valido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()))
      e.email = "Inserisci un'email valida.";
    if (!d.consenso_privacy)
      e.consenso_privacy = "Devi accettare l'informativa privacy per continuare.";
  }
  return e;
}

function toPayload(d: LeadFormData, stima: Stima): LeadPayload {
  const intOrNull = (v: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  return {
    tipo_immobile: d.tipo_immobile,
    zona: d.zona,
    indirizzo: d.indirizzo.trim() || null,
    mq: Math.round(Number(d.mq)),
    piano: d.piano.trim() || null,
    ascensore: d.ascensore === "si" ? true : d.ascensore === "no" ? false : null,
    locali: intOrNull(d.locali),
    bagni: intOrNull(d.bagni),
    stato: d.stato,
    classe_energetica: d.classe_energetica || null,
    anno_costruzione: intOrNull(d.anno_costruzione),
    motivo_vendita: d.motivo_vendita,
    tempistica: d.tempistica,
    prezzo_atteso: intOrNull(d.prezzo_atteso),
    nome: d.nome.trim(),
    telefono: d.telefono.trim(),
    email: d.email.trim(),
    consenso_privacy: d.consenso_privacy,
    stima_min: stima.min,
    stima_max: stima.max,
  };
}

export default function LeadForm() {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<LeadFormData>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stima = useMemo<Stima>(
    () => calcolaStima(Number(data.mq) || 0, data.zona, data.stato),
    [data.mq, data.zona, data.stato],
  );

  function update<K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function goNext() {
    const e = validateStep(step, data);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void submit();
    }
  }

  function goBack() {
    setSubmitError(null);
    setErrors({});
    if (step > 0) setStep((s) => s - 1);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(data, stima)),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Si è verificato un errore. Riprova.");
      }
      setPhase("stima");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Si è verificato un errore. Riprova.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const progress =
    phase === "form"
      ? ((step + 1) / TOTAL_STEPS) * 100
      : 100;

  return (
    <section id="form" className="scroll-mt-6 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto w-full max-w-xl px-5 sm:px-6">
        {phase === "form" && (
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Scopri quanto vale casa tua
            </h2>
            <p className="mt-2 text-ink-muted">
              Rispondi a poche domande. Nessun obbligo, risposta entro 24h.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
          {/* Progress bar (visibile durante la compilazione) */}
          {phase === "form" && (
            <div className="mb-7">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink-muted">
                <span>
                  Step {step + 1} di {TOTAL_STEPS} · {STEP_TITOLI[step]}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {phase === "form" && (
            <>
              {/* key={step} ri-triggera l'animazione fade/slide a ogni cambio schermata */}
              <div key={step} className="animate-fade-in-up">
                {step === 0 && (
                  <StepImmobile data={data} update={update} errors={errors} />
                )}
                {step === 1 && (
                  <StepDettagli data={data} update={update} errors={errors} />
                )}
                {step === 2 && (
                  <StepSituazione data={data} update={update} errors={errors} />
                )}
                {step === 3 && (
                  <StepContatti data={data} update={update} errors={errors} />
                )}
              </div>

              {submitError && (
                <p className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {submitError}
                </p>
              )}

              <div className="mt-8 flex items-center gap-3">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={submitting}
                    className="btn-secondary flex-1 disabled:opacity-60"
                  >
                    Indietro
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-70"
                >
                  {submitting
                    ? "Invio in corso…"
                    : step < TOTAL_STEPS - 1
                      ? "Avanti"
                      : "Invia richiesta"}
                </button>
              </div>
            </>
          )}

          {phase === "stima" && (
            <StimaResult stima={stima} onContinua={() => setPhase("thankyou")} />
          )}

          {phase === "thankyou" && <ThankYou />}
        </div>

        {phase === "form" && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            🔒 I tuoi dati sono al sicuro e non verranno mai ceduti a terzi.
          </p>
        )}
      </div>
    </section>
  );
}
