/**
 * Documento PDF della stima — 3 pagine, ricalcato sul preventivo cartaceo di MB
 * (copertina · dettaglio dei lavori · riepilogo con ripartizione e condizioni).
 *
 * Il componente è puro layout: riceve `DatiStimaPdf` già calcolato e non conosce
 * né lo stato del configuratore né il pricing. Non registra i font (lo fa chi lo
 * usa), così è renderizzabile anche fuori dal browser.
 */

import {
  ClipPath,
  Defs,
  Document,
  G,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Circle as SvgCircle,
  Text,
  View,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import {
  EMAIL,
  INDIRIZZO,
  PARTITA_IVA,
  RAGIONE_SOCIALE,
  TEL_DISPLAY,
  TITOLARE,
} from '@/lib/contatti';
import type { DatiStimaPdf } from './datiStima';

// ────────────────────────────────────────────────────────────────────────────
// Palette — gli stessi colori del sito e del preventivo cartaceo
// ────────────────────────────────────────────────────────────────────────────

const NERO = '#1A1A18';
const GIALLO = '#F5B800';
const CREMA = '#FDF4DC';
const GRIGIO = '#6B6B68';
const BORDO = '#E7E7E4';
const CARD = '#F7F7F5';

/** Colori dei settori della ripartizione, nell'ordine del preventivo cartaceo. */
const SETTORI = [GIALLO, NERO, '#4A4A47', '#8A8A86', '#B9B9B4', '#DCDCD7'];

const euro = (n: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

const s = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: NERO,
    paddingTop: 78,
    paddingBottom: 54,
    paddingHorizontal: 46,
  },
  pageCopertina: { fontFamily: 'Inter', fontSize: 9, color: NERO },

  // Occhiello giallo spaziato ("INTERVENTI", "RIEPILOGO", …)
  occhiello: {
    fontSize: 7,
    fontWeight: 700,
    color: GIALLO,
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  titoloSezione: { fontFamily: 'Playfair', fontSize: 22, fontWeight: 700 },
  corsivoGiallo: { fontFamily: 'Playfair', fontStyle: 'italic', color: GIALLO },

  etichetta: { fontSize: 6, fontWeight: 700, color: GRIGIO, letterSpacing: 1.4 },
  testo: { fontSize: 8.5, lineHeight: 1.5, color: '#3A3A38' },

  headerChiaro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 58,
    paddingHorizontal: 46,
    paddingTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: BORDO,
    borderBottomStyle: 'solid',
  },
  footerChiaro: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    paddingHorizontal: 46,
    backgroundColor: NERO,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTesto: { fontSize: 6, color: '#9C9C98' },

  card: {
    backgroundColor: CARD,
    borderLeftWidth: 2,
    borderLeftColor: GIALLO,
    borderLeftStyle: 'solid',
    borderRadius: 3,
    padding: 9,
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Marchio
// ────────────────────────────────────────────────────────────────────────────

function Logo({ chiaro = false }: { chiaro?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Rect x={0} y={0} width={26} height={26} rx={7} ry={7} fill={GIALLO} />
        {/* casetta: tetto + corpo + porta */}
        <Path d="M 13 6 L 20.5 12.6 L 18.6 12.6 L 18.6 20 L 7.4 20 L 7.4 12.6 L 5.5 12.6 Z" fill="#FFFFFF" />
        <Rect x={11.4} y={14.6} width={3.2} height={5.4} fill={GIALLO} />
      </Svg>
      <View>
        <Text
          style={{
            fontFamily: 'Playfair',
            fontSize: 12,
            fontWeight: 700,
            color: chiaro ? '#FFFFFF' : NERO,
            letterSpacing: 0.4,
          }}
        >
          MB
        </Text>
        <Text style={{ fontSize: 4.6, fontWeight: 700, color: GIALLO, letterSpacing: 1.5, marginTop: 1 }}>
          RISTRUTTURAZIONI
        </Text>
      </View>
    </View>
  );
}

function IntestazionePagina({ dati }: { dati: DatiStimaPdf }) {
  return (
    <View style={s.headerChiaro} fixed>
      <Logo />
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: 'Playfair', fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>
          {dati.riferimento}
        </Text>
        <Text style={{ fontSize: 6.5, color: GRIGIO, marginTop: 2 }}>
          {dati.cliente ? `${dati.cliente} · ` : ''}
          {dati.localita}
        </Text>
      </View>
    </View>
  );
}

function PiePagina() {
  return (
    <View style={s.footerChiaro} fixed>
      <Text style={s.footerTesto}>
        <Text style={{ color: GIALLO, fontWeight: 700 }}>{RAGIONE_SOCIALE}</Text> · {INDIRIZZO} · {TEL_DISPLAY} ·{' '}
        {EMAIL}
      </Text>
      <Text style={s.footerTesto} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Ciambella della ripartizione
// ────────────────────────────────────────────────────────────────────────────

function settore(cx: number, cy: number, rOut: number, rIn: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(rOut, a0);
  const [x1, y1] = p(rOut, a1);
  const [x2, y2] = p(rIn, a1);
  const [x3, y3] = p(rIn, a0);
  return [
    `M ${x0} ${y0}`,
    `A ${rOut} ${rOut} 0 ${grande} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rIn} ${rIn} 0 ${grande} 0 ${x3} ${y3}`,
    'Z',
  ].join(' ');
}

function Ciambella({ dati }: { dati: DatiStimaPdf }) {
  const D = 150;
  const cx = D / 2;
  const cy = D / 2;
  const rOut = 66;
  const rIn = 40;
  const totale = dati.interventi.reduce((acc, i) => acc + i.importo, 0);

  // Un solo intervento: l'arco da 360° sarebbe degenere (inizio = fine) e non
  // verrebbe disegnato. Un anello pieno lo risolve.
  const unicoSettore = dati.interventi.length === 1 || totale <= 0;

  let angolo = -Math.PI / 2;

  return (
    <Svg width={D} height={D} viewBox={`0 0 ${D} ${D}`}>
      {unicoSettore ? (
        <SvgCircle
          cx={cx}
          cy={cy}
          r={(rOut + rIn) / 2}
          fill="none"
          stroke={SETTORI[0]}
          strokeWidth={rOut - rIn}
        />
      ) : (
        dati.interventi.map((i, idx) => {
          const quota = (i.importo / totale) * Math.PI * 2;
          const d = settore(cx, cy, rOut, rIn, angolo, angolo + quota);
          angolo += quota;
          return <Path key={i.numero} d={d} fill={SETTORI[idx % SETTORI.length]} />;
        })
      )}
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pagina 1 — copertina
// ────────────────────────────────────────────────────────────────────────────

function Copertina({ dati }: { dati: DatiStimaPdf }) {
  return (
    <Page size="A4" style={s.pageCopertina}>
      <View style={{ height: 150, backgroundColor: NERO, position: 'relative' }}>
        <Svg width={595} height={150} viewBox="0 0 595 150" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* react-pdf non ritaglia l'SVG al viewBox né rispetta overflow:hidden:
              senza questo clip i cerchi sbordano sotto la fascia nera. */}
          <Defs>
            <ClipPath id="fascia">
              <Rect x={0} y={0} width={595} height={150} />
            </ClipPath>
          </Defs>
          <G clipPath="url(#fascia)">
            <SvgCircle cx={455} cy={60} r={95} fill="#3D3520" />
            <SvgCircle cx={560} cy={20} r={70} fill="#57491F" />
          </G>
        </Svg>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingHorizontal: 46,
            paddingTop: 34,
          }}
        >
          <Logo chiaro />
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: 'Playfair',
                fontSize: 13,
                fontWeight: 700,
                color: GIALLO,
                letterSpacing: 1,
              }}
            >
              {dati.riferimento}
            </Text>
            <Text style={{ fontSize: 6.5, color: '#C9C9C4', marginTop: 3 }}>
              {dati.dataEmissione} · Roma
            </Text>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 46, paddingTop: 60, flexGrow: 1 }}>
        <Text style={s.occhiello}>STIMA PRELIMINARE</Text>
        <Text style={{ fontFamily: 'Playfair', fontSize: 42, fontWeight: 700, lineHeight: 1.1 }}>
          {dati.titoloRiga1}
        </Text>
        <Text
          style={{
            fontFamily: 'Playfair',
            fontSize: 42,
            fontWeight: 700,
            fontStyle: 'italic',
            color: GIALLO,
            lineHeight: 1.15,
            marginBottom: 20,
          }}
        >
          {dati.titoloRiga2}
        </Text>

        <Text style={{ ...s.testo, maxWidth: 400, lineHeight: 1.6 }}>{dati.descrizione}</Text>

        <View
          style={{
            marginTop: 40,
            backgroundColor: CREMA,
            borderLeftWidth: 3,
            borderLeftColor: GIALLO,
            borderLeftStyle: 'solid',
            padding: 18,
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          {[
            ['CLIENTE', dati.cliente ?? 'Gentile cliente'],
            ['LOCALITÀ IMMOBILE', dati.localita],
            ['RIFERIMENTO', dati.riferimento],
            ['VALIDITÀ', `${dati.validitaGiorni} giorni dalla data di emissione`],
          ].map(([etichetta, valore], i) => (
            <View key={etichetta} style={{ width: '50%', marginBottom: i < 2 ? 14 : 0 }}>
              <Text style={s.etichetta}>{etichetta}</Text>
              <Text
                style={
                  i === 0
                    ? { fontFamily: 'Playfair', fontSize: 12, fontWeight: 700, fontStyle: 'italic', marginTop: 3 }
                    : { fontSize: 9, fontWeight: 600, marginTop: 4 }
                }
              >
                {valore}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={{
          height: 34,
          backgroundColor: NERO,
          paddingHorizontal: 46,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={s.footerTesto}>
          <Text style={{ color: GIALLO, fontWeight: 700 }}>{RAGIONE_SOCIALE}</Text> · Di {TITOLARE} · {INDIRIZZO}
        </Text>
        <Text style={s.footerTesto}>
          <Text style={{ color: GIALLO, fontWeight: 700 }}>P.IVA</Text> {PARTITA_IVA} · {TEL_DISPLAY}
        </Text>
      </View>
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pagina 2 — dettaglio dei lavori
// ────────────────────────────────────────────────────────────────────────────

const FASI = [
  ['Sopralluogo', 'Verifica gratuita dello stato dei luoghi e delle misure reali.'],
  ['Preventivo definitivo', 'Computo voce per voce sulla base del sopralluogo.'],
  ['Cantiere', 'Squadra interna, cronoprogramma condiviso e aggiornamenti.'],
  ['Consegna', 'Pulizia finale, collaudo impianti e garanzia sulle lavorazioni.'],
];

function DettaglioLavori({ dati }: { dati: DatiStimaPdf }) {
  return (
    <Page size="A4" style={s.page}>
      <IntestazionePagina dati={dati} />

      <Text style={s.occhiello}>INTERVENTI</Text>
      <Text style={{ ...s.titoloSezione, marginBottom: 14 }}>
        Il <Text style={s.corsivoGiallo}>dettaglio</Text> dei lavori
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {dati.interventi.map((i) => (
          <View key={i.numero} style={{ ...s.card, width: '48%' }} wrap={false}>
            <Text style={{ fontSize: 6.5, fontWeight: 700, color: GIALLO, letterSpacing: 1.4 }}>
              {i.numero} · {i.titolo.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'Playfair', fontSize: 11.5, fontWeight: 700, marginTop: 3, marginBottom: 5 }}>
              {i.sottotitolo}
            </Text>
            {i.lavorazioni.map((l) => (
              <View key={l} style={{ flexDirection: 'row', marginBottom: 2.5 }}>
                <View
                  style={{
                    width: 2.5,
                    height: 2.5,
                    backgroundColor: GIALLO,
                    marginTop: 3.4,
                    marginRight: 5,
                  }}
                />
                <Text style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.35, flex: 1 }}>{l}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {dati.ambienti.length > 0 && (
        <>
          <Text style={{ ...s.occhiello, marginTop: 22 }}>SUPERFICI</Text>
          <Text style={{ ...s.titoloSezione, marginBottom: 10 }}>
            Gli <Text style={s.corsivoGiallo}>ambienti</Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {dati.ambienti.map((a) => (
              <View
                key={a.nome}
                style={{
                  borderWidth: 1,
                  borderColor: BORDO,
                  borderStyle: 'solid',
                  borderRadius: 3,
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: 600 }}>{a.nome}</Text>
                <Text style={{ fontSize: 8, color: GIALLO, fontWeight: 700 }}>{a.mq} m²</Text>
              </View>
            ))}
            {dati.mq != null && (
              <View
                style={{
                  backgroundColor: NERO,
                  borderRadius: 3,
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: 600, color: '#FFFFFF' }}>Superficie di riferimento</Text>
                <Text style={{ fontSize: 8, color: GIALLO, fontWeight: 700 }}>~{dati.mq} m²</Text>
              </View>
            )}
          </View>
        </>
      )}

      <Text style={{ ...s.occhiello, marginTop: 22 }}>PERCORSO</Text>
      <Text style={{ ...s.titoloSezione, marginBottom: 12 }}>
        Come <Text style={s.corsivoGiallo}>operiamo</Text>
      </Text>

      <View style={{ flexDirection: 'row', gap: 9 }}>
        {FASI.map(([titolo, desc], i) => (
          <View
            key={titolo}
            style={{
              width: '25%',
              borderTopWidth: 2,
              borderTopColor: GIALLO,
              borderTopStyle: 'solid',
              paddingTop: 7,
            }}
          >
            <Text style={{ fontFamily: 'Playfair', fontSize: 12, fontWeight: 700, color: GIALLO }}>{i + 1}</Text>
            <Text style={{ fontFamily: 'Playfair', fontSize: 10, fontWeight: 700, marginTop: 3 }}>{titolo}</Text>
            <Text style={{ fontSize: 6.8, color: GRIGIO, lineHeight: 1.4, marginTop: 3 }}>{desc}</Text>
          </View>
        ))}
      </View>

      <PiePagina />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pagina 3 — riepilogo economico
// ────────────────────────────────────────────────────────────────────────────

const CONDIZIONI = [
  'Gli importi sono una **stima orientativa** calcolata su tariffe medie di mercato: non costituiscono un preventivo contrattuale.',
  'Il prezzo definitivo viene confermato **dopo il sopralluogo gratuito** e può variare di circa ±15% (vedi range indicato).',
  'La stima comprende le lavorazioni e i **materiali di base** del livello di finitura scelto. Sono esclusi arredi, elettrodomestici e finiture di pregio fuori standard.',
  'Sono escluse pratiche edilizie, oneri comunali, opere strutturali e imprevisti non visibili prima delle demolizioni.',
  'IVA agevolata al 10% applicabile in regime di ristrutturazione di abitazione privata; 22% negli altri casi. Da verificare caso per caso.',
];

/** Rende il **grassetto** in stile markdown dentro un <Text> di react-pdf. */
function TestoConGrassetto({ testo, style }: { testo: string; style: Style }) {
  return (
    <Text style={style}>
      {testo.split('**').map((parte, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontWeight: 700, color: NERO }}>
            {parte}
          </Text>
        ) : (
          <Text key={i}>{parte}</Text>
        )
      )}
    </Text>
  );
}

function Riepilogo({ dati }: { dati: DatiStimaPdf }) {
  return (
    <Page size="A4" style={s.page}>
      <IntestazionePagina dati={dati} />

      <Text style={s.occhiello}>RIEPILOGO</Text>
      <Text style={{ ...s.titoloSezione, marginBottom: 14 }}>
        La <Text style={s.corsivoGiallo}>stima</Text>
      </Text>

      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
        <View
          style={{
            width: '48%',
            backgroundColor: CREMA,
            borderLeftWidth: 3,
            borderLeftColor: GIALLO,
            borderLeftStyle: 'solid',
            padding: 12,
          }}
        >
          <Text style={s.etichetta}>SPETTABILE</Text>
          <Text style={{ fontFamily: 'Playfair', fontSize: 15, fontWeight: 700, marginTop: 3 }}>
            {dati.cliente ?? 'Gentile cliente'}
          </Text>
          <Text style={{ fontSize: 8, color: GRIGIO, marginTop: 2 }}>{dati.localita}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          {[
            ['DATA', dati.dataEmissione],
            ['VALIDITÀ', `${dati.validitaGiorni} giorni`],
            ['RIF.', dati.riferimento],
            ['SUPERFICIE', dati.mq != null ? `~${dati.mq} m² · finitura ${dati.finitura}` : `Finitura ${dati.finitura}`],
          ].map(([k, v]) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderBottomWidth: 1,
                borderBottomColor: BORDO,
                borderBottomStyle: 'solid',
                paddingVertical: 4,
              }}
            >
              <Text style={s.etichetta}>{k}</Text>
              <Text style={{ fontSize: 8, fontWeight: 600 }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ backgroundColor: NERO, paddingVertical: 7, paddingHorizontal: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 8, color: '#C9C9C4' }}>
          Oggetto:{' '}
          <Text style={{ fontFamily: 'Playfair', fontSize: 10, fontWeight: 700, color: GIALLO }}>
            {dati.titoloRiga1} {dati.titoloRiga2.toLowerCase()} · stima preliminare
          </Text>
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Ripartizione */}
        <View style={{ width: '46%', backgroundColor: CARD, borderRadius: 4, padding: 12, alignItems: 'center' }}>
          <Ciambella dati={dati} />
          <View style={{ width: '100%', marginTop: 8 }}>
            {dati.interventi.map((i, idx) => (
              <View key={i.numero} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 1,
                    backgroundColor: SETTORI[idx % SETTORI.length],
                    marginRight: 6,
                  }}
                />
                <Text style={{ fontSize: 7.4, flex: 1 }}>{i.titolo}</Text>
                <Text style={{ fontSize: 7.4, fontWeight: 600, marginRight: 6 }}>{euro(i.importo)}</Text>
                <Text style={{ fontSize: 7.4, color: GRIGIO, width: 22, textAlign: 'right' }}>{i.pct}%</Text>
              </View>
            ))}
          </View>
          <Text
            style={{
              fontFamily: 'Playfair',
              fontStyle: 'italic',
              fontSize: 6.8,
              color: GRIGIO,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            Ripartizione indicativa dell'impegno per intervento.
          </Text>
        </View>

        {/* Totali + cosa comprende */}
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: NERO, borderRadius: 4, padding: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#3A3A36',
                borderBottomStyle: 'solid',
                paddingBottom: 7,
              }}
            >
              <Text style={{ fontSize: 6.5, fontWeight: 700, color: '#9C9C98', letterSpacing: 1.2 }}>
                IMPONIBILE (IVA ESCL.)
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{euro(dati.imponibile)}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#3A3A36',
                borderBottomStyle: 'solid',
                paddingVertical: 7,
              }}
            >
              <Text style={{ fontSize: 6.5, fontWeight: 700, color: '#9C9C98', letterSpacing: 1.2 }}>
                IVA {dati.ivaPct}% · {dati.tipoCasa === 'prima' ? 'PRIMA CASA' : 'SECONDA CASA'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{euro(dati.iva)}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
              }}
            >
              <Text style={{ fontSize: 7, fontWeight: 700, color: GIALLO, letterSpacing: 1.2 }}>
                TOTALE STIMATO
              </Text>
              <Text
                style={{
                  fontFamily: 'Playfair',
                  fontSize: 17,
                  fontWeight: 700,
                  fontStyle: 'italic',
                  color: GIALLO,
                }}
              >
                {euro(dati.totaleIvato)}
              </Text>
            </View>
            <Text style={{ fontSize: 6.4, color: '#9C9C98', marginTop: 6, lineHeight: 1.4 }}>
              Imponibile orientativo tra {euro(dati.rangeMin)} e {euro(dati.rangeMax)} (oltre IVA), a seconda di
              materiali e stato dei luoghi.
            </Text>
          </View>

          <View
            style={{
              marginTop: 10,
              borderWidth: 1,
              borderColor: GIALLO,
              borderStyle: 'solid',
              borderRadius: 4,
              padding: 10,
            }}
          >
            <Text style={{ fontSize: 6.5, fontWeight: 700, color: GIALLO, letterSpacing: 1.4 }}>
              COSA COMPRENDE
            </Text>
            <Text style={{ fontSize: 6.2, color: GRIGIO, letterSpacing: 0.8, marginTop: 2, marginBottom: 5 }}>
              LAVORAZIONI E MATERIALI DI BASE
            </Text>
            <TestoConGrassetto
              testo={`Il totale comprende **manodopera e materiali di base** del livello di finitura ${dati.finitura}.`}
              style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.45, marginBottom: 4 }}
            />
            <TestoConGrassetto
              testo="Sono **esclusi** arredi, elettrodomestici, finiture di pregio fuori standard e pratiche edilizie."
              style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.45, marginBottom: 4 }}
            />
            <Text style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.45 }}>
              Su richiesta prepariamo un preventivo dedicato per ceramiche, sanitari e finiture.
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          marginTop: 12,
          backgroundColor: CREMA,
          borderLeftWidth: 3,
          borderLeftColor: GIALLO,
          borderLeftStyle: 'solid',
          padding: 11,
        }}
      >
        <Text style={{ ...s.etichetta, color: '#9A7A12', marginBottom: 5 }}>NOTE E CONDIZIONI</Text>
        {CONDIZIONI.map((c) => (
          <View key={c} style={{ flexDirection: 'row', marginBottom: 3 }}>
            <Text style={{ fontSize: 7.2, color: GIALLO, marginRight: 5, fontWeight: 700 }}>›</Text>
            <TestoConGrassetto testo={c} style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.45, flex: 1 }} />
          </View>
        ))}
        <Text style={{ fontSize: 7.2, color: '#55554F', lineHeight: 1.45, marginTop: 3 }}>
          <Text style={{ color: GIALLO, fontWeight: 700 }}>› </Text>
          Validità della stima: <Text style={{ fontWeight: 700, color: NERO }}>
            {dati.validitaGiorni} giorni
          </Text>{' '}
          dalla data di emissione. Tempistica indicata dal cliente: {dati.tempistica.toLowerCase()}.
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', marginTop: 18 }}>
        <Text style={{ ...s.etichetta, marginBottom: 16 }}>IN FEDE</Text>
        <View
          style={{
            width: 150,
            borderTopWidth: 1,
            borderTopColor: NERO,
            borderTopStyle: 'solid',
            paddingTop: 4,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: 'Playfair', fontSize: 10, fontWeight: 700 }}>{TITOLARE}</Text>
          <Text style={{ fontSize: 6.5, color: GRIGIO, marginTop: 1 }}>Titolare · {RAGIONE_SOCIALE}</Text>
        </View>
      </View>

      <PiePagina />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function StimaPdfDoc({ dati }: { dati: DatiStimaPdf }) {
  return (
    <Document
      title={`${dati.riferimento} · ${RAGIONE_SOCIALE}`}
      author={RAGIONE_SOCIALE}
      subject="Stima preliminare di ristrutturazione"
      creator={RAGIONE_SOCIALE}
    >
      <Copertina dati={dati} />
      <DettaglioLavori dati={dati} />
      <Riepilogo dati={dati} />
    </Document>
  );
}
