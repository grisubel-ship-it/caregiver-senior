import { Link } from "react-router-dom";
import { ChevronLeft, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const SUPPORT_EMAIL = "cargiversync@libero.it";

const Back = ({ testId }) => (
  <Link to="/impostazioni" className="text-teal-700 text-sm inline-flex items-center gap-1" data-testid={testId}>
    <ChevronLeft size={16} /> Indietro
  </Link>
);

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-base md:text-lg font-semibold text-stone-900">{title}</h2>
    <div className="text-sm text-stone-700 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Contact = () =>
  SUPPORT_EMAIL ? (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-teal-700 font-medium underline" data-testid="support-email-link">
      {SUPPORT_EMAIL}
    </a>
  ) : (
    <span data-testid="support-email-missing">l'indirizzo email indicato nella scheda dell'app sullo store</span>
  );

const PRIVACY = [
  ["Chi siamo", <p key="a">Caregiver Senior è un diario organizzativo per familiari, badanti e OSS che assistono una persona anziana o con malattia cronica. Non è un dispositivo medico. Per qualsiasi richiesta sulla privacy scrivi a <Contact />.</p>],
  ["Quali dati trattiamo", <>
    <p>Solo i dati che inserisci tu: profilo dell'assistito (nome, patologia, età facoltative), voci del diario (parametri, farmaci, sintomi, note) e documenti che scansioni o alleghi (ricette, referti) salvati in PDF.</p>
    <p>Sono dati relativi alla salute (art. 9 GDPR): li trattiamo solo perché li inserisci volontariamente, con il consenso dell'assistito o come persona autorizzata.</p>
    <p>Per far funzionare prova gratuita e abbonamento usiamo un codice casuale del dispositivo, non collegato al tuo nome. Non chiediamo registrazione, email, posizione, contatti né identificatori pubblicitari.</p>
  </>],
  ["Fotocamera e documenti", <p>La fotocamera si apre solo quando tocchi «Scansiona». Le pagine vengono unite in un PDF e allegate alla scheda dell'assistito. Non usiamo le immagini per altri scopi.</p>],
  ["Intelligenza artificiale", <p>Solo se tocchi «Genera consegna con IA», le note del periodo scelto vengono inviate al modello Claude di Anthropic (tramite la piattaforma Emergent) per scrivere il riassunto. Anthropic non usa questi dati per addestrare i modelli. Senza toccare il pulsante nessun dato viene inviato.</p>],
  ["Con chi condividiamo i dati", <p>Nessuna pubblicità, nessuna vendita di dati. I dati sono ospitati da Emergent (server e database); Anthropic li riceve solo per la funzione IA; gli acquisti sono gestiti da Apple / Google tramite RevenueCat, che riceve solo il codice casuale del dispositivo e lo stato dell'abbonamento.</p>],
  ["Sicurezza e conservazione", <p>Comunicazioni cifrate (HTTPS). I dati restano finché non li cancelli tu. I log tecnici del server sono conservati al massimo 30 giorni.</p>],
  ["I tuoi diritti e la cancellazione", <>
    <p>Puoi vedere, modificare e cancellare i dati direttamente nell'app: Impostazioni → «Reset totale dell'app» elimina subito assistiti, diario e documenti. Puoi anche scriverci per accesso, portabilità o cancellazione: rispondiamo entro 30 giorni.</p>
    <p>Puoi presentare reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>
  </>],
  ["Minori e tracciamento", <p>L'app non è destinata a minori di 18 anni. Non usiamo cookie di profilazione né strumenti di tracciamento o analisi di terze parti.</p>],
];

export function PrivacyPage() {
  return (
    <div className="space-y-6" data-testid="privacy-page">
      <Back testId="privacy-back" />
      <div>
        <h1 className="text-3xl font-serif text-stone-900">Privacy</h1>
        <p className="text-stone-500 text-sm mt-1">Informativa ai sensi del GDPR · aggiornata a giugno 2026</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {PRIVACY.map(([title, body]) => (
            <Section key={title} title={title}>{body}</Section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const FAQ = [
  ["Come aggiungo un assistito?", "Dalla home tocca «Nuovo assistito», inserisci il nome e salva."],
  ["Come scansiono un documento?", "Apri la scheda dell'assistito, sezione Documenti, tocca «Scansiona». Puoi fotografare più pagine: diventano un unico PDF. Funzione Premium o in prova."],
  ["Come attivo Premium con un codice convenzione?", "Tocca «Premium» in alto, poi «Hai un codice?» e inserisci il codice ricevuto dalla tua cooperativa."],
  ["Come disdico l'abbonamento?", "iPhone: Impostazioni → il tuo nome → Abbonamenti. Android: Google Play → Pagamenti e abbonamenti. La disdetta vale dal rinnovo successivo."],
  ["Come cancello tutti i dati?", "Impostazioni → «Reset totale dell'app». La cancellazione è immediata e definitiva."],
];

export function SupportPage() {
  return (
    <div className="space-y-6" data-testid="support-page">
      <Back testId="support-back" />
      <div>
        <h1 className="text-3xl font-serif text-stone-900">Supporto</h1>
        <p className="text-stone-500 text-sm mt-1">Domande frequenti e contatti</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-5">
          {FAQ.map(([q, a]) => (
            <Section key={q} title={q}><p>{a}</p></Section>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 flex items-start gap-3 text-sm text-stone-700" data-testid="support-contact">
          <Mail size={18} className="text-teal-700 mt-0.5 shrink-0" />
          <p>Non trovi la risposta? Scrivici a <Contact />: rispondiamo entro 2 giorni lavorativi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
