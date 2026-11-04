import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAccess,
  hasLocalStorePro,
  initAppUserId,
  consumeInstallReferrerCode,
  redeemConvention,
  isNative,
  parseCodeFromText,
} from "@/lib/subscription";

const AccessContext = createContext({ status: null, refresh: () => {} });
export const useAccess = () => useContext(AccessContext);

const OPEN_PATHS = ["/pro", "/admin"];
const isOpenPath = (p) => OPEN_PATHS.includes(p) || p.startsWith("/c/");

export function AccessProvider({ children }) {
  const [status, setStatus] = useState(null);
  const refresh = useCallback(async () => {
    try {
      await initAppUserId();
      const data = await fetchAccess();
      if (!data.access && hasLocalStorePro()) data.access = true;
      setStatus(data);
    } catch {
      // In caso di rete assente non blocchiamo l'utente
      setStatus({ access: true, reason: "offline" });
    }
  }, []);
  useEffect(() => {
    (async () => {
      await initAppUserId();
      const code = await consumeInstallReferrerCode();
      if (code) {
        try {
          const res = await redeemConvention(code);
          toast.success(`Premium attivato tramite ${res.convention?.cooperative_name}`);
        } catch {
          toast.info(`Codice ${code} non attivabile. Puoi inserirne un altro nella pagina Premium.`);
        }
      }
      refresh();
    })();
  }, [refresh]);
  return <AccessContext.Provider value={{ status, refresh }}>{children}</AccessContext.Provider>;
}

export function AccessGate({ children }) {
  const { status } = useAccess();
  const { pathname } = useLocation();
  if (isOpenPath(pathname)) return children;
  if (!status) {
    return (
      <div className="py-24 text-center text-stone-500 text-sm" data-testid="access-loading">
        Caricamento…
      </div>
    );
  }
  if (!status.access) return <Navigate to="/pro" replace />;
  return (
    <>
      <TrialEndingDialog status={status} />
      {children}
    </>
  );
}

export function TrialBanner() {
  const { status } = useAccess();
  const { pathname } = useLocation();
  if (!status || status.reason !== "trial" || pathname === "/admin" || pathname.startsWith("/c/")) return null;
  const days = status.trial_days_left;
  const urgent = days <= 3;
  return (
    <div className={urgent ? "bg-red-50 border-b border-red-200" : "bg-amber-50 border-b border-amber-200"} data-testid="trial-banner">
      <div className="max-w-4xl mx-auto px-5 py-2 flex items-center justify-between gap-3 text-sm">
        <span className={`flex items-center gap-2 ${urgent ? "text-red-800" : "text-amber-900"}`}>
          <Clock size={15} />
          <span data-testid="trial-days-left">
            Prova gratuita: {days} {days === 1 ? "giorno rimasto" : "giorni rimasti"}
          </span>
        </span>
        {pathname !== "/pro" && (
          <Link to="/pro" className="text-teal-700 font-medium whitespace-nowrap" data-testid="trial-banner-cta">
            Abbonati o usa un codice
          </Link>
        )}
      </div>
    </div>
  );
}

const REMINDER_KEY = "cgsync.trial_reminder_day";

function TrialEndingDialog({ status }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const due = status.reason === "trial" && status.trial_days_left <= 3 && localStorage.getItem(REMINDER_KEY) !== today;
  const [open, setOpen] = useState(due);
  const close = () => {
    localStorage.setItem(REMINDER_KEY, today);
    setOpen(false);
  };
  const days = status.trial_days_left;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg" data-testid="trial-ending-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {days === 1 ? "Ultimo giorno di prova" : `Mancano ${days} giorni`}
          </DialogTitle>
          <DialogDescription>
            La prova gratuita termina il {new Date(status.trial_ends_at).toLocaleDateString("it-IT")}. Poi l'app si bloccherà:
            abbonati ora o inserisci il codice della tua cooperativa per non perdere l'accesso al diario.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full bg-teal-600 hover:bg-teal-700" onClick={() => { close(); navigate("/pro"); }} data-testid="trial-dialog-subscribe-btn">
            Abbonati o usa un codice
          </Button>
          <Button variant="ghost" className="w-full" onClick={close} data-testid="trial-dialog-later-btn">
            Più tardi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Apre /pro con il codice precompilato quando l'app viene aperta da un link
export function DeepLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNative()) return undefined;
    let handle;
    (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("appUrlOpen", ({ url }) => {
        const code = parseCodeFromText(url);
        if (code) navigate(`/pro?code=${code}`);
      });
    })();
    return () => handle?.remove();
  }, [navigate]);
  return null;
}
