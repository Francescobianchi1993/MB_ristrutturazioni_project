// Tipi condivisi tra form, calcolo stima e API route.

export type TipoImmobile = "Appartamento" | "Villa" | "Attico" | "Altro";

export type StatoImmobile = "Da ristrutturare" | "Abitabile" | "Ristrutturato";

export type MotivoVendita =
  | "Eredità"
  | "Trasferimento"
  | "Separazione"
  | "Problemi finanziari"
  | "Altro";

export type Tempistica = "1 mese" | "3 mesi" | "6 mesi";

export type ClasseEnergetica =
  | "A4"
  | "A3"
  | "A2"
  | "A1"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G";

// Stato completo del form multi-step. I campi facoltativi restano stringa vuota
// finché non compilati (più semplice da bindare agli input controllati).
export interface LeadForm {
  // Step 1 — Immobile
  tipo_immobile: TipoImmobile | "";
  zona: string;
  indirizzo: string;
  mq: string;

  // Step 2 — Dettagli
  piano: string;
  ascensore: "" | "si" | "no";
  locali: string;
  bagni: string;
  stato: StatoImmobile | "";
  classe_energetica: ClasseEnergetica | "";
  anno_costruzione: string;

  // Step 3 — Situazione
  motivo_vendita: MotivoVendita | "";
  tempistica: Tempistica | "";
  prezzo_atteso: string;

  // Step 4 — Contatti
  nome: string;
  telefono: string;
  email: string;
  consenso_privacy: boolean;
}

// Payload inviato all'API route (valori normalizzati/tipizzati) + stima calcolata.
export interface LeadPayload {
  tipo_immobile: string;
  zona: string;
  indirizzo: string | null;
  mq: number;
  piano: string | null;
  ascensore: boolean | null;
  locali: number | null;
  bagni: number | null;
  stato: string;
  classe_energetica: string | null;
  anno_costruzione: number | null;
  motivo_vendita: string;
  tempistica: string;
  prezzo_atteso: number | null;
  nome: string;
  telefono: string;
  email: string;
  consenso_privacy: boolean;
  stima_min: number;
  stima_max: number;
}

export interface Stima {
  min: number;
  max: number;
  centrale: number;
}
