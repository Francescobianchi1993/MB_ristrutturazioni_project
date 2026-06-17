import { HelpCircle, Phone } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TEL_DISPLAY, TEL_HREF } from '@/lib/contatti';

interface Faq {
  domanda: string;
  risposta: string;
}

/**
 * Bozza FAQ — coerente con il flusso di prenotazione e le condizioni del sito.
 * Da rivedere con MB prima del go-live (es. modalità di pagamento effettive).
 */
const FAQS: Faq[] = [
  {
    domanda: 'In quali zone intervenite?',
    risposta:
      'Operiamo su Roma e provincia, indicativamente entro 40 km dal centro. Se il tuo indirizzo è fuori da questa zona puoi comunque prenotare: ti ricontattiamo per valutare la fattibilità dell’intervento.',
  },
  {
    domanda: 'Il sopralluogo è davvero gratuito?',
    risposta:
      'Sì. Il sopralluogo è gratuito e senza impegno: veniamo da te, valutiamo il lavoro e ti diamo un preventivo chiaro prima di iniziare qualsiasi attività.',
  },
  {
    domanda: 'Il costo della chiamata o dell’uscita è incluso?',
    risposta:
      'Sì, nel prezzo dell’intervento è sempre incluso il costo della chiamata. Non ci sono sorprese in fattura per il diritto di chiamata.',
  },
  {
    domanda: 'I prezzi indicati sul sito sono definitivi?',
    risposta:
      'Sono una stima orientativa basata sul nostro listino. Il costo definitivo viene confermato dopo il sopralluogo gratuito, in base alla situazione reale e ai materiali necessari (spesso esclusi dalla sola manodopera).',
  },
  {
    domanda: 'Come funziona l’urgenza alta?',
    risposta:
      'Scegliendo urgenza alta hai la priorità in agenda e interveniamo il prima possibile. A questa priorità si applica un supplemento del 30% sul totale dell’intervento.',
  },
  {
    domanda: 'Non trovo il mio problema nella lista degli interventi. Cosa faccio?',
    risposta:
      'Nello step di selezione trovi il box “Non trovi la voce per il tuo problema?”: descrivi lì la situazione e completa la prenotazione. Ti comunichiamo il prezzo della richiesta personalizzata via WhatsApp o email.',
  },
  {
    domanda: 'Come ricevo la conferma della prenotazione?',
    risposta:
      'Dopo aver prenotato ricevi automaticamente una conferma via email con il riepilogo dell’appuntamento (tipo di intervento, giorno e ora). Per questo l’email è obbligatoria; nome e telefono ci servono per ricontattarti.',
  },
  {
    domanda: 'Posso modificare o disdire l’appuntamento?',
    risposta:
      'Sì, in autonomia: nell’email di conferma trovi i pulsanti “Sposta appuntamento” e “Annulla appuntamento”. Con “Sposta” scegli un nuovo giorno e orario tra quelli liberi in agenda e l’appuntamento si aggiorna da solo; con “Annulla” lo cancelli (e puoi riprenotare quando vuoi). Un po’ di preavviso non è obbligatorio, ma è una cortesia molto apprezzata e ci aiuta a riorganizzare l’agenda.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-[#FAFAFA] scroll-mt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[#F5B800] font-semibold text-sm uppercase tracking-wider mb-4">
            <div className="w-8 h-0.5 bg-[#F5B800]" />
            Domande frequenti
            <div className="w-8 h-0.5 bg-[#F5B800]" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
            Le risposte alle <span className="text-[#F5B800]">domande più comuni</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="bg-white rounded-3xl border-2 border-[#E5E5E5] px-5 sm:px-7">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-[#E5E5E5]">
              <AccordionTrigger className="text-base sm:text-lg font-semibold text-[#1A1A1A] hover:no-underline py-5">
                <span className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#F5B800] flex-shrink-0 mt-0.5" />
                  {faq.domanda}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-[#555] text-[15px] leading-relaxed pl-8">
                {faq.risposta}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10 text-center">
          <p className="text-[#666] mb-4">Non hai trovato quello che cercavi?</p>
          <a
            href={TEL_HREF}
            className="inline-flex items-center gap-2 bg-[#1A1A1A] hover:bg-black text-white font-semibold px-7 py-3.5 rounded-full text-sm transition"
          >
            <Phone className="w-4 h-4 text-[#F5B800]" /> Chiamaci: {TEL_DISPLAY}
          </a>
        </div>
      </div>
    </section>
  );
}
