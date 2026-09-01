# Arkitekturoversikt — Internt Dashboard

*Notat fra arkitekturdiskusjon, oppdatert 01.09.2026*

---

## 1. Beslutninger tatt så langt

| Område | Beslutning | Begrunnelse |
|---|---|---|
| Kjernekonsept | **Workspaces** (student / ENK / job) | Full kontekst-separasjon: egne prosjekter, egen datatilgang, egne integrasjoner per workspace |
| Multi-tenancy | Bygges inn fra dag én selv om du er eneste bruker | `workspace_members`-tabell med rolle, ikke bruker-eid workspace — billig nå, dyrt å ettermontere |
| Auth | Supabase Auth | Innebygd i databaseplattformen, integrerer direkte med RLS-policies via `auth.uid()` |
| Database | Supabase (administrert Postgres) | Erstatter selvhostet Postgres — gir RLS, Auth og Storage i samme plattform |
| Hosting | Vercel | Erstatter Coolify/Hetzner for dette prosjektet — native Next.js-støtte, ingen egen Dockerfile/Nginx-oppsett nødvendig |
| AI-chat plassering | Globalt dokket panel, alltid tilgjengelig (spesielt fremhevet på forsiden) | Skal fungere uansett hvor i appen du er, ikke bundet til én side |
| AI-chat datatilgang | Scopet til aktivt workspace (kun de MCP-verktøyene workspace-et har tilgang til) | Hindrer krysskontaminering — job-data skal ikke lekke inn i ENK-samtaler |
| Betaling for AI | **BYOK** — hver bruker legger inn egen Anthropic API-nøkkel, kryptert lagret | Mint Media betaler ikke; Claude.ai-abonnement (Pro/Max) kan ikke brukes i tredjepartsapp — forbudt av Anthropic siden januar 2026 |
| Skrivehandlinger fra AI | "Pending action"-konsept — bekreftelseskort før noe sendes/endres eksternt | Nødvendig siden Intercoms offisielle MCP stort sett er lesefokusert, og fordi skrivehandlinger er irreversible |
| Timetracking | Egen entitet koblet til task, global "recording"-indikator i header | Skal være synlig uansett workspace du befinner deg i akkurat da |
| Integrasjoner | Koblet til `workspace_id`, ikke `user_id` | Job-workspace sin Intercom-tilgang tilhører workspace-et, ikke deg personlig |

---

## 2. Hva skjermbildene (Synchro) forteller oss om innhold

Går vi gjennom referansebildene systematisk, avslører de langt flere funksjonsområder enn det vi har diskutert eksplisitt. Dette er verdt å ta stilling til nå — ikke fordi alt skal bygges i fase 1, men fordi det påvirker datamodellen:

| UI-element i bildene | Hva det impliserer i datamodellen | Prioritet |
|---|---|---|
| Sidebar: Dashboard, My Task, Inbox, Reporting, Portfolio, Accounts, Goals | Egne moduler/ruter — «Inbox» og «Reporting» er ikke bare visninger, de er egne datakilder (notifications, aggregert historikk) | Inbox: nå · Reporting: senere |
| "5" på Inbox | Et **notification**-system med ulest/lest-state, sannsynligvis trigget av MCP-hendelser (ny Intercom-samtale, prosjekt tildelt deg) | Nå (kjernefunksjon) |
| Favoritter i sidebar (stjernemerkede prosjekter/visninger) | En enkel `user_favorites`-kobling (user_id → entity_id) | Senere, billig å legge til |
| Søkefelt i header | Fritekstsøk på tvers av prosjekter — start med Postgres full-text search, vurder Meilisearch/Typesense kun om det blir treigt | Nå, enkel versjon |
| Del-knapp + varslingsbjelle + team-avatarer + "Invite" | Antyder deling/synlighet **utover** deg selv — bekrefter at multi-bruker-tenkningen fra før er riktig | Arkitektur nå, funksjon senere |
| "3 min ago" ved siden av header | Sist synkronisert-tidsstempel — relevant hvis dashbordet cacher data fra MCP-kilder i stedet for å hente live hver gang | Nå (påvirker cache-strategi) |
| Quick actions: **Send a invoice, Draft a Proposal, Create a contract, Add a form** | Dette er reelt CRM/faktura-funksjonalitet — kobler til ENK-workspace-et ditt og trolig Tripletex-flyten du allerede har | Egen vurdering — se pkt. 5 |
| Stats-kort (Total Projects, Total Task, In Progress, Completed) | Aggregerte tellinger — bør være **materialiserte** (regnet ut og lagret), ikke live COUNT-spørringer for hvert dashbord-load | Nå, enkel |
| Time-Based Activity Map (gantt-linje med "nå"-markør) | Krever start/slutt-tidspunkt per task, ikke bare due date — dette er en egen datastruktur fra timetracking | Vurder om dette er samme data som timetracking eller separat "planlagt tid" |
| Prosjektkort: priority-badge, progress-bar, assignee-avatarer, kommentar-/lenke-count | `tasks`-tabellen trenger `priority`, `progress` (enten manuelt satt eller utledet fra subtasks), multi-assignee-relasjon | Nå |
| Milestone Tracker (Target vs. Actual, med tidsspenn-toggle) | Egen `milestones`-tabell med target-verdi og faktisk fremdrift over tid — historiske datapunkter, ikke bare nåværende state | Senere (krever historikk å vise noe meningsfullt) |
| Activity-feed | Generisk append-only hendelseslogg (`activity_log`) — driver både "Activity"-panelet og senere audit-trail for AI-handlinger | Nå — bygg denne tidlig, den er billig og gir deg audit-logging gratis |
| Upcoming Meeting-kort | Kalenderintegrasjon (Outlook/Teams, som du så for deg i det gamle systemet) — egen integrasjon per workspace | Senere, egen MCP/integrasjon |
| Task-detaljmodal: tags, status, due date, kommentartråd med filvedlegg, collaborators | Kommentarer trenger fil-vedlegg → **objektlagring** (se pkt. 5), trådet kommentarstruktur, `tags` som egen relasjon (many-to-many) | Nå for kommentarer, filvedlegg kan komme etterpå |

**Kort oppsummert**: Synchro-referansen viser at et "enkelt internt dashbord" fort drar med seg CRM (fakturering, kontrakter), notifikasjoner, søk, kalender og fil-lagring. Det er ikke noe galt i det — men det er verdt å bevisst velge hva som er **fase 1** vs. noe du bygger arkitekturen åpen for.

---

## 3. Systemarkitektur — lagdeling

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js App Router + shadcn/ui)                  │
│  /w/[workspace]/dashboard, /projects, /tasks, /settings      │
│  ├─ Global layout: AI-chat dock + timer-widget + workspace-  │
│  │  switcher (rendres UTENFOR workspace-routingen)           │
│  └─ Server actions / fetch mot API-laget under               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  API-LAG (Next.js API routes / egen Node-tjeneste)           │
│  ├─ Auth-middleware (sjekker workspace_members per request)  │
│  ├─ CRUD for projects/tasks/time_entries/notifications        │
│  ├─ Chat-endepunkt → orkestrerer Claude-kall                 │
│  └─ Aktivitetslogging (activity_log) på alle mutasjoner       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│  MCP-ORCHESTRATOR          │   │  ANTHROPIC API-KALL            │
│  (egen modul/tjeneste)     │   │  Bruker brukerens BYOK-nøkkel  │
│  ├─ Vet hvilke tools som   │   │  (dekryptert kun server-side,  │
│  │  er aktive per workspace│   │  aldri logget)                 │
│  ├─ Proxyer rene lese-kall │   └───────────────────────────────┘
│  │  til MCP-serverne       │
│  ├─ Egne skrive-wrappere   │   ┌───────────────────────────────┐
│  │  (Intercom reply, etc.) │   │  PENDING ACTIONS               │
│  └─ Rate-limit/retry-logikk│   │  Bekreftelseskort i UI før     │
│     mot eksterne API-er    │   │  irreversible handlinger        │
└───────────────────────────┘   │  utføres                        │
              │                 └───────────────────────────────┘
    ┌─────────┴──────────┐
    ▼                    ▼
┌─────────────┐   ┌──────────────────┐
│ Intercom MCP │   │ Intern PM-tool   │
│ (offisiell,  │   │ MCP (egenbygd,   │
│ mest lesing) │   │ full lese/skrive)│
└─────────────┘   └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DATALAG — Supabase                                            │
│  ├─ Postgres (workspaces, tasks, time_entries, chat, notif.)  │
│  │  med Row Level Security scopet på workspace_id             │
│  ├─ Supabase Storage for vedlegg                               │
│  ├─ Supabase Auth for innlogging/sesjoner                      │
│  └─ Upstash Redis (valgfritt) — cache av MCP-data, rate-limit  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Utvidet datamodell (samlet)

```
users
 ├─ id, email, name

workspace_members
 ├─ workspace_id →, user_id →, role (owner/member/viewer)

workspaces
 ├─ id, name, type (student/enk/job), color_accent

user_credentials
 ├─ user_id →, provider ('anthropic'), encrypted_key, key_last4

integrations
 ├─ workspace_id →, provider ('intercom'/'internal-pm'), oauth_tokens, enabled_tools[]

projects
 ├─ workspace_id →, name, status

tasks
 ├─ project_id →, title, status, priority, progress,
 │  due_date, tags[] (many-to-many via task_tags)

task_assignees          ← multi-assignee fra skjermbildene
 ├─ task_id →, user_id →

task_comments
 ├─ task_id →, user_id →, body, parent_comment_id (for tråder)

task_attachments
 ├─ comment_id →, storage_key, filename, size

time_entries
 ├─ task_id →, user_id →, started_at, ended_at, note

chat_threads / chat_messages
 ├─ workspace_id →, user_id →, input_tokens, output_tokens

pending_actions
 ├─ workspace_id →, initiated_by →, confirmed_by →,
 │  action_type, payload, status (pending/confirmed/rejected)

activity_log             ← generisk, driver Activity-feed + audit
 ├─ workspace_id →, user_id →, entity_type, entity_id, action, created_at

notifications
 ├─ user_id →, workspace_id →, type, entity_ref, read_at
```

---

## 5. Nye retninger verdt å utforske

Dette er ting som ikke har vært eksplisitt diskutert, men som skjermbildene og bruksmønsteret ditt gjør relevante:

1. **Er dette 100 % internt, eller delvis klient-vendt?** Del-knappen, "Invite" og quick actions som faktura/kontrakt i referansen antyder at Synchro i utgangspunktet er bygget for å også involvere eksterne (klienter). Verdt å ta bevisst stilling til: skal dashbordet **noen gang** vise noe til en klient (f.eks. dele et prosjektstatus-lenke), eller er det strengt internt? Dette avgjør om du trenger en egen "extern viewer"-rolle i `workspace_members` fra start.
2. **Objektlagring for filvedlegg** — kommentarene i task-modalen har vedlagte filer (.fig, .doc). Siden du kjører på Hetzner via Coolify allerede, er Hetzner Object Storage (S3-kompatibelt) eller Cloudflare R2 naturlige valg — begge fungerer fint med samme S3-SDK.
3. **Sanntidsoppdateringer** — når du (og etter hvert kolleger) sitter i samme workspace, vil dere fort forvente at ting oppdateres live (task flyttet, timer startet av noen andre). Vurder WebSockets eller Server-Sent Events tidlig i arkitekturen, selv om du ikke bygger UI for det i fase 1 — det er en helt annen backend-struktur enn ren request/response.
4. **Rate-limiting og retry mot eksterne API-er** — Intercom har egne rate-limits på sin API. MCP-orchestratoren bør ha innebygd backoff/retry-logikk, ellers vil en travel dag med mange AI-kommandoer kunne treffe en 429 midt i en kundesamtale.
5. **Observability for AI-handlinger** — siden Claude faktisk utfører handlinger (ikke bare svarer på spørsmål), er det verdt å logge *hvorfor* en handling ble foreslått (hvilket tool-kall, hvilken input) i tillegg til activity_log — nyttig for feilsøking den dagen noe går galt eller virker rart.
6. **Fakturering/CRM-modulen (Send invoice, Draft a Proposal, Create a contract)** — dette er trolig det tyngste enkeltelementet i Synchro-referansen som ikke er diskutert. Spørsmål å stille deg selv: skal dette bygges fra bunnen, eller skal ENK-workspace-et heller **integrere** mot Tripletex (som du allerede bruker) i stedet for å bygge fakturering på nytt?
7. **Caching-strategi for MCP-data** — "3 min ago" i header antyder at Synchro ikke henter live fra kildesystemene ved hvert sidelast. Bør dashbordet ditt cache Intercom/PM-data i egen DB med periodisk sync, eller hente live? Cache gir raskere UI og mindre API-belastning, men krever en synk-jobb og "stale data"-håndtering.
8. **PWA / mobil** — verdt å vurdere tidlig om du vil kunne sjekke inbox/starte timer fra mobilen, siden det påvirker om du bygger responsivt fra start eller separat.
9. **Row Level Security som andre forsvarslinje** — med Supabase kan du håndheve workspace-isolasjon direkte i databasen (RLS-policy: en rad er kun synlig hvis `workspace_id` matcher et workspace brukeren er medlem av), i tillegg til app-lags-sjekkene i API-ruter. Dette er direkte relevant for cross-tenant-lekkasje-risikoen nevnt tidligere — bygg RLS-policies samtidig som du bygger hver tabell, ikke som et eget steg etterpå.
10. **Serverless-begrensninger for MCP-orchestratoren på Vercel** — Vercel-funksjoner har kjøretidsgrenser. Sjekk om MCP-tool-kall og streaming chat-svar holder seg innenfor standardgrensene, eller om orchestratoren trenger lengre kjøretid (Fluid Compute/Edge Runtime) — spesielt relevant hvis en MCP-server bruker en vedvarende SSE-sesjon.

---

## 6. Tech stack — forslag

Gitt at du allerede kjenner denne stacken fra klientarbeid (Coolify/Hetzner, Bun, Turborepo), er det mest fornuftig å gjenbruke den fremfor å lære noe helt nytt samtidig som du designer arkitekturen:

- **Monorepo**: Turborepo + Bun
- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui
- **Backend**: Next.js API routes/Server Actions — skill ut MCP-orchestratoren som egen pakke i monorepoet (`packages/mcp-orchestrator`) slik at den kan bli en egen tjeneste senere uten stor omskriving
- **DB**: Supabase (administrert Postgres), skjema fortsatt via Drizzle ORM, med RLS-policies scopet på workspace_id som andre forsvarslinje utover app-lags-sjekkene
- **Auth**: Supabase Auth
- **Objektlagring**: Supabase Storage
- **Deploy**: Vercel — koble GitHub-repoet direkte, ingen Dockerfile/Nginx-oppsett nødvendig for dette prosjektet
- **Cache/rate-limit (valgfritt)**: Upstash Redis — serverless-vennlig, fungerer godt sammen med Vercel

---

## 7. Foreslått rekkefølge

**Fase 1 — fundament**
Workspaces + auth + workspace_members, grunnleggende projects/tasks/time_entries, activity_log

**Fase 2 — AI-chat**
BYOK-nøkkelhåndtering, chat-dock, MCP-orchestrator med lesetilgang først, pending-actions for skriving

**Fase 3 — polish av kjernefunksjon**
Notifications/inbox, søk, favoritter, kommentarer med vedlegg

**Fase 4 — utvidelser**
Reporting/milestones, kalenderintegrasjon, ev. fakturamodul (eller Tripletex-kobling)

---

*Neste steg: velg om vi går videre på mappestruktur i monorepoet, eller UI-strukturen (workspace-switcher, timer-widget, chat-dock i layout).*
