# 🏦 Finance Tracker: Analisi Tecnica e Strategica (v1.0)

## 1. Visione del Progetto
**Finance Tracker** non è una semplice calcolatrice di spese, ma un **Personal Financial Operating System (PFOS)**. L'obiettivo è trasformare dati grezzi (transazioni) in decisioni strategiche (investimenti, risparmio, ottimizzazione fiscale) attraverso un'interfaccia "Apple-like" che riduca l'attrito mentale della gestione del denaro.

---

## 2. Stack Tecnologico (The "Modern Web" Stack)
Il progetto utilizza le tecnologie più avanzate del 2025/2026 per garantire velocità, robustezza e manutenibilità:

*   **Framework:** `Next.js 15.5+` (App Router) - Sfrutta i *React Server Components (RSC)* per prestazioni fulminee e SEO ottimizzata.
*   **Linguaggio:** `TypeScript` - Garantisce robustezza eliminando intere classi di errori a runtime grazie al sistema di tipi statici.
*   **Database & ORM:** `PostgreSQL` su **Neon** (Serverless) con `Prisma ORM`. Permette scalabilità orizzontale e migrazioni sicure con `Prisma Migrate`.
*   **Autenticazione:** `NextAuth.js v5 (Beta)` - Gestione sicura di sessioni, JWT e provider multipli (Credentials, Google, GitHub).
*   **Styling:** `Tailwind CSS v4` - Design system atomico con supporto nativo per variabili CSS, architettura utility-first e Glassmorphism.
*   **Animazioni:** `Framer Motion` - Per un'esperienza utente fluida, transizioni di pagina e feedback visuali premium.
*   **AI Engine:** `Vercel AI SDK` + `Google Gemini 2.0 Flash` - Analisi semantica delle transazioni e generazione di insight proattivi personalizzati.
*   **Validazione:** `Zod` - Schema validation rigorosa per garantire l'integrità dei dati tra client, server e database.

---

## 3. Architettura del Software
L'applicazione segue un modello **Hybrid Architecture** altamente modulare:

### A. Data Layer (Server-Side)
*   **Multi-Tenancy (Workspaces):** Ogni utente appartiene a un *Workspace*. Le transazioni e le configurazioni sono isolate a livello di database tramite `workspaceId`, permettendo futura collaborazione multi-utente.
*   **Prisma Client:** Astrazione del database che garantisce query efficienti e relazioni integre (Conti -> Transazioni -> Categorie).

### B. Logic Layer (Server Actions)
*   Invece di API REST tradizionali, il progetto usa **Server Actions** (`src/app/actions/`).
*   **Vantaggi:** Type-safety end-to-end (dal DB alla UI), riduzione drastica del codice boilerplate e sicurezza integrata con controlli di ownership su ogni singola operazione.

### C. UI Layer (Client-Side)
*   **Atomic Design:** Componenti divisi per dominio (`accounts/`, `budget/`, `transactions/`, `layout/`).
*   **Theme Engine:** Sistema di temi Dark/Light/Auto persistente in `localStorage` basato su attributi HTML e variabili CSS root.

---

## 4. Infrastruttura e Deployment
*   **Hosting:** `Vercel` - Pipeline di CI/CD automatizzata con preview branch e produzione istantanea.
*   **Edge Functions:** Utilizzo di middleware e rotte edge per minimizzare la latenza globale.
*   **Cron Jobs:** Utilizzo di `Vercel Cron` per il processamento notturno automatizzato (es. generazione transazioni da ricorrenze).

---

## 5. Analisi delle Funzionalità Chiave (Stato Attuale)
1.  **Smart Categorization:** Sistema di categorizzazione automatica basato su regole prioritarie (`RulesManager`) e analisi AI.
2.  **Budgeting Dinamico:** Monitoraggio in tempo reale della spesa rispetto ai limiti impostati con indicatori visuali semantici.
3.  **Gestione Ricorrenze:** Motore predittivo che gestisce abbonamenti e pagamenti pianificati, automatizzando l'inserimento dei dati.
4.  **Financial Health Dashboard:** Visualizzazione consolidata di Saldo Totale, Cash Flow mensile e Patrimonio Netto.
5.  **Importazione Wizard:** Sistema di mappatura CSV intelligente con rilevamento duplicati e assegnazione automatica dei campi.

---

## 6. Roadmap: "Livello Successivo" (Strategia 2-3-6-7)

### Fase 1: Ubiquità e Reattività (PWA & Push - Punto 2)
*   **PWA:** Implementazione di `manifest.json` e `Service Workers` per rendere l'app installabile come applicazione nativa.
*   **Push Notifications:** Notifiche browser e mobile per avvisi su sforamento budget, scadenze imminenti o anomalie.

### Fase 2: Il Futuro Predittivo (AI & Cash Flow - Punto 3)
*   **Proiezione a 6 mesi:** Algoritmo avanzato che incrocia le ricorrenze e la media storica delle spese variabili per prevedere il saldo futuro.
*   **Conversational Finance:** Assistente AI via chat per analisi testuali dei dati finanziari.

### Fase 3: Automazione Totale (Auto-Actions - Punto 7)
*   **Trigger & Action Engine:** Sistema di automazione interna (es: "Se il budget X supera l'80%, inviami un alert e genera un report").
*   **Reporting Fiscale:** Esportazione automatica di documenti pre-formattati per la dichiarazione dei redditi.

### Fase 4: Sicurezza Avanzata (Security - Punto 6)
*   **Biometria (Passkeys):** Integrazione di FaceID/TouchID tramite WebAuthn per un accesso senza password e ultra-sicuro.
*   **Privacy Mode:** Funzionalità "Obfuscate" per nascondere i saldi sensibili durante la consultazione in luoghi pubblici.

---

## 7. Conclusione
Il progetto è strutturato per essere una soluzione **SaaS-ready**. La scelta tecnologica (Next.js 15, Tailwind v4, Gemini 2.0) lo posiziona al vertice dell'ecosistema web attuale, garantendo una longevità tecnica superiore e facilità nell'integrare le funzionalità della roadmap futura.
