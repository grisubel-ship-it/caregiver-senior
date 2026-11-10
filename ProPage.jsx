import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, Crown, Check, Zap, RefreshCw, Ticket, Building2, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/components/AccessGate";
import {
  isNative,
  configureRevenueCat,
  getOfferings,
  purchasePackage,
  restorePurchases,
  rememberStorePro,
  redeemConvention,
  pickPackages,
} from "@/lib/subscription";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("it-IT") : "");

const FEATURES = [
  "Assistiti e diario clinico illimitati",
  "Consegne fra turni generate con IA",
  "Grafici andamento e storico completo",
  "Supporto prioritario",
];

function StatusCard({ status }) {
  if (!status) return null;
  const { reason, convention, subscription, trial_days_left, trial_ends_at } = status;
  const map = {
    subscription: { icon: Crown, tone: "teal", title: "Abbonamento Premium attivo", sub: subscription?.expires_at ? `Rinnovo: ${fmtDate(subscription.expires_at)}` : "Grazie per il supporto" },
    convention: { icon: Building2, tone: "teal", title: `Premium tramite ${convention?.cooperative_name}`, sub: `Codice ${convention?.code} · valido fino al ${fmtDate(convention?.expires_at)}` },
    trial: { icon: Clock, tone: "amber", title: `Prova gratuita: ${trial_days_left} giorni rimasti`, sub: `Termina il ${fmtDate(trial_ends_at)}. Nessuna carta richiesta.` },
    expired: { icon: Lock, tone: "red", title: "La prova gratuita è terminata", sub: "Per continuare ad usare l'app scegli un abbonamento o inserisci un codice convenzione." },
  };
  const s = map[reason];
  if (!s) return null;
  const Icon = s.icon;
  const tones = { teal: "border-teal-300 bg-teal-50 text-teal-900", amber: "border-amber-200 bg-amber-50 text-amber-900", red: "border-red-200 bg-red-50 text-red-900" };
  return (
    <Card className={tones[s.tone]} data-testid={`access-status-${reason}`}>
      <CardContent className="p-4 flex gap-3 items-start">
        <Icon size={22} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold" data-testid="access-status-title">{s.title}</div>
          <div className="text-sm opacity-80">{s.sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ kind, pkg, busy, onBuy }) {
  const yearly = kind === "yearly";
  const price = pkg?.product?.priceString || (yearly ? "€49,90" : "€4,99");
  return (
    <Card className={yearly ? "border-teal-400 ring-2 ring-teal-100" : ""} data-testid={`plan-${kind}`}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-stone-900 flex items-center gap-2 flex-wrap">
            {yearly ? "Annuale" : "Mensile"}
            {yearly && <Badge className="bg-teal-600 hover:bg-teal-700">2 mesi gratis</Badge>}
          </div>
          <div className="text-sm text-stone-600 mt-0.5" data-testid={`plan-${kind}-price`}>
            {price} {yearly ? "/ anno" : "/ mese"}
          </div>
        </div>
        <Button onClick={() => onBuy(pkg)} disabled={busy || !pkg} className="bg-teal-600 hover:bg-teal-700 shrink-0" data-testid={`buy-${kind}-btn`}>
          <Zap size={14} className="mr-1" /> Abbonati
        </Button>
      </CardContent>
    </Card>
  );
}

function ConventionCard({ onRedeemed, initialCode }) {
  const [code, setCode] = useState(initialCode || "");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (code.trim().length < 3) return toast.error("Inserisci un codice valido");
    setBusy(true);
    try {
      const data = await redeemConvention(code.trim());
      toast.success(`Premium attivato tramite ${data.convention?.cooperative_name}`);
      setCode("");
      onRedeemed();
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Impossibile verificare il codice. Riprova.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card data-testid="convention-card">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-stone-900">
          <Ticket size={18} className="text-teal-600" /> Hai un codice convenzione?
        </div>
        <p className="text-sm text-stone-500">Se la tua cooperativa o il tuo ente ti ha fornito un codice, inseriscilo qui per sbloccare Premium.</p>
        <form onSubmit={submit} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ES. COOP-1A2B3C" className="uppercase tracking-wider" data-testid="convention-code-input" />
          <Button type="submit" disabled={busy} variant="outline" className="border-teal-600 text-teal-700 shrink-0" data-testid="convention-redeem-btn">
            {busy ? "Verifica…" : "Attiva"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ProPage() {
  const { status, refresh } = useAccess();
  const [params] = useSearchParams();
  const linkCode = (params.get("code") || "").toUpperCase();
  const [packages, setPackages] = useState({});
  const [busy, setBusy] = useState(false);
  const native = isNative();
  const locked = status && !status.access;
  const premium = status && ["subscription", "convention"].includes(status.reason);

  useEffect(() => {
    refresh();
    (async () => {
      try {
        await configureRevenueCat();
        setPackages(pickPackages(await getOfferings()));
      } catch (e) {
        console.warn("[Pro] RevenueCat non disponibile", e);
      }
    })();
  }, [refresh]);

  const handleBuy = async (pkg) => {
    setBusy(true);
    try {
      const info = await purchasePackage(pkg);
      rememberStorePro(info);
      toast.success("Abbonamento attivato!");
      await refresh();
      setTimeout(refresh, 3000);
    } catch (err) {
      if (!err?.userCancelled) toast.error("Acquisto non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const info = await restorePurchases();
      if (rememberStorePro(info)) {
        toast.success("Abbonamento ripristinato");
        await refresh();
      } else toast.info("Nessun abbonamento attivo trovato");
    } catch {
      toast.error("Ripristino non riuscito");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto" data-testid="pro-page">
      {!locked && (
        <Link to="/" className="text-teal-700 text-sm inline-flex items-center gap-1" data-testid="back-to-home">
          <ChevronLeft size={16} /> Torna alla home
        </Link>
      )}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 mx-auto grid place-items-center">
          <Crown size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-serif text-stone-900">Caregiver Senior Premium</h1>
        <p className="text-stone-600 text-sm">30 giorni di prova gratuita, poi scegli come continuare.</p>
      </div>

      <StatusCard status={status} />

      {!premium && (
        <>
          <Card>
            <CardContent className="p-5 space-y-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2 text-sm">
                  <Check size={16} className="text-teal-600 mt-0.5 shrink-0" />
                  <span className="text-stone-700">{f}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <PlanCard kind="yearly" pkg={packages.yearly} busy={busy} onBuy={handleBuy} />
            <PlanCard kind="monthly" pkg={packages.monthly} busy={busy} onBuy={handleBuy} />
            {!native && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3" data-testid="web-billing-note">
                L'abbonamento si attiva dall'app installata da Google Play o App Store.
              </p>
            )}
            {native && (
              <Button variant="ghost" size="sm" onClick={handleRestore} disabled={busy} className="w-full text-stone-600" data-testid="restore-purchases-btn">
                <RefreshCw size={14} className="mr-1" /> Ripristina acquisti
              </Button>
            )}
            <p className="text-[11px] text-stone-400 text-center">
              Rinnovo automatico, disdici quando vuoi dalle impostazioni dello store.
            </p>
          </div>

          <ConventionCard key={linkCode} initialCode={linkCode} onRedeemed={refresh} />
        </>
      )}
    </div>
  );
}
