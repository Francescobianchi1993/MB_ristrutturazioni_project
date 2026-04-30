/**
 * Livello "Intervento puntuale" — terza modalità del preventivo.
 *
 * Logica search + browse (no wizard). L'utente:
 *   1. cerca per parola, oppure
 *   2. filtra per area (categoria), oppure
 *   3. filtra per ambiente, oppure
 *   4. apre un accordion per area e seleziona dalle voci raggruppate.
 *
 * Le voci sono SEMPRE raggruppate per area (anche con filtri "Tutti" attivi).
 * Ogni area è un accordion espandibile/collassabile.
 *
 * Le voci selezionate finiscono in un carrello (stato locale, non globale).
 * Il carrello è sempre visibile come barra sticky in basso e supporta:
 *   - aggiunta (qty +1)
 *   - sottrazione (qty -1, rimuove se 0)
 *   - rimozione totale (cestino)
 *   - download del preventivo come .txt (sempre disponibile, disabilitato a carrello vuoto)
 *
 * I prezzi qui sono PLACEHOLDER (10/20/30 €) in attesa delle voci reali nel DB.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  Wrench,
  Plus,
  Minus,
  Trash2,
  Download,
  Star,
  X,
  ChevronDown,
  Droplet,
  Wind,
  Flame,
  Zap as ZapIcon,
  DoorClosed,
  Paintbrush,
} from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────────────────────────────────────
// Tipi e dati mock (prezzi 10/20/30 €, da rimpiazzare con voci reali da DB)
// ────────────────────────────────────────────────────────────────────────────

type Area = 'Idraulica' | 'Clima' | 'Termico' | 'Elettrico' | 'Serramenti' | 'Pittura';
type Ambiente = 'Bagno' | 'Cucina' | 'Camera' | 'Soggiorno' | 'Tutta casa';

interface VoceIntervento {
  id: number;
  voce: string;
  descrizione: string;
  area: Area;
  ambienti: Ambiente[];
  prezzo: 10 | 20 | 30;
  unita: string;
  pacchetto?: boolean;
}

const VOCI: VoceIntervento[] = [
  // ── Idraulica (15)
  { id: 101, voce: 'Sostituzione rubinetto lavabo', descrizione: 'Smontaggio vecchio + posa nuovo, escluso ricambio.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 30, unita: 'cad' },
  { id: 102, voce: 'Riparazione perdita scarico', descrizione: 'Verifica e sostituzione guarnizione/sifone.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 20, unita: 'cad' },
  { id: 103, voce: 'Sostituzione miscelatore doccia', descrizione: 'Smontaggio + posa nuovo miscelatore.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 30, unita: 'cad' },
  { id: 104, voce: 'Pulizia sifone otturato', descrizione: 'Smontaggio, pulizia e rimontaggio sifone.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 10, unita: 'cad' },
  { id: 105, voce: 'Sostituzione tubo flessibile sottolavabo', descrizione: 'Sostituzione del tubo di alimentazione acqua.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 10, unita: 'cad' },
  { id: 106, voce: 'Sostituzione vaschetta WC', descrizione: 'Smontaggio + posa nuova cassetta di scarico.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 30, unita: 'cad' },
  { id: 107, voce: 'Riparazione cassetta scarico', descrizione: 'Sostituzione galleggiante e battente.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 20, unita: 'cad' },
  { id: 108, voce: 'Sostituzione doccino', descrizione: 'Sostituzione soffione + flessibile doccia.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 10, unita: 'cad' },
  { id: 109, voce: 'Riparazione guarnizione rubinetto', descrizione: 'Sostituzione guarnizione interna per gocciolamento.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 10, unita: 'cad' },
  { id: 110, voce: 'Spurgo lavandino', descrizione: 'Disostruzione meccanica dello scarico.', area: 'Idraulica', ambienti: ['Bagno', 'Cucina'], prezzo: 20, unita: 'cad' },
  { id: 111, voce: 'Installazione miscelatore lavello', descrizione: 'Smontaggio vecchio + posa nuovo miscelatore cucina.', area: 'Idraulica', ambienti: ['Cucina'], prezzo: 30, unita: 'cad' },
  { id: 112, voce: 'Manutenzione boiler', descrizione: 'Pulizia, controllo anodo e termostato.', area: 'Idraulica', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 113, voce: 'Verifica perdite acqua', descrizione: 'Controllo impianto e localizzazione perdita.', area: 'Idraulica', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 114, voce: 'Sostituzione galleggiante WC', descrizione: 'Smontaggio + sostituzione del galleggiante.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 10, unita: 'cad' },
  { id: 115, voce: 'Pulizia pozzetto scarico', descrizione: 'Apertura e pulizia pozzetto/sifone esterno.', area: 'Idraulica', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },

  // ── Clima (12)
  { id: 201, voce: 'Pulizia filtri split', descrizione: 'Estrazione e lavaggio filtri unità interna.', area: 'Clima', ambienti: ['Camera', 'Soggiorno', 'Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 202, voce: 'Sanificazione split', descrizione: 'Igienizzazione completa scambiatore + filtri.', area: 'Clima', ambienti: ['Camera', 'Soggiorno', 'Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 203, voce: 'Manutenzione base climatizzatore', descrizione: 'Pulizia, controllo carico gas, test funzionalità.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 204, voce: 'Sostituzione filtri attivi', descrizione: 'Cambio filtri carbone/HEPA.', area: 'Clima', ambienti: ['Camera', 'Soggiorno'], prezzo: 20, unita: 'cad' },
  { id: 205, voce: 'Ricarica gas refrigerante', descrizione: 'Vuoto impianto + carica gas R32/R410.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 206, voce: 'Pulizia unità esterna', descrizione: 'Lavaggio condensatore + verifica ventola.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 207, voce: 'Verifica perdita gas clima', descrizione: 'Test pressione + ricerca perdita.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 208, voce: 'Riparazione telecomando clima', descrizione: 'Diagnostica e ripristino comandi.', area: 'Clima', ambienti: ['Camera', 'Soggiorno'], prezzo: 10, unita: 'cad' },
  { id: 209, voce: 'Manutenzione clima cucina', descrizione: 'Pulizia approfondita per ambiente con grassi.', area: 'Clima', ambienti: ['Cucina'], prezzo: 30, unita: 'cad' },
  { id: 210, voce: 'Diagnostica errore split', descrizione: 'Lettura codici errore + verifica scheda.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 211, voce: 'Pulizia ventola interna', descrizione: 'Smontaggio, pulizia e bilanciamento.', area: 'Clima', ambienti: ['Camera', 'Soggiorno', 'Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 212, voce: 'Sostituzione termostato split', descrizione: 'Smontaggio + posa nuovo termostato unità interna.', area: 'Clima', ambienti: ['Camera', 'Soggiorno'], prezzo: 30, unita: 'cad' },

  // ── Termico (13)
  { id: 301, voce: 'Sostituzione termostato ambiente', descrizione: 'Smontaggio + posa nuovo termostato.', area: 'Termico', ambienti: ['Soggiorno', 'Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 302, voce: 'Spurgo aria radiatori', descrizione: 'Sfiato + ripristino pressione impianto.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 303, voce: 'Sostituzione valvola termostatica', descrizione: 'Smontaggio + posa nuova valvola.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 304, voce: 'Manutenzione caldaia annuale', descrizione: 'Pulizia + analisi fumi + bollino.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 305, voce: 'Sostituzione cronotermostato', descrizione: 'Smontaggio + posa cronotermostato evoluto.', area: 'Termico', ambienti: ['Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 306, voce: 'Riparazione perdita radiatore', descrizione: 'Localizzazione e sigillatura perdita.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 307, voce: 'Pulizia caldaia', descrizione: 'Pulizia approfondita scambiatore e bruciatore.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 308, voce: 'Verifica pressione caldaia', descrizione: 'Controllo manometro + ricarica circuito.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 309, voce: 'Sostituzione manometro caldaia', descrizione: 'Smontaggio + posa nuovo manometro.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 310, voce: 'Pulizia bruciatore', descrizione: 'Smontaggio e pulizia ugelli.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 311, voce: 'Controllo tiraggio caldaia', descrizione: 'Verifica canna fumaria e tiraggio.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 312, voce: 'Sostituzione sonda esterna', descrizione: 'Posa nuova sonda di temperatura esterna.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 313, voce: 'Lavaggio impianto riscaldamento', descrizione: 'Pulizia chimica circuito radiatori.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },

  // ── Elettrico (14)
  { id: 401, voce: 'Sostituzione presa elettrica', descrizione: 'Smontaggio + posa nuova presa schuko/bipasso.', area: 'Elettrico', ambienti: ['Bagno', 'Cucina', 'Camera', 'Soggiorno'], prezzo: 10, unita: 'cad' },
  { id: 402, voce: 'Sostituzione interruttore', descrizione: 'Smontaggio + posa nuovo interruttore/deviatore.', area: 'Elettrico', ambienti: ['Bagno', 'Cucina', 'Camera', 'Soggiorno'], prezzo: 10, unita: 'cad' },
  { id: 403, voce: 'Installazione plafoniera', descrizione: 'Posa e collegamento corpo illuminante a soffitto.', area: 'Elettrico', ambienti: ['Camera', 'Soggiorno', 'Cucina'], prezzo: 20, unita: 'cad' },
  { id: 404, voce: 'Punto luce nuovo a parete', descrizione: 'Tracciatura, posa cavo e scatola, frutto escluso.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 405, voce: 'Verifica impianto + test differenziale', descrizione: 'Controllo continuità, isolamento, prova salvavita.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 406, voce: 'Sostituzione lampadina LED', descrizione: 'Cambio lampadina con scala/trabattello.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 407, voce: 'Riparazione presa scossa', descrizione: 'Diagnostica e messa in sicurezza presa.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 408, voce: 'Installazione faretto incassato', descrizione: 'Foratura controsoffitto + cablaggio + posa.', area: 'Elettrico', ambienti: ['Bagno', 'Cucina', 'Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 409, voce: 'Sostituzione campanello porta', descrizione: 'Smontaggio + posa nuovo campanello.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 410, voce: 'Installazione dimmer', descrizione: 'Sostituzione interruttore con dimmer.', area: 'Elettrico', ambienti: ['Camera', 'Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 411, voce: 'Verifica salvavita', descrizione: 'Test pulsante + tempistica intervento.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 412, voce: 'Aggiunta presa USB', descrizione: 'Sostituzione presa con presa USB integrata.', area: 'Elettrico', ambienti: ['Camera', 'Soggiorno', 'Cucina'], prezzo: 30, unita: 'cad' },
  { id: 413, voce: 'Sostituzione applique', descrizione: 'Smontaggio + posa nuovo corpo applique a parete.', area: 'Elettrico', ambienti: ['Camera', 'Soggiorno', 'Bagno'], prezzo: 20, unita: 'cad' },
  { id: 414, voce: 'Diagnostica corto circuito', descrizione: 'Identificazione tratta in corto + ripristino.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },

  // ── Serramenti (12)
  { id: 501, voce: 'Regolazione cerniera porta interna', descrizione: 'Allineamento anta e battuta.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 502, voce: 'Sostituzione maniglia porta', descrizione: 'Smontaggio + posa nuova maniglia.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 503, voce: 'Manutenzione persiana', descrizione: 'Lubrificazione cardini + regolazione battute.', area: 'Serramenti', ambienti: ['Camera', 'Soggiorno'], prezzo: 20, unita: 'cad' },
  { id: 504, voce: 'Sostituzione zanzariera', descrizione: 'Smontaggio + posa nuova zanzariera a rullo.', area: 'Serramenti', ambienti: ['Camera', 'Soggiorno', 'Cucina'], prezzo: 30, unita: 'cad' },
  { id: 505, voce: 'Riparazione tapparella inceppata', descrizione: 'Sblocco, lubrificazione, sostituzione cinghia.', area: 'Serramenti', ambienti: ['Camera', 'Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 506, voce: 'Sostituzione serratura porta', descrizione: 'Smontaggio + posa nuova serratura.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 507, voce: 'Allineamento finestra', descrizione: 'Regolazione cerniere e battute finestra.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 508, voce: 'Lubrificazione cerniere', descrizione: 'Pulizia e ingrassaggio cerniere porte/finestre.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 509, voce: 'Sostituzione guarnizione finestra', descrizione: 'Posa nuova guarnizione perimetrale.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 510, voce: 'Riparazione tapparella elettrica', descrizione: 'Diagnostica motore + ripristino comandi.', area: 'Serramenti', ambienti: ['Camera', 'Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 511, voce: 'Sostituzione vetro porta', descrizione: 'Smontaggio + posa nuovo vetro temperato.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 512, voce: 'Sostituzione cinghia tapparella', descrizione: 'Apertura cassonetto + posa cinghia nuova.', area: 'Serramenti', ambienti: ['Camera', 'Soggiorno'], prezzo: 20, unita: 'cad' },

  // ── Pittura (12)
  { id: 601, voce: 'Tinteggiatura ritocco parete', descrizione: 'Pittura puntuale fino a 2 mq, idropittura inclusa.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 602, voce: 'Stuccatura crepa', descrizione: 'Apertura, stucco, carta vetrata.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 603, voce: 'Carteggiatura puntuale superficie', descrizione: 'Preparazione superficie per riverniciatura.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 604, voce: 'Trattamento antimuffa', descrizione: 'Applicazione prodotto antimuffa su area circoscritta.', area: 'Pittura', ambienti: ['Bagno', 'Cucina'], prezzo: 20, unita: 'cad' },
  { id: 605, voce: 'Verniciatura porta interna', descrizione: 'Carteggiatura + 2 mani di smalto.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 606, voce: 'Verniciatura termosifone', descrizione: 'Sgrassaggio + smalto specifico per radiatori.', area: 'Pittura', ambienti: ['Camera', 'Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 607, voce: 'Stuccatura buco parete', descrizione: 'Riempimento e levigatura buchi/lesioni.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 10, unita: 'cad' },
  { id: 608, voce: 'Tinteggiatura soffitto', descrizione: 'Mascheratura + due mani idropittura su soffitto.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },
  { id: 609, voce: 'Verniciatura ringhiera interna', descrizione: 'Carteggiatura + smalto ferromicaceo.', area: 'Pittura', ambienti: ['Soggiorno'], prezzo: 30, unita: 'cad' },
  { id: 610, voce: 'Trattamento antimacchia parete', descrizione: 'Applicazione fissativo + idrorepellente.', area: 'Pittura', ambienti: ['Cucina'], prezzo: 20, unita: 'cad' },
  { id: 611, voce: 'Verniciatura cornici', descrizione: 'Sgrassaggio + 2 mani di smalto su cornici/battiscopa.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 20, unita: 'cad' },
  { id: 612, voce: 'Ripristino calce parete', descrizione: 'Stuccatura + pittura a calce su parete piccola.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 30, unita: 'cad' },

  // ── Pacchetti turn-key (uno per area, badge ⭐)
  { id: 901, voce: 'Pacchetto manutenzione bagno', descrizione: 'Sost. rubinetto + pulizia sifone + spurgo. Tutto compreso.', area: 'Idraulica', ambienti: ['Bagno'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
  { id: 902, voce: 'Pacchetto pulizia & sanificazione clima', descrizione: 'Pulizia filtri + sanificazione + check funzionalità.', area: 'Clima', ambienti: ['Tutta casa'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
  { id: 903, voce: 'Pacchetto manutenzione caldaia', descrizione: 'Manutenzione annuale + analisi fumi + bollino.', area: 'Termico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
  { id: 904, voce: 'Pacchetto verifica impianto elettrico', descrizione: 'Test salvavita + continuità + relazione tecnica.', area: 'Elettrico', ambienti: ['Tutta casa'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
  { id: 905, voce: 'Pacchetto manutenzione serramenti', descrizione: 'Lubrificazione + regolazione + sostituz. guarnizioni.', area: 'Serramenti', ambienti: ['Tutta casa'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
  { id: 906, voce: 'Pacchetto ritocco pittura', descrizione: 'Stuccature + carteggiatura + pittura aree puntuali.', area: 'Pittura', ambienti: ['Tutta casa'], prezzo: 30, unita: 'pacchetto', pacchetto: true },
];

const AREE: Area[] = ['Idraulica', 'Clima', 'Termico', 'Elettrico', 'Serramenti', 'Pittura'];
const AMBIENTI: Ambiente[] = ['Bagno', 'Cucina', 'Camera', 'Soggiorno', 'Tutta casa'];

const VOCE_BY_ID = new Map(VOCI.map((v) => [v.id, v]));

// "Pacchetti" è un pseudo-gruppo (composto dalle voci con flag `pacchetto`),
// elencato per primo nell'accordion. Tutti gli altri seguono in ordine fisso.
type GruppoKey = 'Pacchetti' | Area;
const GRUPPI: { key: GruppoKey; icona: typeof Wrench }[] = [
  { key: 'Pacchetti', icona: Star },
  { key: 'Idraulica', icona: Droplet },
  { key: 'Clima', icona: Wind },
  { key: 'Termico', icona: Flame },
  { key: 'Elettrico', icona: ZapIcon },
  { key: 'Serramenti', icona: DoorClosed },
  { key: 'Pittura', icona: Paintbrush },
];

// ────────────────────────────────────────────────────────────────────────────
// Stato carrello — logica add/sub/remove pura
// ────────────────────────────────────────────────────────────────────────────

interface CartItem {
  voceId: number;
  qty: number;
}

function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const aggiungi = (voceId: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.voceId === voceId);
      if (idx === -1) return [...prev, { voceId, qty: 1 }];
      return prev.map((i) => (i.voceId === voceId ? { ...i, qty: i.qty + 1 } : i));
    });
  };

  const sottrai = (voceId: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.voceId === voceId);
      if (!item) return prev;
      if (item.qty <= 1) return prev.filter((i) => i.voceId !== voceId);
      return prev.map((i) => (i.voceId === voceId ? { ...i, qty: i.qty - 1 } : i));
    });
  };

  const rimuovi = (voceId: number) => {
    setItems((prev) => prev.filter((i) => i.voceId !== voceId));
  };

  const setQty = (voceId: number, qty: number) => {
    if (qty <= 0) return rimuovi(voceId);
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.voceId === voceId);
      if (idx === -1) return [...prev, { voceId, qty }];
      return prev.map((i) => (i.voceId === voceId ? { ...i, qty } : i));
    });
  };

  const svuota = () => setItems([]);

  const getQty = (voceId: number) => items.find((i) => i.voceId === voceId)?.qty ?? 0;

  const totale = items.reduce((sum, i) => {
    const v = VOCE_BY_ID.get(i.voceId);
    return sum + (v?.prezzo ?? 0) * i.qty;
  }, 0);

  const numVoci = items.reduce((s, i) => s + i.qty, 0);

  return { items, totale, numVoci, aggiungi, sottrai, rimuovi, setQty, svuota, getQty };
}

// ────────────────────────────────────────────────────────────────────────────
// Download preventivo come .txt
// ────────────────────────────────────────────────────────────────────────────

function scaricaPreventivo(items: CartItem[], totale: number) {
  if (items.length === 0) {
    toast.warning('Carrello vuoto', { description: 'Aggiungi almeno un intervento prima di scaricare.' });
    return;
  }

  const data = new Date().toLocaleDateString('it-IT');
  const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const sep = '─'.repeat(60);

  const righe: string[] = [
    'PREVENTIVO INTERVENTI — MB Ristrutturazioni',
    `${data} ${ora}`,
    sep,
    '',
  ];

  for (const item of items) {
    const v = VOCE_BY_ID.get(item.voceId);
    if (!v) continue;
    const sub = v.prezzo * item.qty;
    righe.push(`• ${v.voce}`);
    righe.push(`  ${v.descrizione}`);
    righe.push(`  €${v.prezzo.toFixed(2)} × ${item.qty} ${v.unita}  =  €${sub.toFixed(2)}`);
    righe.push('');
  }

  righe.push(sep);
  righe.push(`TOTALE STIMATO:  €${totale.toFixed(2)}`);
  righe.push(sep);
  righe.push('');
  righe.push('Preventivo indicativo. Sopralluogo gratuito di conferma con MB.');
  righe.push('Contatti:  www.mb-ristrutturazioni.it');

  const blob = new Blob([righe.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preventivo-mb-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success('Preventivo scaricato', { description: `${items.length} voci · €${totale.toFixed(2)}` });
}

// ────────────────────────────────────────────────────────────────────────────
// Componente principale
// ────────────────────────────────────────────────────────────────────────────

interface LivelloInterventoProps {
  onTorna: () => void;
}

export default function LivelloIntervento({ onTorna }: LivelloInterventoProps) {
  const [search, setSearch] = useState('');
  const [filtroArea, setFiltroArea] = useState<Area | null>(null);
  const [filtroAmbiente, setFiltroAmbiente] = useState<Ambiente | null>(null);
  const [aperti, setAperti] = useState<Set<GruppoKey>>(new Set(['Pacchetti']));
  const [carrelloAperto, setCarrelloAperto] = useState(false);

  const cart = useCart();

  // Filtra le voci in base a search + ambiente. Il filtro area determina invece
  // QUALI gruppi mostrare nell'accordion (non filtra le voci dentro un gruppo).
  const vociFiltrate = useMemo(() => {
    const q = search.trim().toLowerCase();
    return VOCI.filter((v) => {
      if (filtroAmbiente && !v.ambienti.includes(filtroAmbiente)) return false;
      if (q && !v.voce.toLowerCase().includes(q) && !v.descrizione.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, filtroAmbiente]);

  // Raggruppa le voci per gruppo (Pacchetti + 6 aree).
  const vociPerGruppo = useMemo(() => {
    const map = new Map<GruppoKey, VoceIntervento[]>();
    for (const g of GRUPPI) map.set(g.key, []);
    for (const v of vociFiltrate) {
      const key: GruppoKey = v.pacchetto ? 'Pacchetti' : v.area;
      map.get(key)!.push(v);
    }
    return map;
  }, [vociFiltrate]);

  // Quando l'utente clicca un chip area, mostra solo quel gruppo (o Pacchetti) e auto-apri.
  // Quando l'utente cerca, apri tutti i gruppi che hanno match.
  useEffect(() => {
    if (search.trim() !== '') {
      const conMatch = new Set<GruppoKey>();
      for (const [key, voci] of vociPerGruppo) {
        if (voci.length > 0) conMatch.add(key);
      }
      setAperti(conMatch);
      return;
    }
    if (filtroArea !== null) {
      setAperti(new Set<GruppoKey>([filtroArea]));
      return;
    }
    // Reset ai default quando non c'è filtro area né search
    setAperti(new Set<GruppoKey>(['Pacchetti']));
  }, [filtroArea, search, vociPerGruppo]);

  const toggleGruppo = (key: GruppoKey) => {
    setAperti((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resettaFiltri = () => {
    setSearch('');
    setFiltroArea(null);
    setFiltroAmbiente(null);
  };

  const haFiltri = search !== '' || filtroArea !== null || filtroAmbiente !== null;

  // Quali gruppi mostrare in lista (rispettando il chip area)
  const gruppiVisibili = filtroArea === null ? GRUPPI : GRUPPI.filter((g) => g.key === filtroArea || g.key === 'Pacchetti');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <button
        onClick={onTorna}
        className="text-sm text-[#666] hover:text-[#1A1A1A] mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Cambia modalità
      </button>

      {/* Intestazione */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 bg-[#F5B800]/10 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Wrench className="w-4 h-4 text-[#F5B800]" />
          Intervento puntuale
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
          Cosa ti serve <span className="text-[#F5B800]">oggi</span>?
        </h2>
        <p className="text-[#666] text-base mt-3">
          Cerca un intervento o sfoglia per area. Aggiungi al carrello e scarica subito il preventivo.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mx-auto mb-5">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#999]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="es. cambio rubinetto, manutenzione caldaia, sostituzione presa…"
          className="w-full pl-12 pr-12 py-4 rounded-full border-2 border-[#E5E5E5] focus:border-[#F5B800] focus:outline-none text-base"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A]"
            aria-label="Pulisci ricerca"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Chips area */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <Chip label="Tutti" attivo={filtroArea === null} onClick={() => setFiltroArea(null)} />
        {AREE.map((a) => (
          <Chip key={a} label={a} attivo={filtroArea === a} onClick={() => setFiltroArea(a)} />
        ))}
      </div>

      {/* Chips ambiente */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        <span className="text-xs text-[#666] mr-2 font-mono uppercase tracking-wider">Ambiente:</span>
        <Chip label="Tutti" piccolo attivo={filtroAmbiente === null} onClick={() => setFiltroAmbiente(null)} />
        {AMBIENTI.map((a) => (
          <Chip key={a} label={a} piccolo attivo={filtroAmbiente === a} onClick={() => setFiltroAmbiente(a)} />
        ))}
      </div>

      {/* Header risultati */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold">
          {vociFiltrate.length} {vociFiltrate.length === 1 ? 'intervento' : 'interventi'} trovati
        </h3>
        {haFiltri && (
          <button
            onClick={resettaFiltri}
            className="text-sm text-[#F5B800] hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Pulisci filtri
          </button>
        )}
      </div>

      {/* Accordion: Pacchetti full-width, le altre aree in 2 colonne (col-span-2 quando aperte) */}
      {(() => {
        const pacchettiVisibile = gruppiVisibili.find((g) => g.key === 'Pacchetti');
        const areeVisibili = gruppiVisibili.filter((g) => g.key !== 'Pacchetti');
        const renderContenuto = (g: typeof GRUPPI[number], voci: VoceIntervento[]) => {
          if (voci.length === 0) {
            return (
              <div className="p-5 text-center text-sm text-[#999]">
                Nessun intervento {filtroAmbiente ? `per "${filtroAmbiente}"` : ''} in questa area.
              </div>
            );
          }
          return (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
              {voci.map((v) => (
                <CardVoce
                  key={v.id}
                  voce={v}
                  qty={cart.getQty(v.id)}
                  onAdd={() => cart.aggiungi(v.id)}
                  onSub={() => cart.sottrai(v.id)}
                  evidenziato={g.key === 'Pacchetti'}
                />
              ))}
            </div>
          );
        };
        return (
          <>
            {pacchettiVisibile && (
              <div className="mb-6">
                <GruppoAccordion
                  titolo={pacchettiVisibile.key}
                  icona={pacchettiVisibile.icona}
                  evidenziato
                  numVoci={(vociPerGruppo.get('Pacchetti') ?? []).length}
                  aperto={aperti.has('Pacchetti')}
                  onToggle={() => toggleGruppo('Pacchetti')}
                >
                  {renderContenuto(pacchettiVisibile, vociPerGruppo.get('Pacchetti') ?? [])}
                </GruppoAccordion>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {areeVisibili.map((g) => {
                const voci = vociPerGruppo.get(g.key) ?? [];
                const isAperto = aperti.has(g.key);
                return (
                  <div
                    key={g.key}
                    className={`transition-[grid-column] duration-300 ${isAperto ? 'md:col-span-3' : 'md:col-span-1'}`}
                  >
                    <GruppoAccordion
                      titolo={g.key}
                      icona={g.icona}
                      numVoci={voci.length}
                      aperto={isAperto}
                      onToggle={() => toggleGruppo(g.key)}
                    >
                      {renderContenuto(g, voci)}
                    </GruppoAccordion>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Carrello sticky in fondo (sempre visibile) */}
      <CarrelloSticky
        cart={cart}
        aperto={carrelloAperto}
        onToggle={() => setCarrelloAperto((v) => !v)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-componenti
// ────────────────────────────────────────────────────────────────────────────

function Chip({
  label,
  attivo,
  onClick,
  piccolo = false,
}: {
  label: string;
  attivo: boolean;
  onClick: () => void;
  piccolo?: boolean;
}) {
  const base = piccolo ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      onClick={onClick}
      className={`${base} rounded-full border-2 transition font-medium ${
        attivo
          ? 'bg-[#F5B800] border-[#F5B800] text-[#1A1A1A]'
          : 'bg-white border-[#E5E5E5] text-[#666] hover:border-[#F5B800] hover:text-[#1A1A1A]'
      }`}
    >
      {label}
    </button>
  );
}

function GruppoAccordion({
  titolo,
  icona: Icona,
  numVoci,
  aperto,
  evidenziato,
  onToggle,
  children,
}: {
  titolo: string;
  icona: typeof Wrench;
  numVoci: number;
  aperto: boolean;
  evidenziato?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden transition ${
        evidenziato
          ? 'bg-[#FFF8E7] border-[#F5B800]/50'
          : 'bg-white border-[#E5E5E5]'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFAFA] transition text-left"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            evidenziato ? 'bg-[#F5B800] text-[#1A1A1A]' : 'bg-[#F5B800]/10 text-[#F5B800]'
          }`}
        >
          <Icona className={`w-4 h-4 ${evidenziato ? 'fill-current' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="w-1/2 flex items-baseline justify-between gap-4">
            <span className="font-display text-base font-bold truncate">{titolo}</span>
            {evidenziato && (
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#F5B800] flex-shrink-0">
                Tutto incluso
              </span>
            )}
            <span className="text-sm text-[#999] flex-shrink-0">
              {numVoci} {numVoci === 1 ? 'voce' : 'voci'}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#999] transition-transform flex-shrink-0 ${aperto ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          aperto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#E5E5E5]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CardVoce({
  voce,
  qty,
  onAdd,
  onSub,
  evidenziato = false,
}: {
  voce: VoceIntervento;
  qty: number;
  onAdd: () => void;
  onSub: () => void;
  evidenziato?: boolean;
}) {
  return (
    <div
      className={`relative bg-white rounded-xl border p-3 transition flex flex-col ${
        qty > 0
          ? 'border-[#F5B800] shadow-sm'
          : evidenziato
            ? 'border-[#F5B800]/30 hover:border-[#F5B800]'
            : 'border-[#E5E5E5] hover:border-[#F5B800]/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[9px] font-mono uppercase tracking-wider text-[#999]">
          {voce.area}
        </div>
        <div className="font-display text-base font-bold text-[#F5B800] whitespace-nowrap leading-none">
          € {voce.prezzo}
          <span className="text-[10px] text-[#666] font-mono font-normal">/{voce.unita}</span>
        </div>
      </div>

      <h4 className="font-semibold text-sm text-[#1A1A1A] mb-1 leading-snug">{voce.voce}</h4>
      <p className="text-xs text-[#666] mb-3 flex-1 leading-snug">{voce.descrizione}</p>

      {qty === 0 ? (
        <button
          onClick={onAdd}
          className="w-full bg-[#1A1A1A] hover:bg-black text-white py-1.5 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </button>
      ) : (
        <div className="flex items-center justify-between bg-[#FFF8E7] rounded-full px-1.5 py-1">
          <button
            onClick={onSub}
            className="w-7 h-7 rounded-full bg-white border border-[#E5E5E5] hover:border-[#F5B800] flex items-center justify-center"
            aria-label="Diminuisci"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="font-bold text-sm text-[#1A1A1A]">
            {qty} <span className="text-[10px] text-[#666] font-normal">in carrello</span>
          </div>
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-full bg-[#F5B800] hover:bg-[#D9A200] flex items-center justify-center"
            aria-label="Aumenta"
          >
            <Plus className="w-3.5 h-3.5 text-[#1A1A1A]" />
          </button>
        </div>
      )}
    </div>
  );
}

function CarrelloSticky({
  cart,
  aperto,
  onToggle,
}: {
  cart: ReturnType<typeof useCart>;
  aperto: boolean;
  onToggle: () => void;
}) {
  const haVoci = cart.items.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#F5B800] shadow-2xl">
      {/* Pannello dettaglio carrello (collassabile) */}
      {aperto && haVoci && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 max-h-72 overflow-y-auto border-b border-[#E5E5E5]">
          <div className="space-y-2">
            {cart.items.map((item) => {
              const v = VOCE_BY_ID.get(item.voceId);
              if (!v) return null;
              const sub = v.prezzo * item.qty;
              return (
                <div
                  key={item.voceId}
                  className="flex items-center gap-3 py-2 border-b border-[#F0F0F0] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{v.voce}</div>
                    <div className="text-xs text-[#666]">
                      €{v.prezzo} × {item.qty} {v.unita} = <strong>€{sub}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cart.sottrai(item.voceId)}
                      className="w-7 h-7 rounded-full border border-[#E5E5E5] hover:border-[#F5B800] flex items-center justify-center"
                      aria-label="Diminuisci"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.qty}</span>
                    <button
                      onClick={() => cart.aggiungi(item.voceId)}
                      className="w-7 h-7 rounded-full bg-[#F5B800] hover:bg-[#D9A200] flex items-center justify-center"
                      aria-label="Aumenta"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => cart.rimuovi(item.voceId)}
                      className="w-7 h-7 rounded-full text-[#999] hover:text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                      aria-label="Rimuovi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {cart.items.length > 0 && (
            <button
              onClick={cart.svuota}
              className="text-xs text-[#999] hover:text-red-600 mt-3 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Svuota carrello
            </button>
          )}
        </div>
      )}

      {/* Barra principale */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
        <button
          onClick={onToggle}
          disabled={!haVoci}
          className="flex items-center gap-3 flex-1 min-w-0 disabled:cursor-default"
        >
          <div className="relative w-12 h-12 rounded-full bg-[#F5B800] flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-[#1A1A1A]" />
            {haVoci && (
              <span className="absolute -top-1 -right-1 bg-[#1A1A1A] text-[#F5B800] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cart.numVoci}
              </span>
            )}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
              {haVoci ? (aperto ? 'Tocca per chiudere' : 'Tocca per dettagli') : 'Carrello vuoto'}
            </div>
            <div className="font-display text-xl font-bold truncate">
              {haVoci ? `€ ${cart.totale.toFixed(2)}` : 'Aggiungi un intervento'}
            </div>
          </div>
        </button>

        <button
          onClick={() => scaricaPreventivo(cart.items, cart.totale)}
          disabled={!haVoci}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-black disabled:bg-[#E5E5E5] disabled:text-[#999] disabled:cursor-not-allowed text-white font-semibold px-4 sm:px-6 py-3 rounded-full text-sm transition"
          title={haVoci ? 'Scarica il preventivo come .txt' : 'Aggiungi almeno un intervento'}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Scarica preventivo</span>
        </button>
      </div>
    </div>
  );
}
