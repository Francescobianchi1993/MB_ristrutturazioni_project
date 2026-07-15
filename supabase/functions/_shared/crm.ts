// deno-lint-ignore-file no-explicit-any
/**
 * CRM leggero del sito MB: registra un CONTATTO unico (dedup per email) e una sua
 * ATTIVITÀ nello storico (tabelle mb_contatti / mb_attivita).
 *
 * Obiettivo: NON duplicare il contatto ma tenere traccia di OGNI preventivo/azione
 * (data-ora + contenuto) per uso marketing. Best-effort: se qualcosa fallisce NON
 * deve far fallire l'azione principale (email, salvataggio lead) — logga e basta.
 */

export interface AttivitaInput {
  email?: string | null;
  nome?: string | null;
  telefono?: string | null;
  /** 'pdf' | 'sopralluogo' | 'certificazione' | 'contatto' */
  tipo: string;
  /** Contenuto dell'attività (totale, interventi, mq…). */
  dettaglio?: Record<string, unknown>;
  /** Firma stabile del contenuto: deduplica la STESSA attività ripetuta (stessa
   *  stima riscaricata → conteggio++). Se assente, l'attività è sempre inserita. */
  firma?: string | null;
}

export async function registraAttivita(supabase: any, input: AttivitaInput): Promise<void> {
  try {
    const email = (input.email ?? '').trim().toLowerCase();
    if (!email) return; // senza email non possiamo deduplicare il contatto: saltiamo il CRM
    const nowISO = new Date().toISOString();

    // 1) Contatto: upsert per email (tiene gli ultimi nome/telefono noti).
    const { data: c, error: cErr } = await supabase
      .from('mb_contatti')
      .upsert(
        { email, nome: input.nome || null, telefono: input.telefono || null, updated_at: nowISO },
        { onConflict: 'email' },
      )
      .select('id')
      .single();
    if (cErr || !c?.id) {
      console.error('[crm] upsert contatto fallito:', cErr?.message);
      return;
    }
    const contattoId = c.id as string;

    // 2) Attività: con firma → deduplichiamo (stessa attività ripetuta aggiorna
    //    ultima_volta e conteggio); senza firma → inseriamo sempre.
    const firma = (input.firma ?? '').trim() || null;
    const dettaglio = input.dettaglio ?? {};
    if (firma) {
      const { data: esist } = await supabase
        .from('mb_attivita')
        .select('id, conteggio')
        .eq('contatto_id', contattoId)
        .eq('tipo', input.tipo)
        .eq('firma', firma)
        .maybeSingle();
      if (esist?.id) {
        await supabase
          .from('mb_attivita')
          .update({ ultima_volta: nowISO, conteggio: (esist.conteggio ?? 1) + 1, dettaglio })
          .eq('id', esist.id);
      } else {
        await supabase.from('mb_attivita').insert({ contatto_id: contattoId, tipo: input.tipo, firma, dettaglio });
      }
    } else {
      await supabase.from('mb_attivita').insert({ contatto_id: contattoId, tipo: input.tipo, dettaglio });
    }
  } catch (e) {
    console.error('[crm] registraAttivita errore:', e instanceof Error ? e.message : String(e));
  }
}

/** Firma stabile per le attività col preventivo (dedup della stessa stima). */
export function firmaStima(d: { totale?: unknown; interventi?: unknown; mq?: unknown }): string {
  const tot = Number(d.totale) || 0;
  const interventi = Array.isArray(d.interventi) ? [...d.interventi].map(String).sort().join('|') : '';
  const mq = d.mq != null ? String(d.mq) : '';
  return `${tot}~${mq}~${interventi}`;
}
