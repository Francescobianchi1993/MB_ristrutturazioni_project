/**
 * Livello 2 — Preventivo dettagliato.
 *
 * Layout per ambiente con:
 *   1. Editor casa minimale (anagrafica) — fonte unica per tipo casa, mq, preset
 *   2. Lista ambienti — schede con header editabile (nome, mq, elimina)
 *      Apertura mutex (uno alla volta) + smooth scroll
 *   3. Dentro ogni ambiente:
 *        a) "Lavori comuni" — 4 tabs orizzontali (Strutturale / Impianti /
 *           Finiture / Servizi). Dentro ogni tab le sotto-categorie del DB.
 *        b) "Specifiche [tipo]" — solo bagno/cucina, lista flat
 *        c) Footer Prev/Next
 *   4. Sezione finale "Lavori comuni a tutta la casa"
 *
 * Stato: chiave (voceId, ambienteId).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Search,
  Sparkles,
  RotateCcw,
  Wrench,
  Check,
  AlertTriangle,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProgetto } from './state';
import EditorAmbienti from './EditorAmbienti';
import RiepilogoSticky from './RiepilogoSticky';
import { fmt } from './pricing';
import {
  caricaPrezzario,
  type CategoriaConVoci,
  type VocePrezzario,
} from '@/lib/prezzario_v2';
import {
  type Ambiente,
  type AmbienteTipo,
  ID_COMUNI,
  LABEL_AMBIENTE,
} from '@/lib/preventivoModel';
import { applicaKitDelLivello1 } from './kit';

interface LivelloDettaglioProps {
  onTorna: () => void;
  onPassaARapida: () => void;
}

const ICONA_AMBIENTE: Record<AmbienteTipo, string> = {
  cucina: '🍳',
  bagno: '🛁',
  soggiorno: '🛋️',
  camera: '🛏️',
  corridoio: '🚪',
  altro: '🏠',
};

const TIPI_INTERNI: AmbienteTipo[] = [
  'cucina',
  'bagno',
  'soggiorno',
  'camera',
  'corridoio',
  'altro',
];

// ────────────────────────────────────────────────────────────────────────────
// MACRO-AREE — i 4 raggruppamenti delle 12 categorie DB tecniche
// ────────────────────────────────────────────────────────────────────────────

interface MacroArea {
  id: string;
  label: string;
  emoji: string;
  /** Categorie del DB MB che mappano qui */
  dbCategorie: string[];
}

const MACRO_AREE: MacroArea[] = [
  {
    id: 'strutturale',
    label: 'Strutturale',
    emoji: '🔨',
    dbCategorie: [
      'Demolizioni e rimozioni',
      'Opere murarie',
      'Massetti e sottofondi',
      'Isolamenti e controsoffitti',
      'Impermeabilizzazioni e terrazzi',
    ],
  },
  {
    id: 'impianti',
    label: 'Impianti',
    emoji: '⚡',
    dbCategorie: [
      'Impianto elettrico',
      'Impianto idraulico',
      'Impianto termico',
      'Climatizzazione e ventilazione',
    ],
  },
  {
    id: 'finiture',
    label: 'Finiture',
    emoji: '🟫',
    dbCategorie: [
      'Rivestimenti e pavimenti',
      'Pittura e finiture',
      'Serramenti e porte interne',
    ],
  },
  {
    id: 'servizi',
    label: 'Servizi',
    emoji: '🔧',
    dbCategorie: [
      'Opere complementari e servizi finali',
      'Manodopera e servizi',
      'Voci tecniche utili',
      'Opere esterne e facciata',
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Smistamento voci nelle 3 famiglie
// ────────────────────────────────────────────────────────────────────────────

interface SmistamentoVoci {
  comuniInterne: VocePrezzario[];
  specifichePerTipo: Record<string, VocePrezzario[]>;
  aCorpoCasa: VocePrezzario[];
}

function smistaVoci(categorie: CategoriaConVoci[]): SmistamentoVoci {
  const tutte = categorie.flatMap((c) => c.voci);
  const comuniInterne: VocePrezzario[] = [];
  const specifichePerTipo: Record<string, VocePrezzario[]> = {};
  const aCorpoCasa: VocePrezzario[] = [];

  for (const v of tutte) {
    const tipi = v.ambiente_applicabile;
    if (!tipi || tipi.length === 0 || tipi.includes('tutti')) {
      aCorpoCasa.push(v);
      continue;
    }
    const tipiInterni = tipi.filter((t) =>
      (TIPI_INTERNI as readonly string[]).includes(t)
    );
    if (tipiInterni.length >= 2) {
      comuniInterne.push(v);
    } else if (tipi.length === 1 && (TIPI_INTERNI as readonly string[]).includes(tipi[0])) {
      const t = tipi[0];
      if (!specifichePerTipo[t]) specifichePerTipo[t] = [];
      specifichePerTipo[t].push(v);
    } else {
      aCorpoCasa.push(v);
    }
  }
  return { comuniInterne, specifichePerTipo, aCorpoCasa };
}

function raggruppaPerCategoria(voci: VocePrezzario[]): CategoriaConVoci[] {
  const map = new Map<string, CategoriaConVoci>();
  for (const v of voci) {
    if (!map.has(v.categoria)) {
      map.set(v.categoria, {
        categoria: v.categoria,
        super_categoria: v.super_categoria,
        voci: [],
      });
    }
    map.get(v.categoria)!.voci.push(v);
  }
  return Array.from(map.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));
}

function nomeAmbiente(amb: Ambiente, tutti: Ambiente[]): string {
  const stessoTipo = tutti.filter((a) => a.tipo === amb.tipo);
  if (stessoTipo.length === 1) return LABEL_AMBIENTE[amb.tipo];
  return `${LABEL_AMBIENTE[amb.tipo]} ${stessoTipo.indexOf(amb) + 1}`;
}

/** Filtra le voci di una macro-area dalle voci comuni passate in input */
function vociPerMacroArea(voci: VocePrezzario[], area: MacroArea): VocePrezzario[] {
  return voci.filter((v) => area.dbCategorie.includes(v.categoria));
}

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

export default function LivelloDettaglio({ onTorna, onPassaARapida }: LivelloDettaglioProps) {
  const { state, dispatch } = useProgetto();
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topRef.current) return;
    const y = topRef.current.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }, []);

  const [prezzario, setPrezzario] = useState<{
    loading: boolean;
    categorie: CategoriaConVoci[];
    errore?: string;
  }>({ loading: true, categorie: [] });
  const [ambienteAperto, setAmbienteAperto] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [preCompilato, setPreCompilato] = useState(false);

  useEffect(() => {
    caricaPrezzario().then((r) => {
      setPrezzario({ loading: false, categorie: r.categorie, errore: r.errore });

      const haMacroAttivi = Object.values(state.macroSlot).some((s) => s?.attivo);
      const noVociAncora = state.vociDettagliate.length === 0;
      if (r.ready && haMacroAttivi && noVociAncora) {
        const tutte = r.categorie.flatMap((c) => c.voci);
        const risultato = applicaKitDelLivello1(state, tutte);
        if (risultato.voci.length > 0) {
          dispatch({ type: 'IMPOSTA_VOCI_DETTAGLIATE', voci: risultato.voci });
          setPreCompilato(true);
          toast.success('Preventivo pre-compilato', {
            description: `${risultato.voci.length} voci dalla stima rapida.`,
          });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPreventivo() {
    if (!confirm('Svuotare il preventivo? Le voci selezionate andranno perse.')) return;
    dispatch({ type: 'RESET_VOCI_DETTAGLIATE' });
    setPreCompilato(false);
    setAmbienteAperto(null);
    toast.info('Preventivo svuotato');
  }

  const smistato = useMemo(() => smistaVoci(prezzario.categorie), [prezzario.categorie]);

  useEffect(() => {
    if (!ambienteAperto) return;
    const el = document.getElementById(`scheda-amb-${ambienteAperto}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [ambienteAperto]);

  function vaiAlProssimo() {
    if (!ambienteAperto || ambienteAperto === ID_COMUNI) return;
    const idx = state.ambienti.findIndex((a) => a.id === ambienteAperto);
    const prossimo = state.ambienti[idx + 1];
    setAmbienteAperto(prossimo ? prossimo.id : ID_COMUNI);
  }

  function vaiAlPrecedente() {
    if (!ambienteAperto) return;
    if (ambienteAperto === ID_COMUNI) {
      const last = state.ambienti[state.ambienti.length - 1];
      if (last) setAmbienteAperto(last.id);
      return;
    }
    const idx = state.ambienti.findIndex((a) => a.id === ambienteAperto);
    if (idx > 0) setAmbienteAperto(state.ambienti[idx - 1].id);
  }

  return (
    <div ref={topRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      <button
        onClick={onTorna}
        className="text-sm text-[#1A1A1A] hover:text-black font-bold mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Cambia modalità
      </button>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-[#1A1A1A] text-[#F5B800] px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider mb-3">
          Modalità esperto
        </div>
        <h2 className="font-display text-3xl font-bold">Preventivo dettagliato</h2>
        <p className="text-sm text-[#666] mt-2">
          Apri ogni ambiente, naviga fra le 4 aree di lavoro e indica le quantità. I prezzi
          vengono dal listino MB validato.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-3">
          <EditorAmbienti />

          {preCompilato ? (
            <Banner
              giallo
              icon={<Sparkles className="w-4 h-4 text-[#1A1A1A]" />}
              title="Preventivo pre-compilato dalla stima rapida"
              text="Affina le quantità ambiente per ambiente."
              linkLabel="← Torna alla stima rapida"
              onLinkClick={onPassaARapida}
              onReset={resetPreventivo}
            />
          ) : (
            <Banner
              icon={<Lightbulb className="w-4 h-4 text-[#1A1A1A]" />}
              title="Come funziona"
              text="Apri un ambiente. Dentro, scegli l'area di lavoro (Strutturale, Impianti, Finiture, Servizi) e flagga le voci."
              linkLabel="← Stima rapida (pre-compila il dettagliato)"
              onLinkClick={onPassaARapida}
              onReset={state.vociDettagliate.length > 0 ? resetPreventivo : undefined}
            />
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Cerca voce, descrizione..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E5E5E5] focus:border-[#F5B800] outline-none text-sm bg-white"
            />
          </div>

          {prezzario.loading && <Skeleton />}
          {prezzario.errore && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Errore caricamento prezzario:</strong> {prezzario.errore}
              </div>
            </div>
          )}

          {!prezzario.loading && !prezzario.errore && (
            <>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mt-2 mb-1 flex items-center gap-1.5">
                <span>🏠</span> Gli ambienti della tua casa
              </div>

              {state.ambienti.length === 0 && (
                <div className="bg-white border border-dashed border-[#E5E5E5] rounded-2xl p-6 text-center text-sm text-[#666]">
                  Nessun ambiente. Aggiungine uno dall'editor in alto (es. + Bagno, + Cucina).
                </div>
              )}

              {state.ambienti.map((amb, idx) => (
                <SchedaAmbiente
                  key={amb.id}
                  ambiente={amb}
                  indice={idx}
                  voci={{
                    comuni: smistato.comuniInterne,
                    specifiche: smistato.specifichePerTipo[amb.tipo] ?? [],
                  }}
                  aperta={ambienteAperto === amb.id}
                  onToggle={() => setAmbienteAperto(ambienteAperto === amb.id ? null : amb.id)}
                  isPrimo={idx === 0}
                  isUltimo={idx === state.ambienti.length - 1}
                  onProssimo={vaiAlProssimo}
                  onPrecedente={vaiAlPrecedente}
                  filtro={filtro}
                />
              ))}

              <div className="text-[10px] font-mono uppercase tracking-wider text-[#666] mt-4 mb-1 flex items-center gap-1.5">
                <Wrench className="w-3 h-3" /> Lavori comuni a tutta la casa
              </div>
              <SchedaCorpoCasa
                voci={smistato.aCorpoCasa}
                aperta={ambienteAperto === ID_COMUNI}
                onToggle={() => setAmbienteAperto(ambienteAperto === ID_COMUNI ? null : ID_COMUNI)}
                onPrecedente={vaiAlPrecedente}
                filtro={filtro}
              />
            </>
          )}
        </div>

        <RiepilogoSticky
          variant="sticky"
          mostraDettaglio
          onSwitchModalita={onPassaARapida}
          switchLabel="← Torna alla stima rapida"
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Banner
// ────────────────────────────────────────────────────────────────────────────

function Banner({
  icon,
  title,
  text,
  giallo,
  linkLabel,
  onLinkClick,
  onReset,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  giallo?: boolean;
  linkLabel?: string;
  onLinkClick?: () => void;
  onReset?: () => void;
}) {
  return (
    <div
      className={`border rounded-2xl p-4 flex items-start gap-3 ${
        giallo ? 'bg-[#F5B800]/10 border-[#F5B800]' : 'bg-[#FFF8E7] border-[#F5B800]/30'
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-[#F5B800] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="text-sm flex-1">
        <strong>{title}</strong>
        <div className="text-[#666] mt-0.5">{text}</div>
        {linkLabel && onLinkClick && (
          <button
            onClick={onLinkClick}
            className="block mt-1 text-[#F5B800] font-semibold hover:underline"
          >
            {linkLabel}
          </button>
        )}
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-full border border-[#1A1A1A]/40 hover:bg-[#1A1A1A] hover:text-white flex items-center gap-1 flex-shrink-0"
        >
          <RotateCcw className="w-3 h-3" /> Svuota
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Scheda ambiente — header con editing inline + corpo con tabs macro-aree
// ────────────────────────────────────────────────────────────────────────────

function SchedaAmbiente({
  ambiente,
  indice,
  voci,
  aperta,
  onToggle,
  isPrimo,
  isUltimo,
  onProssimo,
  onPrecedente,
  filtro,
}: {
  ambiente: Ambiente;
  indice: number;
  voci: { comuni: VocePrezzario[]; specifiche: VocePrezzario[] };
  aperta: boolean;
  onToggle: () => void;
  isPrimo: boolean;
  isUltimo: boolean;
  onProssimo: () => void;
  onPrecedente: () => void;
  filtro: string;
}) {
  const { state, dispatch } = useProgetto();
  const [areaAttiva, setAreaAttiva] = useState<string>(MACRO_AREE[0].id);

  const tuttiVociIds = useMemo(
    () => new Set([...voci.comuni, ...voci.specifiche].map((v) => v.id)),
    [voci]
  );
  const vociSelAmbiente = state.vociDettagliate.filter(
    (v) => v.ambienteId === ambiente.id && tuttiVociIds.has(v.voceId)
  );
  const subtotale = vociSelAmbiente.reduce(
    (s, v) => s + v.prezzoUnitario * v.quantita,
    0
  );
  const numAttive = vociSelAmbiente.filter((v) => v.quantita > 0).length;
  const nome = nomeAmbiente(ambiente, state.ambienti);

  function rimuovi() {
    if (!confirm(`Rimuovere "${nome}" dal preventivo?`)) return;
    dispatch({ type: 'RIMUOVI_AMBIENTE', id: ambiente.id });
  }

  return (
    <div
      id={`scheda-amb-${ambiente.id}`}
      className={`bg-white border-2 rounded-2xl overflow-hidden transition-colors scroll-mt-4 ${
        aperta
          ? 'border-[#F5B800] shadow-md'
          : numAttive > 0
            ? 'border-[#F5B800]/40'
            : 'border-[#E5E5E5]'
      }`}
    >
      {/* HEADER: emoji + tipo + (mq editabile) + (elimina) + chevron */}
      <div className="flex items-center gap-3 p-3 hover:bg-[#FAFAFA] transition">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
              numAttive > 0 ? 'bg-[#F5B800]' : 'bg-[#F5B800]/10'
            }`}
          >
            {numAttive > 0 ? (
              <Check className="w-5 h-5 text-[#1A1A1A]" />
            ) : (
              ICONA_AMBIENTE[ambiente.tipo]
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold flex items-center gap-2 flex-wrap">
              {nome}
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#999] font-normal">
                {indice + 1} di {state.ambienti.length}
              </span>
            </div>
            <div className="text-xs text-[#666] mt-0.5">
              {voci.comuni.length} comuni · {voci.specifiche.length} specifiche
              {numAttive > 0 && (
                <>
                  {' · '}
                  <span className="text-[#1A1A1A] font-semibold">{numAttive} scelte</span>
                  {' · '}
                  <span className="text-[#F5B800] font-semibold">{fmt(subtotale)}</span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* mq editabile inline — visibile solo su sm+ */}
        <div className="hidden sm:flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={200}
            value={ambiente.mq}
            onChange={(e) =>
              dispatch({
                type: 'AGGIORNA_AMBIENTE',
                id: ambiente.id,
                patch: { mq: Math.max(1, Number(e.target.value) || 1) },
              })
            }
            className="w-14 text-right text-sm font-mono p-1 rounded border border-[#E5E5E5] focus:border-[#F5B800] outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-[10px] text-[#666]">m²</span>
        </div>

        <button
          onClick={rimuovi}
          className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0"
          aria-label="Elimina ambiente"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-full hover:bg-[#F8F8F8] flex items-center justify-center flex-shrink-0"
        >
          <ChevronDown
            className={`w-5 h-5 text-[#666] transition-transform ${aperta ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {aperta && (
        <div className="border-t border-[#E5E5E5] animate-slide-down">
          {/* TABS macro-aree */}
          <TabsMacroAree
            areaAttiva={areaAttiva}
            setAreaAttiva={setAreaAttiva}
            voci={voci.comuni}
            ambienteId={ambiente.id}
          />

          {/* Voci della macro-area attiva, raggruppate per categoria DB */}
          <div className="p-3 bg-[#FAFAFA] space-y-2">
            <SottoSezioneVoci
              voci={vociPerMacroArea(
                voci.comuni,
                MACRO_AREE.find((a) => a.id === areaAttiva)!
              )}
              ambienteId={ambiente.id}
              filtro={filtro}
              tipoAmbiente={ambiente.tipo}
            />
          </div>

          {/* Specifiche del tipo, in fondo */}
          {voci.specifiche.length > 0 && (
            <div className="border-t border-[#E5E5E5]">
              <div className="px-4 py-3 bg-[#FFFEF5] border-b border-[#F0F0F0]">
                <div className="font-semibold text-sm flex items-center gap-2">
                  <span>{ICONA_AMBIENTE[ambiente.tipo]}</span>
                  Specifiche {LABEL_AMBIENTE[ambiente.tipo].toLowerCase()}
                </div>
                <div className="text-[11px] text-[#666] mt-0.5">
                  Voci esclusive di questo tipo di stanza ({voci.specifiche.length} disponibili).
                </div>
              </div>
              <SottoSezioneVociFlat
                voci={voci.specifiche}
                ambienteId={ambiente.id}
                filtro={filtro}
              />
            </div>
          )}

          {/* Footer prev/next */}
          <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] p-3 flex items-center justify-between gap-2">
            <button
              onClick={onPrecedente}
              disabled={isPrimo}
              className="text-xs px-3 py-2 rounded-full border border-[#E5E5E5] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Precedente
            </button>
            <div className="text-xs text-[#666]">
              {numAttive > 0 ? (
                <>
                  Subtotale:{' '}
                  <span className="font-semibold text-[#1A1A1A]">{fmt(subtotale)}</span>
                </>
              ) : (
                'Compila le voci'
              )}
            </div>
            <button
              onClick={onProssimo}
              className="text-xs px-3 py-2 rounded-full bg-[#F5B800] hover:bg-[#D9A200] text-[#1A1A1A] font-semibold flex items-center gap-1"
            >
              {isUltimo ? 'Lavori comuni casa' : 'Prossimo'}{' '}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tabs macro-aree
// ────────────────────────────────────────────────────────────────────────────

function TabsMacroAree({
  areaAttiva,
  setAreaAttiva,
  voci,
  ambienteId,
}: {
  areaAttiva: string;
  setAreaAttiva: (id: string) => void;
  voci: VocePrezzario[];
  ambienteId: string;
}) {
  const { state } = useProgetto();

  function statsPerArea(area: MacroArea) {
    const vociArea = vociPerMacroArea(voci, area);
    const ids = new Set(vociArea.map((v) => v.id));
    const sel = state.vociDettagliate.filter(
      (v) => v.ambienteId === ambienteId && ids.has(v.voceId) && v.quantita > 0
    );
    return {
      tot: vociArea.length,
      scelte: sel.length,
      subtotale: sel.reduce((s, v) => s + v.prezzoUnitario * v.quantita, 0),
    };
  }

  return (
    <div className="bg-white border-b border-[#E5E5E5]">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {MACRO_AREE.map((area) => {
          const stats = statsPerArea(area);
          const sel = areaAttiva === area.id;
          return (
            <button
              key={area.id}
              onClick={() => setAreaAttiva(area.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 border-b-2 transition ${
                sel
                  ? 'border-[#F5B800] bg-[#FFFEF5] font-semibold'
                  : 'border-transparent hover:bg-[#FAFAFA]'
              }`}
            >
              <span className="text-sm">{area.emoji}</span>
              <span className="text-xs">{area.label}</span>
              <span className="text-[10px] text-[#666] font-mono">({stats.tot})</span>
              {stats.scelte > 0 && (
                <span className="bg-[#F5B800] text-[#1A1A1A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {stats.scelte}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sotto-sezione voci con sotto-categorie DB (usata dentro tab macro-area)
// ────────────────────────────────────────────────────────────────────────────

function SottoSezioneVoci({
  voci,
  ambienteId,
  filtro,
}: {
  voci: VocePrezzario[];
  ambienteId: string;
  filtro: string;
  tipoAmbiente: AmbienteTipo;
}) {
  const vociFiltrate = useMemo(() => {
    if (!filtro.trim()) return voci;
    const q = filtro.toLowerCase();
    return voci.filter(
      (v) =>
        v.voce.toLowerCase().includes(q) ||
        (v.descrizione_breve ?? '').toLowerCase().includes(q) ||
        v.categoria.toLowerCase().includes(q)
    );
  }, [voci, filtro]);

  const categorie = useMemo(() => raggruppaPerCategoria(vociFiltrate), [vociFiltrate]);

  if (vociFiltrate.length === 0) {
    return (
      <div className="text-center text-xs text-[#666] py-6">
        Nessuna voce in questa area di lavoro.
      </div>
    );
  }

  return (
    <>
      {categorie.map((cat) => (
        <CategoriaVociCollapsable
          key={cat.categoria}
          categoria={cat}
          ambienteId={ambienteId}
        />
      ))}
    </>
  );
}

function SottoSezioneVociFlat({
  voci,
  ambienteId,
  filtro,
}: {
  voci: VocePrezzario[];
  ambienteId: string;
  filtro: string;
}) {
  const vociFiltrate = useMemo(() => {
    if (!filtro.trim()) return voci;
    const q = filtro.toLowerCase();
    return voci.filter(
      (v) =>
        v.voce.toLowerCase().includes(q) ||
        (v.descrizione_breve ?? '').toLowerCase().includes(q)
    );
  }, [voci, filtro]);

  if (vociFiltrate.length === 0) return null;

  return (
    <div className="p-2 space-y-1 bg-white">
      {vociFiltrate.map((v) => (
        <RigaVoce key={v.id} voce={v} ambienteId={ambienteId} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sotto-categoria DB collassabile (Demolizioni, Pavimenti, ecc.)
// ────────────────────────────────────────────────────────────────────────────

function CategoriaVociCollapsable({
  categoria,
  ambienteId,
}: {
  categoria: CategoriaConVoci;
  ambienteId: string;
}) {
  const { state } = useProgetto();
  const [aperta, setAperta] = useState(false);
  const ids = useMemo(() => new Set(categoria.voci.map((v) => v.id)), [categoria]);
  const sel = state.vociDettagliate.filter(
    (v) => v.ambienteId === ambienteId && ids.has(v.voceId)
  );
  const subtotale = sel.reduce((s, v) => s + v.prezzoUnitario * v.quantita, 0);
  const numAttive = sel.filter((v) => v.quantita > 0).length;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
      <button
        onClick={() => setAperta((v) => !v)}
        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-[#FAFAFA] text-left transition ${
          aperta ? 'bg-[#FFFEF5]' : ''
        }`}
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${numAttive > 0 ? 'bg-[#F5B800]' : 'bg-[#E5E5E5]'}`} />
        <span className="text-sm font-medium flex-1 min-w-0">{categoria.categoria}</span>
        <span className="text-[10px] font-mono flex-shrink-0">
          {numAttive > 0 ? (
            <span className="text-[#F5B800] font-semibold">{numAttive} sel · {fmt(subtotale)}</span>
          ) : (
            <span className="text-[#999]">{categoria.voci.length}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#999] flex-shrink-0 transition-transform ${aperta ? 'rotate-180' : ''}`}
        />
      </button>

      {aperta && (
        <div className="border-t border-[#F0F0F0] p-2 space-y-1">
          {categoria.voci.map((v) => (
            <RigaVoce key={v.id} voce={v} ambienteId={ambienteId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Riga voce
// ────────────────────────────────────────────────────────────────────────────

function RigaVoce({ voce, ambienteId }: { voce: VocePrezzario; ambienteId: string }) {
  const { state, dispatch } = useProgetto();
  const { ambienti } = state;
  const corrente = state.vociDettagliate.find(
    (v) => v.voceId === voce.id && v.ambienteId === ambienteId
  );
  const quantita = corrente?.quantita ?? 0;
  const flagged = quantita > 0;
  const totale = quantita * voce.prezzo;
  const stepQuantita = voce.unita_misura === 'mq' || voce.unita_misura === 'ml' ? 0.5 : 1;

  function toggle() {
    if (flagged) {
      dispatch({ type: 'RIMUOVI_VOCE_DETTAGLIATA', voceId: voce.id, ambienteId });
      return;
    }
    const usaMq = voce.unita_misura === 'mq' || voce.unita_misura === 'ml';
    let qDefault = 1;
    if (usaMq && ambienteId !== ID_COMUNI) {
      const amb = ambienti.find((a) => a.id === ambienteId);
      qDefault = amb ? amb.mq : 1;
    }
    dispatch({
      type: 'AGGIORNA_VOCE_DETTAGLIATA',
      voce: {
        voceId: voce.id,
        ambienteId,
        quantita: qDefault,
        prezzoUnitario: voce.prezzo,
        unitaMisura: voce.unita_misura,
        voce: voce.voce,
        categoria: voce.categoria,
      },
    });
  }

  function setQty(q: number) {
    if (q <= 0) {
      dispatch({ type: 'RIMUOVI_VOCE_DETTAGLIATA', voceId: voce.id, ambienteId });
      return;
    }
    dispatch({
      type: 'AGGIORNA_VOCE_DETTAGLIATA',
      voce: {
        voceId: voce.id,
        ambienteId,
        quantita: q,
        prezzoUnitario: voce.prezzo,
        unitaMisura: voce.unita_misura,
        voce: voce.voce,
        categoria: voce.categoria,
      },
    });
  }

  return (
    <div
      className={`grid grid-cols-[20px_1fr_52px] sm:grid-cols-[20px_1fr_60px_60px_70px_80px] gap-x-2 items-center px-2 py-1.5 rounded-lg ${
        flagged ? 'bg-[#FFFEF5]' : 'hover:bg-[#FAFAFA]'
      }`}
    >
      <input
        type="checkbox"
        checked={flagged}
        onChange={toggle}
        className="w-4 h-4 accent-[#F5B800]"
      />
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-medium leading-snug">{voce.voce}</div>
        {voce.descrizione_breve && voce.descrizione_breve !== voce.voce && (
          <div className="text-[10px] text-[#666] mt-0.5 line-clamp-1 hidden sm:block">
            {voce.descrizione_breve}
          </div>
        )}
      </div>
      <div className="text-right text-[11px] font-mono text-[#666] hidden sm:block">
        {fmt(voce.prezzo)}
      </div>
      <div className="text-[10px] font-mono text-[#666] text-right hidden sm:block">
        /{voce.unita_misura}
      </div>
      <input
        type="number"
        min={0}
        step={stepQuantita}
        value={quantita || ''}
        onChange={(e) => setQty(Number(e.target.value) || 0)}
        placeholder="0"
        disabled={!flagged}
        className="w-full text-right p-1 border border-[#E5E5E5] rounded font-mono text-xs focus:border-[#F5B800] outline-none disabled:bg-transparent disabled:border-transparent disabled:text-[#bbb]"
      />
      <div
        className={`text-right font-mono text-xs hidden sm:block ${
          flagged ? 'font-semibold text-[#1A1A1A]' : 'text-[#bbb]'
        }`}
      >
        {fmt(totale)}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sezione comuni a tutta la casa (a-corpo)
// ────────────────────────────────────────────────────────────────────────────

function SchedaCorpoCasa({
  voci,
  aperta,
  onToggle,
  onPrecedente,
  filtro,
}: {
  voci: VocePrezzario[];
  aperta: boolean;
  onToggle: () => void;
  onPrecedente: () => void;
  filtro: string;
}) {
  const { state } = useProgetto();
  const ids = useMemo(() => new Set(voci.map((v) => v.id)), [voci]);
  const sel = state.vociDettagliate.filter(
    (v) => v.ambienteId === ID_COMUNI && ids.has(v.voceId)
  );
  const subtotale = sel.reduce((s, v) => s + v.prezzoUnitario * v.quantita, 0);
  const numAttive = sel.filter((v) => v.quantita > 0).length;

  return (
    <div
      id={`scheda-amb-${ID_COMUNI}`}
      className={`bg-white border-2 rounded-2xl overflow-hidden transition-colors scroll-mt-4 ${
        aperta
          ? 'border-[#F5B800] shadow-md'
          : numAttive > 0
            ? 'border-[#F5B800]/40'
            : 'border-[#E5E5E5]'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-[#FAFAFA] text-left gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              numAttive > 0 ? 'bg-[#F5B800]' : 'bg-[#F5B800]/10'
            }`}
          >
            {numAttive > 0 ? (
              <Check className="w-5 h-5 text-[#1A1A1A]" />
            ) : (
              <Wrench className="w-5 h-5 text-[#F5B800]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Lavori comuni a tutta la casa</div>
            <div className="text-xs text-[#666] mt-0.5">
              {voci.length} voci · sopralluogo, computi, pulizia, ecc.
              {numAttive > 0 && (
                <>
                  {' · '}
                  <span className="text-[#1A1A1A] font-semibold">{numAttive} scelte</span>
                  {' · '}
                  <span className="text-[#F5B800] font-semibold">{fmt(subtotale)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#666] transition-transform flex-shrink-0 ${aperta ? 'rotate-180' : ''}`}
        />
      </button>

      {aperta && (
        <div className="animate-slide-down">
          <SottoSezioneVociFlat
            voci={voci}
            ambienteId={ID_COMUNI}
            filtro={filtro}
          />
          <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] p-3 flex items-center justify-between gap-2">
            <button
              onClick={onPrecedente}
              className="text-xs px-3 py-2 rounded-full border border-[#E5E5E5] hover:bg-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Ambiente precedente
            </button>
            <div className="text-xs text-[#666]">
              {numAttive > 0 ? (
                <>
                  Subtotale:{' '}
                  <span className="font-semibold text-[#1A1A1A]">{fmt(subtotale)}</span>
                </>
              ) : (
                'Compila le voci comuni'
              )}
            </div>
            <div />
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-[#E5E5E5] rounded-2xl p-5">
          <div className="h-4 bg-[#F0F0F0] rounded w-1/3 mb-2 animate-pulse" />
          <div className="h-3 bg-[#F0F0F0] rounded w-1/2 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
