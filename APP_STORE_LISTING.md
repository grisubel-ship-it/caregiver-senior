# Scheda App Store — Caregiver Senior

## Dati app (App Store Connect → Informazioni app)
| Campo | Valore |
|---|---|
| **Nome** (max 30) | `Caregiver Senior` (16 caratteri) |
| **Sottotitolo** (max 30) | `Anziani & Cronici` |
| **Nome sotto l'icona** | `Caregiver Senior` (già impostato nel progetto) |
| **Bundle ID** | `com.caregiversync.app` |
| **SKU** | `caregiversenior` |
| **Lingua principale** | Italiano |
| **Categoria principale** | Salute e fitness |
| **Categoria secondaria** | Lifestyle |
| **Classificazione età** | 4+ (nessun contenuto sensibile) |
| **Copyright** | `2026 Caregiver Senior` |
| **Versione / Build** | 1.6.0 / 10 |

> ⚠️ Non usare la categoria "Medicina": revisione più severa. L'app è un diario organizzativo, NON un dispositivo medico.

## Parole chiave (max 100 caratteri, separate da virgola, senza spazi)
```
diario,cura,anziani,badante,assistenza,famiglia,oss,turni,consegne,cooperativa,familiare,note
```

## Testo promozionale (max 170)
```
Prova gratis 30 giorni. Il diario condiviso per familiari, badanti e OSS: annota, condividi e passa le consegne in un tocco.
```

## Descrizione (max 4000)
```
Caregiver Senior è il DIARIO PERSONALE DI CURA per le famiglie che assistono un anziano o un familiare non autosufficiente. Non è un dispositivo medico e non sostituisce il parere di un professionista sanitario: è uno strumento organizzativo per chi si prende cura di qualcuno.

DIARIO GIORNALIERO CONDIVISO
Annota osservazioni, routine, orari e note libere. Familiari, badanti e OSS trovano subito tutto ciò che serve per il turno.

CONSEGNE CON INTELLIGENZA ARTIFICIALE
Con un tocco l'app riassume le note recenti in un breve testo di passaggio consegne, in italiano. Ideale ai cambi turno o per aggiornare un familiare a distanza.

ANDAMENTO NEL TEMPO
Grafici semplici dei valori che scegli tu di annotare.

CONVENZIONI CON COOPERATIVE
Se la tua cooperativa o il tuo ente ha una convenzione, inserisci il codice e sblocca Premium senza pagare.

PRIVACY — GDPR
• Nessuna registrazione obbligatoria
• Puoi cancellare tutti i dati in qualsiasi momento
• Nessuna condivisione con terzi e nessuna pubblicità

PROVA GRATUITA E ABBONAMENTO
30 giorni gratis senza carta. Poi abbonamento Premium:
• Mensile 4,99 €
• Annuale 49,90 € (2 mesi gratis)
Il pagamento viene addebitato sull'Apple ID alla conferma. L'abbonamento si rinnova automaticamente se non viene disattivato almeno 24 ore prima della scadenza. Puoi gestire o disdire l'abbonamento dalle impostazioni dell'Apple ID.

Termini d'uso (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy: [URL della privacy policy]
```

## URL richiesti
| Campo | Valore |
|---|---|
| URL supporto | stesso sito/pagina usata per Google Play |
| URL privacy policy | pubblicare `PRIVACY_POLICY.md` (lo stesso di Android) |

## Abbonamenti (App Store Connect → Abbonamenti)
- Gruppo: `Caregiver Senior Premium`
- Prodotto 1 — ID `premium_monthly` — 1 mese — **4,99 €** — **senza** prova gratuita (la prova di 30 giorni è gestita dall'app)
- Prodotto 2 — ID `premium_yearly` — 1 anno — **49,90 €** — **senza** prova gratuita
- Nome visualizzato: `Premium mensile` / `Premium annuale`
- In RevenueCat: aggiungi app iOS, collega entrambi i prodotti all'entitlement **`pro_access`** e all'offering di default (pacchetti Monthly / Annual)

## Privacy dell'app (App Store Connect → Privacy dell'app)
- Dati raccolti: **Contenuti utente** (note del diario) e **Identificatori** (ID dispositivo) → usati per *Funzionalità dell'app*, **non** collegati all'identità, **non** usati per tracciamento
- Acquisti → *Funzionalità dell'app* (gestiti da Apple/RevenueCat)
- Tracciamento: **No**

## Note per la revisione Apple
```
L'app è un diario organizzativo per caregiver familiari, non un dispositivo medico.
Non serve login. Al primo avvio parte una prova gratuita di 30 giorni.
Per testare Premium senza acquisto usare il codice convenzione: [crea un codice dall'area admin, es. APPLEREVIEW, 5 attivazioni, 1 mese]
Pagina Premium: icona "Premium" in alto a destra.
```

## Screenshot
Apple richiede iPhone 6,9"/6,7" (1290×2796). Usare gli screenshot "safe" del kit Android ridimensionati, oppure chiedere una nuova versione in questo formato.
