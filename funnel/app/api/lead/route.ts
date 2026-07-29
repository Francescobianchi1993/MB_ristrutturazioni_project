import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";
import type { LeadPayload } from "@/lib/types";

export const runtime = "nodejs";

// Validazione minima ma difensiva: l'API è pubblica, non fidarsi del client.
function validate(body: unknown): { ok: true; data: LeadPayload } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Payload non valido." };
  }
  const b = body as Record<string, unknown>;

  const nome = typeof b.nome === "string" ? b.nome.trim() : "";
  const telefono = typeof b.telefono === "string" ? b.telefono.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const mq = Number(b.mq);

  if (!nome) return { ok: false, error: "Il nome è obbligatorio." };
  if (!telefono) return { ok: false, error: "Il telefono è obbligatorio." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email non valida." };
  }
  if (b.consenso_privacy !== true) {
    return { ok: false, error: "Il consenso privacy è obbligatorio." };
  }
  if (!Number.isFinite(mq) || mq <= 0) {
    return { ok: false, error: "Metri quadri non validi." };
  }

  const toIntOrNull = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const toBoolOrNull = (v: unknown): boolean | null =>
    v === true || v === false ? v : null;
  const toStrOrNull = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length ? s : null;
  };

  const data: LeadPayload = {
    tipo_immobile: typeof b.tipo_immobile === "string" ? b.tipo_immobile : "",
    zona: typeof b.zona === "string" ? b.zona.trim() : "",
    indirizzo: toStrOrNull(b.indirizzo),
    mq: Math.round(mq),
    piano: toStrOrNull(b.piano),
    ascensore: toBoolOrNull(b.ascensore),
    locali: toIntOrNull(b.locali),
    bagni: toIntOrNull(b.bagni),
    stato: typeof b.stato === "string" ? b.stato : "",
    classe_energetica: toStrOrNull(b.classe_energetica),
    anno_costruzione: toIntOrNull(b.anno_costruzione),
    motivo_vendita: typeof b.motivo_vendita === "string" ? b.motivo_vendita : "",
    tempistica: typeof b.tempistica === "string" ? b.tempistica : "",
    prezzo_atteso: toIntOrNull(b.prezzo_atteso),
    nome,
    telefono,
    email,
    consenso_privacy: true,
    stima_min: toIntOrNull(b.stima_min) ?? 0,
    stima_max: toIntOrNull(b.stima_max) ?? 0,
  };

  return { ok: true, data };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error("[/api/lead] Supabase non configurato (env mancanti).");
    return NextResponse.json(
      { error: "Servizio momentaneamente non disponibile. Riprova più tardi." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("leads").insert(result.data);

  if (error) {
    console.error("[/api/lead] insert error:", error.message);
    return NextResponse.json(
      { error: "Non siamo riusciti a salvare la richiesta. Riprova." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
