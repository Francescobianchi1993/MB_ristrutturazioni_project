/**
 * Catalogo interventi puntuali — prezzario reale MB (area Roma).
 *
 * Generato dal listino fornito (Idraulica → idro, Elettrica → elettrico).
 * Le voci 'Accessorie' (diritti di chiamata, maggiorazioni) NON sono interventi
 * selezionabili: il supplemento urgenza +30% è gestito nel wizard.
 *
 * Prezzo = manodopera indicativa; vedi `note` per cosa è incluso/escluso.
 */

export type CategoriaIntervento = 'idro' | 'elettrico';

export interface VoceIntervento {
  id: number;
  voce: string;
  categoria: CategoriaIntervento;
  prezzo: number;
  unita: string;
  note: string;
}

export const VOCI_INTERVENTO: VoceIntervento[] = [
  // ── IDRO
  { id: 1001, voce: "Sostituzione rubinetto lavabo", categoria: "idro", prezzo: 80, unita: "cad.", note: "Solo manodopera. Rubinetto e flessibili esclusi dal prezzo." },
  { id: 1002, voce: "Sostituzione rubinetto cucina", categoria: "idro", prezzo: 80, unita: "cad.", note: "Solo manodopera. Rubinetto escluso." },
  { id: 1003, voce: "Sostituzione miscelatore lavabo o cucina", categoria: "idro", prezzo: 90, unita: "cad.", note: "Solo manodopera. Miscelatore escluso." },
  { id: 1004, voce: "Riparazione rubinetto che perde o gocciola", categoria: "idro", prezzo: 50, unita: "cad.", note: "Riparazione base. Eventuali pezzi di ricambio esclusi." },
  { id: 1005, voce: "Sostituzione cartuccia miscelatore", categoria: "idro", prezzo: 60, unita: "cad.", note: "Solo manodopera. Cartuccia di ricambio esclusa." },
  { id: 1006, voce: "Sostituzione guarnizioni rubinetti", categoria: "idro", prezzo: 40, unita: "cad.", note: "Piccola minuteria (guarnizioni standard) inclusa nel prezzo." },
  { id: 1007, voce: "Sostituzione sifone lavabo o bidet", categoria: "idro", prezzo: 70, unita: "cad.", note: "Solo manodopera. Sifone escluso." },
  { id: 1008, voce: "Sostituzione flessibili acqua", categoria: "idro", prezzo: 60, unita: "cad.", note: "Solo manodopera. Coppia di flessibili esclusa." },
  { id: 1009, voce: "Riparazione perdita sotto lavello", categoria: "idro", prezzo: 80, unita: "cad.", note: "Solo manodopera. Esclusi tubi o raccordi sostituitivi." },
  { id: 1010, voce: "Riparazione perdita cucina", categoria: "idro", prezzo: 90, unita: "cad.", note: "Manodopera per ricerca e sigillatura rapida. Ricambi esclusi." },
  { id: 1011, voce: "Riparazione perdita bagno", categoria: "idro", prezzo: 100, unita: "cad.", note: "Manodopera per intervento mirato. Ricambi esclusi." },
  { id: 1012, voce: "Ricerca perdita visibile", categoria: "idro", prezzo: 80, unita: "a corpo", note: "Solo diagnosi visiva e localizzazione. Intervento di ripristino escluso." },
  { id: 1013, voce: "Ricerca perdita occulta", categoria: "idro", prezzo: 250, unita: "a corpo", note: "Tariffa base per ricerca con strumentazione. Riparazione esclusa." },
  { id: 1014, voce: "Riparazione tubo con piccolo tratto", categoria: "idro", prezzo: 120, unita: "cad.", note: "Include materiali di consumo base (es. manicotto o pezzo di tubo)." },
  { id: 1015, voce: "Sostituzione raccordi e giunzioni", categoria: "idro", prezzo: 70, unita: "cad.", note: "Solo manodopera. Raccordi specifici esclusi." },
  { id: 1016, voce: "Disostruzione lavandino cucina", categoria: "idro", prezzo: 90, unita: "cad.", note: "Intervento meccanico/chimico standard. Prodotti inclusi." },
  { id: 1017, voce: "Disostruzione lavandino bagno", categoria: "idro", prezzo: 80, unita: "cad.", note: "Intervento standard con attrezzatura leggera." },
  { id: 1018, voce: "Disostruzione doccia", categoria: "idro", prezzo: 90, unita: "cad.", note: "Intervento meccanico standard dello scarico." },
  { id: 1019, voce: "Disostruzione bidet", categoria: "idro", prezzo: 80, unita: "cad.", note: "Intervento meccanico standard dello scarico." },
  { id: 1020, voce: "Disostruzione colonna scarico", categoria: "idro", prezzo: 180, unita: "cad.", note: "Uso di attrezzatura specifica (es. sonda idrodinamica)." },
  { id: 1021, voce: "Disostruzione WC", categoria: "idro", prezzo: 100, unita: "cad.", note: "Intervento standard senza smontaggio del sanitario." },
  { id: 1022, voce: "Riparazione cassetta WC", categoria: "idro", prezzo: 80, unita: "cad.", note: "Solo manodopera. Meccanismi interni di ricambio esclusi." },
  { id: 1023, voce: "Sostituzione galleggiante cassetta WC", categoria: "idro", prezzo: 70, unita: "cad.", note: "Solo manodopera. Galleggiante escluso." },
  { id: 1024, voce: "Sostituzione pulsante cassetta WC", categoria: "idro", prezzo: 50, unita: "cad.", note: "Solo manodopera. Pulsante o placca di comando esclusi." },
  { id: 1025, voce: "Sostituzione flessibile cassetta WC", categoria: "idro", prezzo: 50, unita: "cad.", note: "Solo manodopera. Tubo flessibile escluso." },
  { id: 1026, voce: "Sostituzione sedile WC", categoria: "idro", prezzo: 40, unita: "cad.", note: "Solo manodopera. Tavoletta/sedile WC escluso." },
  { id: 1027, voce: "Sostituzione WC", categoria: "idro", prezzo: 150, unita: "cad.", note: "Solo manodopera. Sanitario, fissaggi e guarnizioni esclusi." },
  { id: 1028, voce: "Sostituzione bidet", categoria: "idro", prezzo: 130, unita: "cad.", note: "Solo manodopera. Sanitario escluso." },
  { id: 1029, voce: "Sostituzione lavabo", categoria: "idro", prezzo: 140, unita: "cad.", note: "Solo manodopera. Lavabo ed eventuale colonna esclusi." },
  { id: 1030, voce: "Sostituzione piletta lavabo o bidet", categoria: "idro", prezzo: 60, unita: "cad.", note: "Solo manodopera. Meccanismo piletta 'click-clack' o saltarello escluso." },
  { id: 1031, voce: "Sostituzione piatto doccia", categoria: "idro", prezzo: 250, unita: "cad.", note: "Solo manodopera. Piatto doccia e materiali edili di posa esclusi." },
  { id: 1032, voce: "Sostituzione box doccia", categoria: "idro", prezzo: 180, unita: "cad.", note: "Solo manodopera. Struttura del box doccia esclusa." },
  { id: 1033, voce: "Sostituzione vasca", categoria: "idro", prezzo: 400, unita: "cad.", note: "Solo manodopera. Vasca da bagno esclusa (opere murarie a parte)." },
  { id: 1034, voce: "Installazione lavatrice", categoria: "idro", prezzo: 60, unita: "cad.", note: "Allacciamento a impianti predisposti. Esclusi tubi aggiuntivi." },
  { id: 1035, voce: "Installazione lavastoviglie", categoria: "idro", prezzo: 70, unita: "cad.", note: "Allacciamento e incasso. Esclusi kit di fissaggio particolari." },
  { id: 1036, voce: "Installazione scaldabagno elettrico", categoria: "idro", prezzo: 140, unita: "cad.", note: "Solo manodopera. Scaldabagno e valvole di sicurezza esclusi." },
  { id: 1037, voce: "Sostituzione scaldabagno elettrico", categoria: "idro", prezzo: 160, unita: "cad.", note: "Manodopera per smontaggio vecchio e posa nuovo. Apparecchio escluso." },
  { id: 1038, voce: "Sostituzione valvole di intercettazione", categoria: "idro", prezzo: 90, unita: "cad.", note: "Solo manodopera. Chiave d'arresto o valvola esclusa." },
  { id: 1039, voce: "Sostituzione tubi di carico e scarico", categoria: "idro", prezzo: 80, unita: "cad.", note: "Solo manodopera. Tubazioni escluse." },
  { id: 1040, voce: "Spurgo e pulizia scarichi", categoria: "idro", prezzo: 150, unita: "cad.", note: "Lavaggio chimico o ad alta pressione. Liquidi/prodotti inclusi." },
  { id: 1041, voce: "Ripristino pressione acqua", categoria: "idro", prezzo: 70, unita: "a corpo", note: "Diagnosi e regolazione (es. su riduttore). Eventuali ricambi esclusi." },
  { id: 1042, voce: "Intervento per allagamento da perdita", categoria: "idro", prezzo: 150, unita: "a corpo", note: "Messa in sicurezza e aspirazione acqua. Riparazioni escluse." },
  { id: 1043, voce: "Sopralluogo e diagnosi impianto idraulico", categoria: "idro", prezzo: 50, unita: "a corpo", note: "Tariffa fissa per analisi tecnica, assorbita in caso di lavori." },
  // ── ELETTRICO
  { id: 2001, voce: "Sostituzione presa elettrica", categoria: "elettrico", prezzo: 35, unita: "punto", note: "Prezzo base per singolo punto. Frutto (presa) escluso." },
  { id: 2002, voce: "Sostituzione presa schuko", categoria: "elettrico", prezzo: 35, unita: "punto", note: "Solo manodopera. Presa Schuko esclusa." },
  { id: 2003, voce: "Sostituzione interruttore", categoria: "elettrico", prezzo: 35, unita: "punto", note: "Solo manodopera. Interruttore (frutto) escluso." },
  { id: 2004, voce: "Sostituzione deviatori o invertitori", categoria: "elettrico", prezzo: 40, unita: "punto", note: "Solo manodopera. Componente elettrico escluso." },
  { id: 2005, voce: "Sostituzione pulsante luce", categoria: "elettrico", prezzo: 35, unita: "punto", note: "Solo manodopera. Pulsante escluso." },
  { id: 2006, voce: "Sostituzione placche e frutti", categoria: "elettrico", prezzo: 25, unita: "punto", note: "Solo manodopera. Supporto, frutti e placca estetica esclusi." },
  { id: 2007, voce: "Riparazione presa allentata o bruciata", categoria: "elettrico", prezzo: 45, unita: "punto", note: "Sistemazione cablaggio. Se da sostituire, il pezzo è escluso." },
  { id: 2008, voce: "Riparazione interruttore guasto", categoria: "elettrico", prezzo: 45, unita: "punto", note: "Ripristino contatti. Componente nuovo escluso." },
  { id: 2009, voce: "Sostituzione punto luce", categoria: "elettrico", prezzo: 40, unita: "punto", note: "Solo manodopera. Portalampada o corpo illuminante escluso." },
  { id: 2010, voce: "Sostituzione lampadario o plafoniera", categoria: "elettrico", prezzo: 60, unita: "cad.", note: "Smontaggio e montaggio. Lampadario/tasselli speciali esclusi." },
  { id: 2011, voce: "Installazione plafoniera", categoria: "elettrico", prezzo: 50, unita: "cad.", note: "Solo manodopera. Plafoniera e lampadine escluse." },
  { id: 2012, voce: "Installazione lampada da interno", categoria: "elettrico", prezzo: 50, unita: "cad.", note: "Solo manodopera. Corpo illuminante escluso." },
  { id: 2013, voce: "Sostituzione differenziale", categoria: "elettrico", prezzo: 90, unita: "cad.", note: "Solo manodopera. Componente salvavita escluso." },
  { id: 2014, voce: "Sostituzione magnetotermico", categoria: "elettrico", prezzo: 70, unita: "cad.", note: "Solo manodopera. Interruttore magnetotermico escluso." },
  { id: 2015, voce: "Sostituzione salvavita", categoria: "elettrico", prezzo: 90, unita: "cad.", note: "Solo manodopera. Dispositivo salvavita escluso." },
  { id: 2016, voce: "Ripristino quadro elettrico", categoria: "elettrico", prezzo: 120, unita: "a corpo", note: "Manodopera per cablaggio e serraggio. Componenti esclusi." },
  { id: 2017, voce: "Sostituzione quadro elettrico piccolo", categoria: "elettrico", prezzo: 250, unita: "cad.", note: "Solo manodopera. Centralino e interruttori DIN esclusi." },
  { id: 2018, voce: "Verifica scatto differenziale", categoria: "elettrico", prezzo: 50, unita: "a corpo", note: "Test strumentale di efficienza del salvavita. Nessun pezzo incluso." },
  { id: 2019, voce: "Riparazione corto circuito", categoria: "elettrico", prezzo: 120, unita: "a corpo", note: "Ricerca e isolamento del corto. Eventuali cavi nuovi esclusi." },
  { id: 2020, voce: "Ricerca guasto linea elettrica", categoria: "elettrico", prezzo: 90, unita: "a corpo", note: "Solo individuazione del problema alla linea. Riparazione esclusa." },
  { id: 2021, voce: "Riparazione linea presa", categoria: "elettrico", prezzo: 100, unita: "a corpo", note: "Manodopera per ripristino continuità. Materiali esclusi." },
  { id: 2022, voce: "Riparazione linea luce", categoria: "elettrico", prezzo: 90, unita: "a corpo", note: "Manodopera per ripristino isolamento/continuità. Cavi esclusi." },
  { id: 2023, voce: "Aggiunta presa elettrica", categoria: "elettrico", prezzo: 65, unita: "punto", note: "Creazione nuovo punto su cassetta esistente. Componenti esclusi." },
  { id: 2024, voce: "Aggiunta punto luce", categoria: "elettrico", prezzo: 60, unita: "punto", note: "Cablaggio nuovo punto luce. Escluso corpo illuminante." },
  { id: 2025, voce: "Aggiunta interruttore", categoria: "elettrico", prezzo: 55, unita: "punto", note: "Inserimento nuovo comando su scatola esistente. Frutto escluso." },
  { id: 2026, voce: "Spostamento presa", categoria: "elettrico", prezzo: 70, unita: "punto", note: "Manodopera per passaggio cavi (escluse opere murarie/tracce)." },
  { id: 2027, voce: "Spostamento punto luce", categoria: "elettrico", prezzo: 65, unita: "punto", note: "Allungamento/spostamento linea. Escluse opere murarie." },
  { id: 2028, voce: "Cablaggio nuovo punto elettrico", categoria: "elettrico", prezzo: 75, unita: "punto", note: "Solo infilaggio cavi e collegamento. Cavi e frutti esclusi." },
  { id: 2029, voce: "Sostituzione cavo danneggiato", categoria: "elettrico", prezzo: 60, unita: "cad.", note: "Manodopera per sfilaggio e infilaggio. Cavo elettrico escluso." },
  { id: 2030, voce: "Ripristino contatto elettrico", categoria: "elettrico", prezzo: 45, unita: "cad.", note: "Pulizia contatti e serraggio morsetti. Materiali inclusi." },
  { id: 2031, voce: "Sostituzione timer o relè semplice", categoria: "elettrico", prezzo: 65, unita: "cad.", note: "Solo manodopera. Relè o temporizzatore escluso." },
  { id: 2032, voce: "Installazione campanello", categoria: "elettrico", prezzo: 70, unita: "cad.", note: "Solo manodopera. Suoneria o ronzatore esclusi." },
  { id: 2033, voce: "Sostituzione citofono interno base", categoria: "elettrico", prezzo: 80, unita: "cad.", note: "Solo manodopera. Apparecchio citofonico escluso." },
  { id: 2034, voce: "Verifica messa a terra", categoria: "elettrico", prezzo: 100, unita: "a corpo", note: "Controllo con strumento dell'impianto di terra dell'appartamento." },
  { id: 2035, voce: "Sopralluogo e diagnosi impianto elettrico", categoria: "elettrico", prezzo: 50, unita: "a corpo", note: "Tariffa fissa per ispezione, assorbita in caso di lavori." },
];

/**
 * Sinonimi colloquiali per la ricerca: se l'utente digita uno dei termini
 * comuni (es. "vaso"), il filtro mostra tutte le voci il cui nome contiene la
 * `chiave` tecnica corrispondente (es. "wc"). Così chi cerca col linguaggio di
 * tutti i giorni trova comunque l'intervento giusto. La `chiave` va scritta in
 * minuscolo e deve comparire nel nome delle voci di listino.
 */
export const SINONIMI_INTERVENTO: { chiave: string; sinonimi: string[] }[] = [
  // ── IDRO
  { chiave: 'wc', sinonimi: ['vaso', 'water', 'tazza', 'gabinetto', 'cesso', 'sciacquone', 'turca', 'tazza del bagno'] },
  { chiave: 'cassetta', sinonimi: ['sciacquone', 'scarico del water', 'scarico wc', 'cassetta del bagno'] },
  { chiave: 'scaldabagno', sinonimi: ['boiler', 'scaldino', 'scaldaacqua', 'scalda acqua', 'scalda-acqua'] },
  { chiave: 'disostruzione', sinonimi: ['intasato', 'otturato', 'ingorgo', 'tappato', 'stappare', 'non scarica', 'scarico lento', 'ostruito', 'turato'] },
  { chiave: 'lavabo', sinonimi: ['lavandino', 'lavello', 'lavabo bagno'] },
  { chiave: 'lavandino', sinonimi: ['lavabo', 'lavello', 'lavandino cucina'] },
  { chiave: 'rubinetto', sinonimi: ['cannella', 'miscelatore', 'gocciola', 'perde acqua', 'rubinetteria'] },
  { chiave: 'miscelatore', sinonimi: ['rubinetto', 'monocomando'] },
  { chiave: 'sifone', sinonimi: ['curva sotto il lavandino', 'tubo a s', 'sotto lavabo'] },
  { chiave: 'vasca', sinonimi: ['vasca da bagno', 'tinozza'] },
  { chiave: 'doccia', sinonimi: ['box doccia', 'piatto doccia', 'cabina doccia'] },
  { chiave: 'lavatrice', sinonimi: ['lavabiancheria'] },
  { chiave: 'perdita', sinonimi: ['perde acqua', 'gocciola', 'infiltrazione', 'allagamento', 'goccia', 'fuoriuscita'] },
  { chiave: 'bidet', sinonimi: ['bide', 'bidè'] },
  { chiave: 'flessibil', sinonimi: ['tubo flessibile', 'tubicino acqua'] },
  // ── ELETTRICO
  { chiave: 'presa', sinonimi: ['spina', 'presa corrente', 'presa di corrente', 'ciabatta', 'attacco corrente'] },
  { chiave: 'schuko', sinonimi: ['presa tedesca', 'presa grande', 'presa schuko'] },
  { chiave: 'interruttore', sinonimi: ['tasto luce', 'pulsante della luce', 'tasto della luce', 'deviatore', 'accendere la luce'] },
  { chiave: 'punto luce', sinonimi: ['luce', 'lampadina', 'attacco luce', 'portalampada'] },
  { chiave: 'lampadario', sinonimi: ['luce', 'lampadina', 'lampada a soffitto'] },
  { chiave: 'plafoniera', sinonimi: ['luce', 'lampada a soffitto', 'faretto'] },
  { chiave: 'lampada', sinonimi: ['luce', 'lampadina', 'faretto', 'applique', 'abat jour'] },
  { chiave: 'salvavita', sinonimi: ['differenziale', 'salva vita', 'interruttore generale', 'salta la corrente', 'salta il contatore', 'va via la luce', 'va via la corrente'] },
  { chiave: 'differenziale', sinonimi: ['salvavita', 'salva vita', 'interruttore generale', 'salta la corrente'] },
  { chiave: 'magnetotermico', sinonimi: ['salvavita', 'interruttore generale', 'salta la corrente', 'automatico'] },
  { chiave: 'quadro', sinonimi: ['centralino', 'contatore', 'quadro elettrico', 'quadretto'] },
  { chiave: 'corto circuito', sinonimi: ['corto', 'cortocircuito', 'scintilla', 'scoppio'] },
  { chiave: 'citofono', sinonimi: ['interfono', 'videocitofono', 'apriporta'] },
  { chiave: 'campanello', sinonimi: ['suoneria', 'ronzatore', 'campanello di casa'] },
  { chiave: 'messa a terra', sinonimi: ['terra', 'scarica a terra', 'impianto di terra'] },
  { chiave: 'cavo', sinonimi: ['filo', 'filo elettrico', 'cavetto'] },
  { chiave: 'timer', sinonimi: ['temporizzatore', 'rele', 'relè'] },
];
