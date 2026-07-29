"use client";

import type { LeadForm } from "@/lib/types";
import { ZONE_ROMA } from "@/lib/stima";
import { Field, TextInput, SelectInput, OptionCards } from "./fields";

type StepProps = {
  data: LeadForm;
  update: <K extends keyof LeadForm>(key: K, value: LeadForm[K]) => void;
  errors: Partial<Record<keyof LeadForm, string>>;
};

/* ----------------------------- STEP 1 · Immobile ---------------------------- */
export function StepImmobile({ data, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <Field label="Che tipo di immobile è?" error={errors.tipo_immobile}>
        <OptionCards
          value={data.tipo_immobile}
          onChange={(v) => update("tipo_immobile", v)}
          error={!!errors.tipo_immobile}
          options={[
            { value: "Appartamento", label: "Appartamento" },
            { value: "Villa", label: "Villa" },
            { value: "Attico", label: "Attico" },
            { value: "Altro", label: "Altro" },
          ]}
        />
      </Field>

      <Field label="In quale zona di Roma si trova?" error={errors.zona}>
        <SelectInput
          value={data.zona}
          error={!!errors.zona}
          onChange={(e) => update("zona", e.target.value)}
        >
          <option value="">Seleziona la zona…</option>
          {ZONE_ROMA.map((z) => (
            <option key={z.nome} value={z.nome}>
              {z.nome}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Indirizzo" optional hint="Ci aiuta a valutare meglio la posizione.">
        <TextInput
          value={data.indirizzo}
          placeholder="Es. Via dei Castani 12"
          onChange={(e) => update("indirizzo", e.target.value)}
        />
      </Field>

      <Field label="Metri quadri (superficie)" error={errors.mq}>
        <TextInput
          type="number"
          inputMode="numeric"
          min={1}
          value={data.mq}
          error={!!errors.mq}
          placeholder="Es. 80"
          onChange={(e) => update("mq", e.target.value)}
        />
      </Field>
    </div>
  );
}

/* ----------------------------- STEP 2 · Dettagli ---------------------------- */
export function StepDettagli({ data, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Piano" error={errors.piano}>
          <TextInput
            value={data.piano}
            placeholder="Es. 3 o Terra"
            error={!!errors.piano}
            onChange={(e) => update("piano", e.target.value)}
          />
        </Field>
        <Field label="Ascensore" error={errors.ascensore}>
          <OptionCards
            value={data.ascensore}
            columns={2}
            error={!!errors.ascensore}
            onChange={(v) => update("ascensore", v)}
            options={[
              { value: "si", label: "Sì" },
              { value: "no", label: "No" },
            ]}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Numero di locali" error={errors.locali}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={data.locali}
            error={!!errors.locali}
            placeholder="Es. 3"
            onChange={(e) => update("locali", e.target.value)}
          />
        </Field>
        <Field label="Bagni" error={errors.bagni}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={data.bagni}
            error={!!errors.bagni}
            placeholder="Es. 1"
            onChange={(e) => update("bagni", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Stato dell'immobile" error={errors.stato}>
        <OptionCards
          value={data.stato}
          columns={1}
          error={!!errors.stato}
          onChange={(v) => update("stato", v)}
          options={[
            { value: "Da ristrutturare", label: "Da ristrutturare" },
            { value: "Abitabile", label: "Abitabile" },
            { value: "Ristrutturato", label: "Ristrutturato" },
          ]}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Classe energetica" optional>
          <SelectInput
            value={data.classe_energetica}
            onChange={(e) => update("classe_energetica", e.target.value as LeadForm["classe_energetica"])}
          >
            <option value="">Non lo so</option>
            {["A4", "A3", "A2", "A1", "B", "C", "D", "E", "F", "G"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Anno di costruzione" optional>
          <TextInput
            type="number"
            inputMode="numeric"
            value={data.anno_costruzione}
            placeholder="Es. 1975"
            onChange={(e) => update("anno_costruzione", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

/* ---------------------------- STEP 3 · Situazione --------------------------- */
export function StepSituazione({ data, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <Field label="Qual è il motivo della vendita?" error={errors.motivo_vendita}>
        <OptionCards
          value={data.motivo_vendita}
          columns={1}
          error={!!errors.motivo_vendita}
          onChange={(v) => update("motivo_vendita", v)}
          options={[
            { value: "Eredità", label: "Eredità" },
            { value: "Trasferimento", label: "Trasferimento" },
            { value: "Separazione", label: "Separazione" },
            { value: "Problemi finanziari", label: "Problemi finanziari" },
            { value: "Altro", label: "Altro" },
          ]}
        />
      </Field>

      <Field label="Entro quanto vuoi vendere?" error={errors.tempistica}>
        <OptionCards
          value={data.tempistica}
          columns={3}
          error={!!errors.tempistica}
          onChange={(v) => update("tempistica", v)}
          options={[
            { value: "1 mese", label: "1 mese" },
            { value: "3 mesi", label: "3 mesi" },
            { value: "6 mesi", label: "6 mesi" },
          ]}
        />
      </Field>

      <Field
        label="Prezzo che avresti in mente"
        optional
        hint="Nessun impegno: ci aiuta solo a capire le tue aspettative."
      >
        <TextInput
          type="number"
          inputMode="numeric"
          value={data.prezzo_atteso}
          placeholder="Es. 180000"
          onChange={(e) => update("prezzo_atteso", e.target.value)}
        />
      </Field>
    </div>
  );
}

/* ----------------------------- STEP 4 · Contatti ---------------------------- */
export function StepContatti({ data, update, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <Field label="Nome e cognome" error={errors.nome}>
        <TextInput
          value={data.nome}
          autoComplete="name"
          error={!!errors.nome}
          placeholder="Mario Rossi"
          onChange={(e) => update("nome", e.target.value)}
        />
      </Field>

      <Field label="Telefono" error={errors.telefono}>
        <TextInput
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={data.telefono}
          error={!!errors.telefono}
          placeholder="333 1234567"
          onChange={(e) => update("telefono", e.target.value)}
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          value={data.email}
          error={!!errors.email}
          placeholder="mario.rossi@email.it"
          onChange={(e) => update("email", e.target.value)}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          checked={data.consenso_privacy}
          onChange={(e) => update("consenso_privacy", e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-ink-soft">
          Ho letto e accetto l&apos;
          <a
            href="/privacy"
            target="_blank"
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            informativa sulla privacy
          </a>{" "}
          e acconsento al trattamento dei dati per essere ricontattato.{" "}
          <span className="text-red-600">*</span>
        </span>
      </label>
      {errors.consenso_privacy && (
        <p className="-mt-3 text-xs font-medium text-red-600">
          {errors.consenso_privacy}
        </p>
      )}
    </div>
  );
}
