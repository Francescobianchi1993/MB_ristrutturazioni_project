/**
 * Catalogo dei 10 macro-slot del Livello 1 + tariffe €/m² + sotto-voci.
 *
 * Le tariffe €/m² sono CALCOLATE da ricette costruite sulle voci puntuali
 * del prezzario MB (Supabase, tabella `voci`, stato='validated') sommando
 * quantità tipiche per ambiente + stima fornitura materiali. Vedi
 * documentazione nel commit di riferimento per la ricetta dettagliata.
 *
 * Range min/max = medio ±15% per casi standard, più largo (radiatori vs
 * pavimento radiante, decorativa, ecc.) dove la variabilità è intrinseca.
 *
 * Ogni macro-slot ha 6 sotto-voci con peso percentuale: disattivando una
 * sotto-voce, la sua quota viene sottratta dal totale del macro-slot.
 */

import type { MacroSlotId, AmbienteTipo } from '@/lib/preventivoModel';

export interface SottoVoce {
  id: string;
  label: string;
  descBreve: string;
  pesoPct: number;
}

/**
 * Voce del kit-ricetta: una voce specifica del prezzario MB che viene
 * pre-compilata quando l'utente passa dal Livello 1 al Livello 2.
 *
 * - voceMatch: nome esatto della voce nel DB (case-sensitive)
 * - quantita: moltiplicatore o numero fisso, a seconda della scala
 * - scala:
 *     'per_mq'         → quantita × m² applicabili (mq stanza o casa intera)
 *     'per_ambiente'   → quantita × numero stanze del tipo (es. 2 bagni → ×2)
 *     'per_appartamento' → quantita fissa, una sola volta per casa
 */
export interface VoceKit {
  voceMatch: string;
  quantita: number;
  scala: 'per_mq' | 'per_ambiente' | 'per_appartamento';
}

export interface MacroSlot {
  id: MacroSlotId;
  label: string;
  desc: string;
  emoji: string;
  /** Gruppo per logica di mutex */
  gruppo: 'macro' | 'trasversale';
  /** Macro-slot inclusi automaticamente da questo (es. completa include cucina/bagno/camera) */
  includesGli: MacroSlotId[];
  /** Tariffa min-max in €/m² (range realistico di mercato 2026) */
  tariffaMq?: { min: number; max: number };
  /** Per slot a pezzo (infissi) */
  tariffaPezzo?: { porta: number; finestra: number };
  /** A corpo (piccolo intervento) */
  tariffaACorpo?: { min: number; max: number };
  /**
   * A quale ambiente l'intervento si applica per il calcolo dei m²:
   *   - 'tutto' = somma m² di tutti gli ambienti
   *   - tipo specifico = solo m² di quel tipo (es. 'bagno' per slot bagno)
   */
  ambiteApplicabili: AmbienteTipo[] | 'tutto';
  /** 6 sotto-voci con peso percentuale (devono sommare ~100) */
  sottoVoci: SottoVoce[];
  /** Se true, viene disabilitato quando 'completa' è attiva */
  disabilitatoSeCompleta: boolean;
  /**
   * Kit-ricetta: voci specifiche del DB con quantità tipiche, usate per
   * pre-compilare il Livello 2 quando l'utente passa dal Livello 1.
   * Se assente o vuoto, il L2 non viene pre-compilato per questo macro-slot.
   */
  kitRicetta?: VoceKit[];
}

// ────────────────────────────────────────────────────────────────────────────
// Kit-ricette per pre-compilare il Livello 2
// ────────────────────────────────────────────────────────────────────────────

/**
 * Kit "Bagno medio" — riferito a 1 m² di bagno (la quantità reale viene
 * scalata sui m² dell'ambiente). I valori 0.17 corrispondono a "1 in 6 m²"
 * = 1 voce per bagno standard. I valori 2.5 = parete bagno per ogni m² di
 * pavimento (altezza ~2.5m × perimetro ~uguale a mq pavimento).
 *
 * Le voci a corpo (es. assistenza muraria) usano scala 'per_ambiente' →
 * 1 voce per ogni stanza di tipo bagno (2 bagni = 2 assistenze muraria).
 */
const KIT_BAGNO: VoceKit[] = [
  // Demolizioni
  { voceMatch: 'Rimozione di sanitari', quantita: 0.5, scala: 'per_mq' },
  { voceMatch: 'Rimozione di rubinetteria', quantita: 0.33, scala: 'per_mq' },
  { voceMatch: 'Rimozione di box doccia o vasca', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Demolizione di rivestimento ceramico bagno', quantita: 2.5, scala: 'per_mq' },
  { voceMatch: 'Demolizione di pavimentazione in ceramica', quantita: 1, scala: 'per_mq' },
  { voceMatch: 'Demolizione di massetto interno', quantita: 1, scala: 'per_mq' },
  // Massetti
  { voceMatch: 'Realizzazione di massetto cementizio', quantita: 1, scala: 'per_mq' },
  // Idraulico
  { voceMatch: 'Punto acqua fredda', quantita: 0.67, scala: 'per_mq' },
  { voceMatch: 'Punto acqua calda', quantita: 0.5, scala: 'per_mq' },
  { voceMatch: 'Punto scarico WC', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Punto scarico lavabo', quantita: 0.33, scala: 'per_mq' },
  { voceMatch: 'Posa cassetta di scarico incasso', quantita: 0.17, scala: 'per_mq' },
  // Sanitari (installazione)
  { voceMatch: 'Installazione lavabo', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione vaso a pavimento', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione bidet', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione miscelatore lavabo', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione miscelatore doccia', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione piatto doccia', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione box doccia', quantita: 0.17, scala: 'per_mq' },
  // Pavimenti e rivestimenti
  { voceMatch: 'Posa rivestimento bagno', quantita: 2.5, scala: 'per_mq' },
  { voceMatch: 'Posa pavimento in gres porcellanato', quantita: 1, scala: 'per_mq' },
  // Pittura
  { voceMatch: 'Pittura soffitti', quantita: 1, scala: 'per_mq' },
  // Elettrico
  { voceMatch: 'Punto luce semplice', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Punto presa da 16A', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Posa scatole porta frutti', quantita: 0.33, scala: 'per_mq' },
  // Termico
  { voceMatch: 'Punto radiatore', quantita: 0.17, scala: 'per_mq' },
  { voceMatch: 'Installazione termoarredo', quantita: 0.17, scala: 'per_mq' },
  // Muratura — fissa per bagno
  { voceMatch: 'Assistenza muraria singolo bagno', quantita: 1, scala: 'per_ambiente' },
  // Allestimento
  { voceMatch: 'Montaggio mobile bagno', quantita: 1, scala: 'per_ambiente' },
  { voceMatch: 'Montaggio specchio bagno', quantita: 1, scala: 'per_ambiente' },
  { voceMatch: 'Montaggio accessori bagno', quantita: 0.5, scala: 'per_mq' },
  { voceMatch: 'Sigillature finali in silicone', quantita: 0.5, scala: 'per_mq' },
];

export const MACRO_SLOT: MacroSlot[] = [
  {
    id: 'completa',
    label: 'Ristrutturazione completa',
    desc: 'Intero appartamento chiavi in mano',
    emoji: '🏠',
    gruppo: 'macro',
    includesGli: ['cucina', 'bagno', 'camera', 'elettrico', 'idraulico', 'termico', 'tinteggiatura'],
    tariffaMq: { min: 640, max: 860 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: false,
    sottoVoci: [
      { id: 'demolizioni', label: 'Demolizioni e rimozioni', descBreve: 'Rimozione pareti, pavimenti, sanitari', pesoPct: 12 },
      { id: 'impianti', label: 'Impianti tecnologici', descBreve: 'Elettrico, idraulico, termico', pesoPct: 28 },
      { id: 'pavimenti', label: 'Pavimenti e rivestimenti', descBreve: 'Posa nuova in tutti gli ambienti', pesoPct: 22 },
      { id: 'pittura', label: 'Pittura e finiture', descBreve: 'Tinteggiatura completa', pesoPct: 6 },
      { id: 'bagno_cm', label: 'Bagno chiavi in mano', descBreve: 'Sanitari, box doccia, rivestimenti', pesoPct: 16 },
      { id: 'cucina_cm', label: 'Cucina chiavi in mano', descBreve: 'Demolizioni, impianti, finiture', pesoPct: 16 },
    ],
  },
  {
    id: 'cucina',
    label: 'Cucina',
    desc: 'Rifacimento cucina completo (escluso arredo)',
    emoji: '🍳',
    gruppo: 'macro',
    includesGli: [],
    tariffaMq: { min: 750, max: 1030 },
    ambiteApplicabili: ['cucina'],
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'demolizione_cucina', label: 'Demolizione', descBreve: 'Rimozione mobili e rivestimenti', pesoPct: 10 },
      { id: 'impianto_idraulico_c', label: 'Impianto idraulico', descBreve: 'Scarichi, allacci', pesoPct: 18 },
      { id: 'impianto_elettrico_c', label: 'Impianto elettrico', descBreve: 'Punti cottura, prese, luci', pesoPct: 18 },
      { id: 'pavimenti_cucina', label: 'Pavimento + rivestimenti', descBreve: 'Piastrelle pavimento e zona cottura', pesoPct: 25 },
      { id: 'cappa', label: 'Cappa e ventilazione', descBreve: 'Posa, allaccio, espulsione', pesoPct: 9 },
      { id: 'tinteggiatura_c', label: 'Tinteggiatura', descBreve: 'Pareti e soffitto', pesoPct: 20 },
    ],
  },
  {
    id: 'bagno',
    label: 'Bagno',
    desc: 'Rifacimento bagno completo',
    emoji: '🛁',
    gruppo: 'macro',
    includesGli: [],
    tariffaMq: { min: 1500, max: 2040 },
    ambiteApplicabili: ['bagno'],
    disabilitatoSeCompleta: true,
    kitRicetta: KIT_BAGNO,
    sottoVoci: [
      { id: 'demolizione_bagno', label: 'Demolizione', descBreve: 'Rimozione sanitari e rivestimenti', pesoPct: 10 },
      { id: 'impianto_idraulico_b', label: 'Impianto idraulico', descBreve: 'Tubazioni, scarichi, allacci', pesoPct: 22 },
      { id: 'impianto_elettrico_b', label: 'Impianto elettrico', descBreve: 'Punti luce, prese protette', pesoPct: 10 },
      { id: 'pavimenti_bagno', label: 'Pavimento + rivestimenti', descBreve: 'Piastrelle pavimento e parete', pesoPct: 25 },
      { id: 'sanitari', label: 'Sanitari', descBreve: 'Lavabo, WC, bidet', pesoPct: 18 },
      { id: 'doccia_vasca', label: 'Box doccia / vasca', descBreve: 'Posa e finitura', pesoPct: 15 },
    ],
  },
  {
    id: 'camera',
    label: 'Camera / Stanza',
    desc: 'Tinteggiatura, pavimento, impianti',
    emoji: '🛏️',
    gruppo: 'macro',
    includesGli: [],
    tariffaMq: { min: 225, max: 305 },
    ambiteApplicabili: ['camera', 'soggiorno'],
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'pavimento_camera', label: 'Pavimento', descBreve: 'Posa nuova, parquet o gres', pesoPct: 35 },
      { id: 'tinteggiatura_camera', label: 'Tinteggiatura', descBreve: 'Pareti e soffitto', pesoPct: 15 },
      { id: 'elettrico_camera', label: 'Punti luce/prese', descBreve: 'Adeguamento impianto', pesoPct: 15 },
      { id: 'porta_camera', label: 'Porta interna', descBreve: 'Sostituzione porta', pesoPct: 12 },
      { id: 'clima_camera', label: 'Climatizzazione', descBreve: 'Predisposizione split', pesoPct: 13 },
      { id: 'armadio_muro', label: 'Armadio a muro', descBreve: 'Realizzazione su misura', pesoPct: 10 },
    ],
  },
  {
    id: 'elettrico',
    label: 'Impianto elettrico',
    desc: 'Rifacimento o adeguamento',
    emoji: '⚡',
    gruppo: 'trasversale',
    includesGli: [],
    tariffaMq: { min: 90, max: 120 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'punti_luce', label: 'Punti luce', descBreve: 'Faretti, plafoniere, sospensioni', pesoPct: 20 },
      { id: 'punti_presa', label: 'Punti prese', descBreve: 'Prese standard e USB', pesoPct: 25 },
      { id: 'quadro_elettrico', label: 'Quadro elettrico', descBreve: 'Sostituzione e differenziale', pesoPct: 15 },
      { id: 'linee', label: 'Linee di alimentazione', descBreve: 'Cavi, scatole, derivazioni', pesoPct: 20 },
      { id: 'certificazione', label: 'Certificazione', descBreve: 'DM 37/08 e dichiarazione conformità', pesoPct: 8 },
      { id: 'domotica_base', label: 'Domotica base', descBreve: 'Predisposizione smart', pesoPct: 12 },
    ],
  },
  {
    id: 'idraulico',
    label: 'Impianto idraulico',
    desc: 'Tubazioni e scarichi',
    emoji: '💧',
    gruppo: 'trasversale',
    includesGli: [],
    tariffaMq: { min: 95, max: 130 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'scarichi', label: 'Scarichi', descBreve: 'Realizzazione nuova rete', pesoPct: 25 },
      { id: 'allacci', label: 'Allacci sanitari', descBreve: 'Lavabi, WC, doccia', pesoPct: 20 },
      { id: 'tubazioni', label: 'Tubazioni acqua', descBreve: 'Calda/fredda multistrato', pesoPct: 25 },
      { id: 'rubinetterie', label: 'Rubinetterie', descBreve: 'Posa miscelatori', pesoPct: 12 },
      { id: 'collegamenti_lavanderia', label: 'Collegamenti lavanderia', descBreve: 'Lavatrice, asciugatrice', pesoPct: 8 },
      { id: 'collaudo', label: 'Collaudo impianto', descBreve: 'Test pressione e tenuta', pesoPct: 10 },
    ],
  },
  {
    id: 'termico',
    label: 'Riscaldamento',
    desc: 'Caldaia, radiatori, pavimento radiante',
    emoji: '🔥',
    gruppo: 'trasversale',
    includesGli: [],
    tariffaMq: { min: 100, max: 190 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'caldaia', label: 'Caldaia', descBreve: 'Sostituzione e collegamenti', pesoPct: 25 },
      { id: 'radiatori', label: 'Radiatori', descBreve: 'Posa o sostituzione', pesoPct: 25 },
      { id: 'cronotermostato', label: 'Cronotermostato', descBreve: 'Smart o standard', pesoPct: 6 },
      { id: 'collettori', label: 'Collettori e linee', descBreve: 'Predisposizione zone', pesoPct: 15 },
      { id: 'valvole', label: 'Valvole termostatiche', descBreve: 'Posa su radiatori', pesoPct: 9 },
      { id: 'collaudo_termico', label: 'Collaudo e dichiarazione', descBreve: 'Sicurezza e ENEA', pesoPct: 20 },
    ],
  },
  {
    id: 'infissi',
    label: 'Infissi e porte',
    desc: 'Sostituzione finestre e porte interne',
    emoji: '🪟',
    gruppo: 'trasversale',
    includesGli: [],
    tariffaPezzo: { porta: 280, finestra: 650 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'porte_interne', label: 'Porte interne', descBreve: 'Sostituzione standard', pesoPct: 25 },
      { id: 'finestre_pvc', label: 'Finestre PVC', descBreve: 'Doppio vetro, taglio termico', pesoPct: 25 },
      { id: 'finestre_legno_alluminio', label: 'Finestre legno/alluminio', descBreve: 'Premium', pesoPct: 20 },
      { id: 'persiane_zanzariere', label: 'Persiane / zanzariere', descBreve: 'Posa accessori', pesoPct: 10 },
      { id: 'porta_blindata', label: 'Porta blindata', descBreve: 'Sostituzione ingresso', pesoPct: 15 },
      { id: 'davanzali', label: 'Davanzali', descBreve: 'Sostituzione e finitura', pesoPct: 5 },
    ],
  },
  {
    id: 'tinteggiatura',
    label: 'Tinteggiatura',
    desc: 'Imbiancatura e decorazioni',
    emoji: '🎨',
    gruppo: 'trasversale',
    includesGli: [],
    tariffaMq: { min: 25, max: 70 },
    ambiteApplicabili: 'tutto',
    disabilitatoSeCompleta: true,
    sottoVoci: [
      { id: 'pareti', label: 'Pareti', descBreve: 'Pittura lavabile', pesoPct: 35 },
      { id: 'soffitti', label: 'Soffitti', descBreve: 'Pittura traspirante', pesoPct: 20 },
      { id: 'stuccatura', label: 'Stuccatura', descBreve: 'Preparazione superfici', pesoPct: 15 },
      { id: 'antimuffa', label: 'Pittura antimuffa', descBreve: 'Aree umide', pesoPct: 10 },
      { id: 'decorativa', label: 'Pittura decorativa', descBreve: 'Effetti speciali', pesoPct: 10 },
      { id: 'smalto_radiatori', label: 'Smalto radiatori', descBreve: 'Verniciatura', pesoPct: 10 },
    ],
  },
];

export const MACRO_SLOT_BY_ID: Record<MacroSlotId, MacroSlot> = MACRO_SLOT.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<MacroSlotId, MacroSlot>
);

// ────────────────────────────────────────────────────────────────────────────
// Moltiplicatori finitura e tempistica
// ────────────────────────────────────────────────────────────────────────────

export const FINITURE = [
  { id: 'base', label: 'Economiche', desc: 'Materiali standard, ottimo qualità/prezzo', mult: 0.85 },
  { id: 'medio', label: 'Medie', desc: 'Marche note, buona qualità', mult: 1.0 },
  { id: 'premium', label: 'Premium', desc: 'Alta gamma, design, materiali nobili', mult: 1.35 },
  { id: 'luxury', label: 'Luxury', desc: 'Su misura, marmi, marchi di lusso', mult: 1.75 },
] as const;

export const TEMPISTICHE = [
  { id: 'urgente', label: 'Urgente', desc: 'Inizio entro 2 settimane', mult: 1.15 },
  { id: 'normale', label: 'Standard', desc: 'Inizio entro 1-2 mesi', mult: 1.0 },
  { id: 'flessibile', label: 'Flessibile', desc: 'Migliori prezzi', mult: 0.93 },
] as const;

export const FINITURA_MULT: Record<string, number> = Object.fromEntries(
  FINITURE.map((f) => [f.id, f.mult])
);

export const TEMPISTICA_MULT: Record<string, number> = Object.fromEntries(
  TEMPISTICHE.map((t) => [t.id, t.mult])
);
