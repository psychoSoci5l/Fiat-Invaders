# Retrospettiva Completa — Mappatura & Osservazioni Architettura

**Data:** 2026-05-16
**Oggetto:** Valutazione dei tre deliverable: `architecture-map.json`, `architecture-map.html`, `architecture-observations.md`
**Criterio:** Analisi condotta come se il lavoro fosse stato fatto da un team esterno da valutare

---

## 1. Valutazione per deliverable

### 1.1 `architecture-map.json` — Voto: 7/10

**Punti di forza:**
- Copertura completa: 10 layer, 74 moduli, tutti con namespace/file/purpose
- State machine con tutte le 11 transizioni mappate individualmente
- Event bus con publisher→subscribers espliciti e conteggio
- Rendering pipeline, game loop, collision matrix, persistenza — tutto strutturato
- ADR e GDD indicizzati con status e layer di appartenenza

**Carenze identificate:**

| Carenza | Impatto | Fix |
|---------|---------|-----|
| Dati **curati manualmente**, non estratti dal codice | Desync futuro garantito — la v7.13 avrà moduli nuovi e il JSON resterà obsoleto | Implementare uno script di estrazione automatica che parsa `index.html` (i `<script>` tags) + `CLAUDE.md` namespace table |
| **Nessun campo `generated_from` o `source_hash`** | Impossibile verificare se il JSON riflette il codice attuale | Aggiungere metadata: `"generated_from": "index.html:v7.12.14", "source_hash": "sha256..."` |
| **Nessun cross-reference** tra moduli e ADR | Il JSON dice che CollisionSystem esiste, ma non che è governato da ADR-0004 | Aggiungere campo `"governed_by": ["ADR-0004"]` su ogni modulo |
| **Nessun GDD requirement ID** | I 70 TR-* ID del traceability index sono assenti | Aggiungere array `"covers_requirements": ["TR-V8-001", "TR-V8-002"]` per modulo |
| **Nessuna metrica di coupling** | Non si sa quanti moduli dipendono da ciascun altro modulo | Calcolare e aggiungere `"coupled_to": N` e `"coupled_from": N` per modulo |
| **Layer order non validato** | Il JSON dichiara l'ordine ma non verifica che il load order in `index.html` lo rispetti | Aggiungere validazione automatica: confronta l'ordine nel JSON con l'ordine dei `<script>` in index.html |
| **Struttura piatta** | I layer sono una lista — non c'è gerarchia interna | Suddividere Core Systems in sottogruppi (rendering, gameplay, VFX, audio-reactive) |
| **Nessun file size o LOC** | Non si sa quali moduli sono più grandi/pesanti | Aggiungere `"loc": 342` e `"size_kb": 12.4` per modulo |

**Piano miglioramento JSON (v2):**

| ID | Task | Priorità | Sforzo |
|----|------|----------|--------|
| J1 | Script di estrazione automatica da `index.html` | Alta | Medio |
| J2 | Aggiungere campo `source_hash` per validazione integrità | Alta | Basso |
| J3 | Aggiungere `governed_by` (ADR) e `covers_requirements` (TR-ID) | Media | Medio |
| J4 | Calcolare metriche di coupling per modulo | Media | Alto |
| J5 | Suddividere layer Core in 5 sottogruppi | Bassa | Basso |
| J6 | Aggiungere `loc` e `size_kb` per modulo | Bassa | Basso |
| J7 | Integrare con CI/CD per rigenerazione automatica a ogni commit | Bassa | Alto |

---

### 1.2 `architecture-map.html` — Voto: 6.5/10

**Punti di forza:**
- 1130 righe, tutto inline, zero dipendenze esterne (coerente con l'architettura del gioco)
- Sidebar navigabile con ricerca moduli che filtra in tempo reale
- Dependency graph visuale con barre proporzionali e frecce tra layer
- 10 layer espandibili/collassabili con dettaglio moduli
- State machine, event bus, rendering pipeline, game loop, collision matrix — tutte le sezioni presenti
- Dark theme professionale con palette colori per layer

**Carenze identificate:**

| Carenza | Impatto | Fix |
|---------|---------|-----|
| **Sidebar scompare su mobile** (`display: none`) | Impossibile navigare la pagina da telefono/tablet | Aggiungere hamburger menu o sidebar overlay per mobile |
| **Dependency graph è solo bar chart** | Non mostra le vere dipendenze tra moduli (solo conteggio per layer) | Sostituire con **force-directed graph** (D3.js-like) che mostra archi tra moduli con dipendenze reali |
| **State machine è solo una griglia + tabella** | Non mostra il grafo delle transizioni visualmente | Aggiungere **SVG state diagram** con nodi cliccabili e frecce di transizione |
| **Nessuna interattività sulle connessioni** | Cliccando un evento non si evidenziano i subscriber | Aggiungere highlighting: clicca `entity:died` → tutti i 6 subscriber si illuminano |
| **Rendering pipeline non mostra dipendenze** | È una lista numerata — utile ma piatta | Aggiungere **Gantt-style timeline** con dipendenze tra step (es. "Step 10 dipende da Step 9") |
| **Game loop non mostra il flusso temporale** | Griglia di card senza relazione tra step | Aggiungere **timeline orizzontale** con barre che mostrano il peso computazionale relativo |
| **Nessun export/print** | Non esportabile in PDF o PNG per condivisione | Aggiungere pulsante "Export as PNG" o "Print-friendly view" |
| **Dati duplicati inline nel JS** | Il JSON esiste già fuori — perché ripetere tutto nell'HTML? | Caricare il JSON via `fetch()` o embeddarlo come `<script type="application/json">` |
| **Nessun confronto tra versioni** | Se generassi una mappa per v8, non potrei confrontarla con v7 | Aggiungere sezione "Version diff" che confronta due JSON |
| **Accessibilità assente** | Nessun ARIA label, nessun keyboard navigation, nessun focus management | Aggiungere `role`, `aria-label`, `tabindex`, keyboard shortcuts |
| **Nessun health score** | Non si capisce a colpo d'occhio lo stato di salute dell'architettura | Aggiungere **dashboard header** con metriche aggregate: coupling score, coverage %, test coverage, bus factor |

**Piano miglioramento HTML (v2):**

| ID | Task | Priorità | Sforzo |
|----|------|----------|--------|
| H1 | Mobile responsive: hamburger menu + sidebar overlay | Alta | Basso |
| H2 | Caricare dati da JSON esterno invece di duplicarli | Alta | Basso |
| H3 | Interactive state machine diagram (SVG + D3 o vanilla) | Alta | Alto |
| H4 | Highlighting connessioni event bus (click su publisher → subscriber) | Media | Medio |
| H5 | Dashboard header con metriche aggregate (health score) | Media | Medio |
| H6 | Force-directed dependency graph tra moduli | Media | Alto |
| H7 | Gantt-style rendering pipeline con dipendenze | Bassa | Medio |
| H8 | Export PNG / Print-friendly view | Bassa | Medio |
| H9 | Version diff tool (confronta due mappe) | Bassa | Alto |
| H10 | Accessibilità: ARIA labels, keyboard navigation | Bassa | Medio |

---

### 1.3 `architecture-observations.md` — Voto: 8/10

**Punti di forza:**
- 10 osservazioni strutturate con schema uniforme (Evidenza → Analisi → Rischio → Raccomandazione)
- Ogni osservazione è ancorata a dati concreti estratti dalla mappa
- Tabella riepilogo rischi con priorità e sforzo di fix
- 6 azioni raccomandate in ordine di priorità
- Linguaggio chiaro, actionable, senza gergo inutile
- Identifica pattern architetturali emergenti (DIP Meter, God Layer, hidden orchestrator)

**Carenze identificate:**

| Carenza | Impatto | Fix |
|---------|---------|-----|
| **Tutte le osservazioni sono qualitative** | Mancano metriche quantitative: coupling density, cohesion score, cyclomatic complexity proxy, churn rate | Aggiungere sezione "Metriche Quantitative" con valori numerici |
| **Nessun riferimento preciso ai paragrafi ADR** | "ADR-0004" viene citato ma non si dice quale paragrafo specifico | Linkare sezioni specifiche: `ADR-0004 §3.2 (Narrow-phase collision)` |
| **Nessun riferimento ai GDD requirement ID** | Le osservazioni non tracciano ai TR-* ID del traceability index | Aggiungere colonna "TR Requirements" nella tabella riepilogo |
| **Manca un'analisi di coupling-to-cohesion** | Non si sa quali moduli sono coesi e quali no | Calcolare e includere: per ogni layer, rapporto moduli/eventi/ADR |
| **Manca un'analisi del bus factor** | Quanti moduli hanno un solo autore? Quanti sono "tribal knowledge"? | Includere stima bus factor per layer |
| **Manca una proiezione temporale** | Le osservazioni sono statiche — non dicono cosa peggiorerà entro v9 | Aggiungere sezione "Proiezione v8/v9" con scenari previsionali |
| **Nessun confronto con architetture simili** | Non c'è benchmark — è difficile valutare se 38% in un layer è "normale" | Aggiungere confronto con pattern noti (ECS, MVC, layered) |
| **Manca un'analisi delle dipendenze cicliche** | L'architettura vieta cicli, ma non viene verificato | Verificare e documentare: 0 cicli trovati / N cicli potenziali |

**Piano miglioramento MD (v2):**

| ID | Task | Priorità | Sforzo |
|----|------|----------|--------|
| O1 | Aggiungere sezione "Metriche Quantitative" con 10+ valori numerici | Alta | Medio |
| O2 | Tracciare ogni osservazione ai TR-* ID del traceability index | Alta | Medio |
| O3 | Linkare paragrafi specifici degli ADR (non solo il numero) | Media | Basso |
| O4 | Aggiungere analisi coupling-to-cohesion per layer | Media | Alto |
| O5 | Aggiungere proiezione temporale v8/v9 con scenari | Media | Medio |
| O6 | Verificare assenza di dipendenze cicliche e documentare | Media | Alto |
| O7 | Aggiungere sezione "Pattern Architetturali Emergenti" | Bassa | Basso |
| O8 | Aggiungere confronto con architetture di riferimento (ECS, MVC) | Bassa | Medio |

---

## 2. Voto complessivo: **7.2/10**

| Criterio | Peso | JSON | HTML | MD | Ponderato |
|----------|------|------|------|----|-----------|
| Completezza dati | 25% | 8 | 7 | 8 | 1.92 |
| Utilità pratica | 25% | 7 | 6 | 9 | 1.83 |
| Qualità analisi | 20% | 6 | 5 | 8 | 1.27 |
| Manutenibilità futura | 15% | 5 | 6 | 7 | 0.90 |
| Usabilità / UX | 15% | 7 | 7 | 8 | 1.10 |
| **Totale** | **100%** | **6.70** | **6.25** | **8.10** | **7.02** |

Il voto è frenato principalmente da:
1. **Natura manuale** dei dati (JSON) — non rigenerabile automaticamente
2. **Mancanza di interattività** e metriche visive (HTML)
3. **Assenza di metriche quantitative** (MD)

---

## 3. Visione Futura — Dove portare questi tre artefatti

### 3.1 Obiettivo finale dei tre deliverable

I tre file non devono essere documenti statici scritti una volta e dimenticati. Devono diventare un **sistema vivente**:

- **JSON**: single source of truth, rigenerato automaticamente da CI/CD a ogni commit
- **HTML**: dashboard interattiva sempre aggiornata, usata per code review e onboarding
- **MD**: rapporto di salute periodico, generato dopo ogni milestone con metriche fresh

### 3.2 Roadmap implementativa

**Fase 1 — Fondamenta (Sprint corrente, 2-3 giorni)**

| ID | Deliverable | Task | Output |
|----|-------------|------|--------|
| F1.1 | JSON + HTML | Script `scripts/extract-architecture.js` che parsa `index.html` e produce `architecture-map.json` automaticamente | JSON sempre aggiornato |
| F1.2 | JSON | Aggiungere `source_hash` e `generated_at` al JSON | Tracciabilità |
| F1.3 | HTML | Caricare dati da JSON esterno (non più duplicati inline) | DRY principle |
| F1.4 | HTML | Sidebar hamburger menu per mobile | Accessibilità mobile |

**Fase 2 — Interattività (Prossimo sprint, 3-5 giorni)**

| ID | Deliverable | Task | Output |
|----|-------------|------|--------|
| F2.1 | HTML | State machine diagram interattivo (SVG con nodi e frecce cliccabili) | Visualizzazione state machine |
| F2.2 | HTML | Event bus highlighting: clicca un evento → subscriber illuminati | Debuggabilità eventi |
| F2.3 | HTML | Dashboard header: health score, coupling avg, module count trend | Vista d'insieme immediata |
| F2.4 | JSON | Aggiungere `governed_by` (ADR refs) e `covers_requirements` (TR-IDs) | Tracciamento completo |

**Fase 3 — Metriche (Sprint +2, 3-5 giorni)**

| ID | Deliverable | Task | Output |
|----|-------------|------|--------|
| F3.1 | JSON | Calcolare coupling metrics per ogni modulo | Dati quantitativi |
| F3.2 | MD | Sezione "Metriche Quantitative" con 10+ valori | Analisi numerica |
| F3.3 | MD | Tracciamento TR-* ID in ogni osservazione | Tracciabilità completa |
| F3.4 | MD | Proiezione temporale v8/v9 con scenari previsionali | Visione futura |

**Fase 4 — Eccellenza (Sprint +3, 5-7 giorni)**

| ID | Deliverable | Task | Output |
|----|-------------|------|--------|
| F4.1 | HTML | Force-directed dependency graph (moduli → moduli, non solo layer) | Visualizzazione coupling reale |
| F4.2 | HTML | Export PNG / Print-friendly view | Condivisione |
| F4.3 | HTML | Version diff tool (confronta v7 → v8) | Analisi cambiamenti |
| F4.4 | MD | Coupling-to-cohesion analysis per layer | Metriche architetturali avanzate |
| F4.5 | CI/CD | `.github/workflows/architecture-map.yml` che rigenera JSON a ogni push su main | Automazione |

---

## 4. Priorità immediata (da fare subito)

Ordinate per rapporto impatto/sforzo:

| # | Task | Impatto | Sforzo | File |
|---|------|---------|--------|------|
| 1 | Script estrazione automatica architettura | **ALTISSIMO** — elimina desync futuro | Medio | JSON |
| 2 | JSON: aggiungere `source_hash` + `generated_at` | **ALTO** — validazione integrità | Basso | JSON |
| 3 | HTML: caricare JSON esterno | **ALTO** — DRY, sempre aggiornato | Basso | HTML |
| 4 | HTML: hamburger menu mobile | **ALTO** — accessibilità | Basso | HTML |
| 5 | MD: aggiungere sezione Metriche Quantitative | **MEDIO** — credibilità analisi | Medio | MD |
| 6 | MD: tracciare TR-* ID nelle osservazioni | **MEDIO** — tracciabilità | Medio | MD |
| 7 | JSON: aggiungere `governed_by` e `covers_requirements` | **MEDIO** — collegamento ADR/GDD | Medio | JSON |
| 8 | HTML: dashboard header con health score | **MEDIO** — vista immediata | Medio | HTML |

---

## 5. Principi guida per il futuro

1. **Il JSON non si tocca a mano** — deve esistere uno script che lo rigenera. Il file manuale è un prototipo, non il prodotto finale.
2. **L'HTML è una dashboard, non un documento** — deve supportare esplorazione, filtri, export, e confronto tra versioni.
3. **L'MD è un rapporto di salute** — deve includere metriche quantitative e proiezioni, non solo osservazioni qualitative.
4. **I tre file sono interconnessi** — il JSON alimenta l'HTML e fornisce dati all'MD. Devono evolvere insieme.
5. **Automazione > Manuale** — ogni volta che un dato può essere estratto dal codice, deve esserlo. Il lavoro umano deve concentrarsi sull'analisi, non sulla raccolta dati.

---

## 6. Conclusione

Il lavoro svolto è un **ottimo punto di partenza** — la mappatura è completa, le osservazioni sono pertinenti, la visualizzazione è funzionale. Ma è anche un **prototipo**. Il valore reale emergerà quando questi tre artefatti diventeranno parte del ciclo di sviluppo:

- **JSON** rigenerato automaticamente → sempre aggiornato
- **HTML** interattivo con metriche → usato in ogni code review
- **MD** con metriche quantitative → generato dopo ogni milestone

Il voto 7.2/10 riflette la qualità del lavoro attuale ma anche il potenziale inespresso. Con le 8 azioni prioritarie immediate, il voto salirebbe a 8.5+. Con la roadmap completa (Fase 1-4), il sistema raggiungerebbe 9.5+.
