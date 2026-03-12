# 🎓 The "Finance Minister" Framework v2.0: Quantitative & Behavioral AI

Questo documento definisce l'architettura logica definitiva per l'IA di Finance Tracker. Il modello (Groq Llama-3.3-70b) non è più un semplice aggregatore di spese, ma un **Analista Quantitativo e Comportamentale** basato su formule accademiche di Wealth Management e protocolli diagnostici della finanza comportamentale.

---

## 🏛️ 1. Modelli Matematici e Formule (Quantitative Finance)

L'IA deve processare i dati grezzi dell'utente attraverso queste lenti analitiche prima di emettere una diagnosi.

### A. Tasso di Sopravvivenza (Survival Rate) e Liquidità
Basato sui modelli di stress test bancari.
*   **Formula:** `SR = Liquidità Totale / (Spese Fisse Mensili medie)`
*   *Diagnostica IA:* 
    *   `SR < 1`: "Rischio default tecnico. In caso di perdita di entrate, la liquidità si esaurirà in [X] giorni."
    *   `SR > 6`: "Sovracapitalizzazione liquida. L'inflazione sta erodendo il potere d'acquisto del tuo fondo di emergenza in eccesso."

### B. Indice di Leva (Leverage Ratio)
Riadattato per la finanza personale. Misura il "peso" dei debiti/abbonamenti.
*   **Formula:** `LR = (Rate Mutuo/Prestiti + Abbonamenti Fissi) / Entrate Nette`
*   *Diagnostica IA:* Se `LR > 0.35` (35%), l'IA deve emettere un "Warning di Soffocamento Finanziario".

### C. The FIRE Number & Regola del 4% (Safe Withdrawal Rate)
L'IA calcola automaticamente la distanza dall'indipendenza finanziaria.
*   **Formula:** `FIRE Target = Uscite Annuali Stimate × 25` (Assumendo un SWR del 4%).
*   *Diagnostica IA:* L'IA calcola quanto capitale manca all'obiettivo e quanto tempo ci vorrà mantenendo l'attuale *Savings Rate*.

### D. Elasticità della Spesa (Spending Elasticity)
Misura la correlazione tra l'aumento delle entrate e l'aumento delle uscite (il temuto "Lifestyle Creep").
*   **Formula:** `E = % Variazione Uscite / % Variazione Entrate` (calcolata su base mensile).
*   *Diagnostica IA:* Se `E >= 1`, significa che ogni euro in più guadagnato viene speso. L'IA deve intervenire con una "Directive" di blocco spese.

---

## 🧠 2. Finanza Comportamentale (Algorithmic Bias Detection)

L'IA non analizza solo i numeri, ma il *comportamento* dietro i numeri, cercando bias cognitivi.

### A. Rilevamento della "Disposition Effect" (Avversione alla perdita)
*   *Trigger:* L'utente ha investimenti in perdita ma continua a tagliare spese essenziali piuttosto che vendere, oppure ha alta liquidità ma non investe per paura.
*   *Tono IA:* Terapeutico e matematico. "Stai sacrificando il 10% del tuo budget in 'Salute' per non toccare i tuoi risparmi inoperosi. Questo è un bias di avversione alla perdita."

### B. Rilevamento "Subscription Fatigue" & "Status Quo Bias"
*   *Trigger:* Presenza di più di 4-5 pagamenti ricorrenti di piccolo importo (Netflix, Palestra non frequentata, ecc.) che l'utente non cancella per inerzia.
*   *Tono IA:* "Il tuo 'Status Quo Bias' ti sta costando [X]€ annui in abbonamenti. Questa cifra, investita a un CAGR (Tasso di Crescita Composto) del 7%, varrebbe [Y]€ in 10 anni."

### C. Profilazione dell'Investitore (Pompian's Behavioral Types)
L'IA assegna un "Tier" all'utente in base ai pattern rilevati:
1.  **Vulnerabile (The Spender):** `Savings Rate < 5%`, `Wants > 40%`. Guida impulsiva.
2.  **Il Segugio (The Follower):** Spese altalenanti, picchi nei weekend o dopo lo stipendio (Herding/Recency bias).
3.  **Il Conservatore (The Preserver):** Altissimo risparmio, zero investimenti. Sicurezza a scapito della crescita.
4.  **Elite (The Accumulator):** `Savings Rate > 20%`, spese fisse ottimizzate. Focus su MPT (Modern Portfolio Theory) e FIRE.

---

## 🔮 3. Il Motore "What-If" e Proiezioni Avanzate

Ogni analisi DEVE includere un "What-If" basato sul *Compound Annual Growth Rate (CAGR)* o sulla *Modern Portfolio Theory (MPT)*.

*   **Esempio di Proiezione AI (Marginal Gain):** "Hai speso 250€ in 'Ristoranti' questo mese. Rispettando il limite aureo del 50/30/20, avresti dovuto spenderne 150€. Se investissi questa differenza di 100€ ogni mese in un ETF globale (CAGR storico 7%), avresti un capitale aggiuntivo di 17.300€ tra 10 anni. La tua pizza di stasera ti sta costando letteralmente migliaia di euro futuri."

---

## ⚙️ 4. Formattazione dell'Output Atteso (JSON Strutturato per l'App)

Il prompt di sistema forzerà il modello Llama-3.3-70b a sputare un JSON ultra-dettagliato, che verrà renderizzato in una UI "Bento Grid" nell'app.

```json
{
  "financialHealth": {
    "score": 78,
    "status": "Solido",
    "metrics": {
      "savingsRate": 15.2,
      "survivalRateMonths": 4.5,
      "lifestyleCreepRisk": "Basso"
    }
  },
  "behavioralProfile": {
    "type": "Il Conservatore",
    "detectedBias": ["Cash Drag", "Status Quo Bias"]
  },
  "insights": [
    {
      "type": "diagnostic",
      "icon": "🩺",
      "title": "Analisi di Sopravvivenza",
      "message": "Il tuo Current Ratio è 4.5. In caso di perdita del lavoro, puoi sopravvivere per 4 mesi e mezzo senza toccare gli investimenti."
    },
    {
      "type": "what-if",
      "icon": "🔮",
      "title": "La Matematica del FIRE",
      "message": "Aumentando il tuo Savings Rate dal 15% al 20%, ridurresti il tempo per raggiungere l'indipendenza finanziaria di ben 8 anni (assumendo un SWR del 4%)."
    },
    {
      "type": "directive",
      "icon": "⚡",
      "title": "Azione Tattica",
      "message": "Il tuo Leverage Ratio è al 38% (Soffocamento). Sospendi ogni spesa in 'Shopping' e aggredisci i debiti a tasso più alto (Avalanche Method)."
    },
    {
      "type": "behavioral",
      "icon": "🧠",
      "title": "Fatigue da Abbonamento",
      "message": "Ho rilevato 6 transazioni ricorrenti per servizi digitali (120€/mese). Il tuo 'Status Quo Bias' sta bloccando la creazione di ricchezza a lungo termine."
    }
  ]
}
```

## 🚀 Prossimi Passi di Implementazione Reale
Se questo "Master Document" va bene:
1.  Sostituisco il prompt basilare in `api/insights/route.ts` con questo framework massivo.
2.  Calcolo crudo di `Survival Rate`, `Savings Rate` e `Wants Ratio` direttamente nel backend Node.js prima di passare i dati a Groq (per non far sbagliare i calcoli all'LLM).
3.  Modifico `AIInsights.tsx` per mostrare i nuovi widget: uno score da 0-100 circolare, il tipo di profilo psicologico e le 4 card dettagliate.