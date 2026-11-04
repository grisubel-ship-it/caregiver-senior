# Guida iOS — Caregiver Senior

## Cosa contiene `ios-project.zip`
```
caregiver-senior-ios/
├── ios/                    → progetto Xcode (Capacitor 6) già sincronizzato, versione 1.6.0 build 10
├── src/, public/           → sorgente web React (per ricompilare con la chiave iOS)
├── package.json, yarn.lock, capacitor.config.js, .env.production
├── APP_STORE_LISTING.md    → nome, sottotitolo, parole chiave, descrizione, abbonamenti, privacy
└── IOS_BUILD_GUIDE.md      → questa guida
```

## Specifiche
| Campo | Valore |
|---|---|
| Nome App Store | **Caregiver Senior** |
| Nome sotto l'icona | Caregiver Senior |
| Bundle ID | `com.caregiversync.app` |
| Versione | 1.6.0 (build 10) |
| iOS minimo | 13.0 (Capacitor 6) |
| Categoria | Salute e fitness (secondaria: Lifestyle) |
| Abbonamenti | `premium_monthly` 4,99 € · `premium_yearly` 49,90 € — senza trial Apple |
| Entitlement RevenueCat | `pro_access` |
| Prova gratuita | 30 giorni gestiti dall'app (nessuna configurazione su Apple) |
| URL scheme | `caregiversync://` (link cooperative) |
| Crittografia | `ITSAppUsesNonExemptEncryption = NO` (già impostato) |
| Backend | produzione, già configurato |

## Passi per lo sviluppatore (Mac + Xcode 15+)
1. `unzip ios-project.zip && cd caregiver-senior-ios`
2. Su RevenueCat aggiungi l'app iOS e copia la **chiave pubblica Apple** (`appl_...`)
3. Incollala in `.env.production` alla riga `REACT_APP_RC_IOS_KEY=`
4. `yarn install && yarn build && npx cap sync ios`
5. `cd ios/App && pod install` poi apri `App.xcworkspace`
6. Signing & Capabilities: seleziona il Team Apple, aggiungi la capability **In-App Purchase**
7. Su App Store Connect crea l'app con nome **Caregiver Senior** e Bundle ID `com.caregiversync.app`; crea i 2 abbonamenti come da `APP_STORE_LISTING.md`
8. Xcode → **Product → Archive → Distribute App → App Store Connect → Upload**
9. Compila la scheda con i testi di `APP_STORE_LISTING.md` e invia in revisione

> Senza la chiave iOS l'app funziona lo stesso (prova e codici convenzione), ma i pulsanti di acquisto restano disattivati.

## Testo per il freelance
```
Ciao, ho un'app Capacitor 6 (React) già pubblicata su Google Play.
Mi serve pubblicarla su App Store:
1. Inserire la chiave RevenueCat iOS e ricompilare (istruzioni nello zip)
2. Firma con il mio Apple Developer account (ti invito nel team)
3. Creare 2 abbonamenti su App Store Connect
   (premium_monthly 4,99 €, premium_yearly 49,90 €, senza trial)
4. Caricare la build e inviarla in revisione con i testi forniti

Nome app: Caregiver Senior
Bundle ID: com.caregiversync.app
Ho pronti: icona 1024, screenshot, testi, privacy policy.
Preventivo e tempi?
```
