# Funnel acquisizione lead — Vendi casa a Roma

Landing single-page mobile-first (Next.js App Router + TypeScript + Tailwind CSS)
per un'attività di **acquisto diretto di immobili a Roma** ("compriamo noi casa
tua, senza agenzia"). Ogni compilazione completata del form = un lead salvato su
Supabase.

> Progetto **autonomo**, contenuto nella cartella `funnel/`. Il resto del
> repository ospita il sito Vite di MB Ristrutturazioni ed è indipendente da
> questo funnel: si deployano come due progetti Vercel separati.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** (nessun component-kit pesante, solo SVG inline)
- **Supabase** per il salvataggio lead (via API route server-side)

## Struttura

```
funnel/
├─ app/
│  ├─ layout.tsx           # <html lang="it">, font Inter, metadata SEO
│  ├─ page.tsx             # landing: Hero → Come funziona → Perché conviene → Form → Footer
│  ├─ globals.css          # Tailwind + stili CTA/section
│  ├─ privacy/page.tsx     # informativa privacy placeholder (GDPR)
│  └─ api/lead/route.ts    # POST → validazione → insert su Supabase
├─ components/
│  ├─ Hero.tsx  ComeFunziona.tsx  PercheConviene.tsx  Footer.tsx
│  ├─ LeadForm.tsx         # cuore: form multi-step + progress bar + stima + thank-you
│  ├─ icons.tsx            # icone SVG inline (zero dipendenze)
│  └─ form/                # step, campi, StimaResult, ThankYou
├─ lib/
│  ├─ stima.ts             # lookup €/mq per zona + calcolo range ±10%
│  ├─ supabaseClient.ts    # client Supabase server-side
│  ├─ types.ts  contatti.ts
├─ supabase_leads.sql      # CREATE TABLE + RLS (vedi sotto)
└─ .env.example
```

## Setup locale

```bash
cd funnel
npm install
cp .env.example .env.local   # e compila le due variabili
npm run dev                  # http://localhost:3000
```

### Variabili d'ambiente

| Variabile                       | Descrizione                          |
| ------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del progetto Supabase            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (pubblica, sicura con RLS)  |

## Database Supabase

Esegui **una volta** lo script [`supabase_leads.sql`](./supabase_leads.sql) nel
SQL Editor di Supabase. In sintesi crea la tabella `leads` e abilita la RLS
concedendo ad `anon` **solo l'INSERT** (il form salva, ma i lead non sono
leggibili dal client pubblico).

```sql
create table if not exists public.leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  tipo_immobile      text,
  zona               text,
  indirizzo          text,
  mq                 int,
  piano              text,
  ascensore          boolean,
  locali             int,
  bagni              int,
  stato              text,
  classe_energetica  text,
  anno_costruzione   int,
  motivo_vendita     text,
  tempistica         text,
  prezzo_atteso      int,
  nome               text,
  telefono           text,
  email              text,
  consenso_privacy   boolean,
  stima_min          int,
  stima_max          int
);

alter table public.leads enable row level security;

create policy "leads_insert_anon"
  on public.leads for insert
  to anon, authenticated
  with check (true);
```

## Deploy su Vercel

Poiché il funnel vive in una sottocartella, imposta la **Root Directory** del
progetto Vercel su `funnel/`:

1. Importa il repository su Vercel → **New Project**.
2. In *Settings → General → Root Directory* seleziona `funnel`.
3. Framework: **Next.js** (rilevato in automatico).
4. Aggiungi le due Environment Variables sopra.
5. Deploy.

## Note sulla stima

La stima mostrata dopo l'invio è **puramente indicativa e non vincolante**:
`mq × €/mq(zona) × moltiplicatore(stato)`, con range ±10%. I valori €/mq sono
hardcoded in [`lib/stima.ts`](./lib/stima.ts) e vanno tarati sui dati reali.

Il claim di convenienza economica è sempre ancorato allo scenario di **vendita
rapida** (azzeramento di commissioni, tempi morti e incertezza), mai alla
vendita a prezzo pieno sui tempi lunghi del mercato.

## Da personalizzare prima del go-live

- `[NOME ATTIVITÀ]` e `[P.IVA]` in `components/Footer.tsx`
- Numero di telefono in `lib/contatti.ts`
- Testo dell'informativa in `app/privacy/page.tsx`
- Valori €/mq per zona in `lib/stima.ts`
