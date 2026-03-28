# MyPay4 CSV Generator (Web)

Applicazione web per compilare, validare ed esportare flussi CSV per MyPay4 (tracciato **1_4**), eseguibile interamente nel browser tramite [Pyodide](https://pyodide.org/) (Python in WebAssembly), senza server applicativo.

## Funzionalità principali

- Import di **CSV** o **ZIP** (con normalizzazione da tracciati precedenti a 1_4)
- Griglia con colonne tipiche del flusso, evidenziazione riga selezionata, **doppio click** per modificare una riga, tasto **Canc** con tabella a fuoco
- **Codice IPA** e anteprima del pattern nome file generato
- Editor riga con campi obbligatori/opzionali, **tooltip** sui campi (testi da `py/mypay4_core/constants`), validazione prima del salvataggio
- Helper **Dati specifici di riscossione** e **Editor bilancio XML** (con anteprima e limite 4096 caratteri)
- **Aumento massivo importi** (percentuale o importo fisso) con le stesse modalità di gestione del **bilancio XML** del flusso
- **Salva** / **Salva come…** con download dello **ZIP** (CSV interno + messaggi di conferma allineati al flusso di lavoro di controllo errori)

## Struttura del repository

| Percorso | Contenuto |
|----------|-----------|
| `web/` | Interfaccia (`index.html`, `src/main.js`, `src/styles.css`) |
| `py/mypay4_core/` | Logica Python: CSV/ZIP, validatori, XML bilancio, aumento massivo, costanti |
| `tests/` | Test con `pytest` (`test_core.py`, `test_bulk_increase.py`; opzionale `test_parity.py` se è disponibile il progetto generator accanto per confronto header) |

## Avvio locale

Servire la cartella **radice del repository** con un server HTTP (non aprire `index.html` da file system, altrimenti i moduli Python non si caricano).

Dalla directory del progetto (quella che contiene `web/` e `py/`):

```powershell
python -m http.server 8080
```

Poi apri nel browser:

**http://localhost:8080/web/**

Se avvii `http.server` da una cartella **padre** (es. `Desktop`), l’URL includerà il nome della cartella del progetto, ad esempio `http://localhost:8080/mypay4-csv-generator-web/web/`.

## Test

Dalla radice del repository:

```powershell
python -m pytest tests -v
```

È richiesto Python 3.9+ con `pytest` installato. I test non avviano il browser; verificano solo il pacchetto in `py/mypay4_core/`.

## Deploy statico

Il sito è un **sito statico** (HTML/JS + file `.py` serviti come asset). Pubblicare la **radice del repository** su hosting come Cloudflare Pages, Netlify o GitHub Pages. Pagina di ingresso: `web/index.html` (configurare *publish directory* / *root* in base alla piattaforma).

## Note tecniche

- Pyodide viene caricato da **CDN**; i file in `py/mypay4_core/` sono richiesti via `fetch` dal percorso `../py/mypay4_core/` relativo a `web/`.
- Il nome interno del file `.csv` nello ZIP e il nome suggerito per il download `.zip` seguono le convenzioni usate in produzione per MyPay (vedi interfaccia **Salva come…**).
