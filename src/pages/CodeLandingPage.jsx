import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Building2, Copy, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { playUrlWithCode } from "@/lib/subscription";
import { StoreButtons } from "@/pages/DownloadPage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const intentUrl = (code) =>
  `intent://redeem?code=${code}#Intent;scheme=caregiversync;package=com.caregiversync.app;` +
  `S.browser_fallback_url=${encodeURIComponent(playUrlWithCode(code))};end`;

export default function CodeLandingPage() {
  const { code: raw } = useParams();
  const code = (raw || "").toUpperCase();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/conventions/${code}/info`)
      .then(({ data }) => setInfo(data))
      .catch(() => setError(true));
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Codice copiato");
    } catch {
      toast.info(`Il tuo codice: ${code}`);
    }
  };

  if (error) {
    return (
      <Card className="max-w-md mx-auto border-red-200 bg-red-50" data-testid="code-landing-invalid">
        <CardContent className="p-6 text-center text-red-900">
          <div className="font-semibold text-lg">Codice non valido</div>
          <p className="text-sm mt-1">Il codice {code} non esiste o non è più attivo. Contatta la tua cooperativa.</p>
        </CardContent>
      </Card>
    );
  }
  if (!info) return <div className="py-24 text-center text-stone-500 text-sm">Caricamento…</div>;

  const isAndroid = /android/i.test(navigator.userAgent);
  const mesi = info.duration_months === 1 ? "mese" : "mesi";

  return (
    <div className="max-w-md mx-auto space-y-5" data-testid="code-landing-page">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 mx-auto grid place-items-center">
          <Building2 size={26} className="text-white" />
        </div>
        <p className="text-sm text-stone-500">Offerto da</p>
        <h1 className="text-3xl font-serif text-stone-900" data-testid="code-landing-coop">{info.cooperative_name}</h1>
        <p className="text-stone-600 text-sm">
          Caregiver Senior Premium gratuito per {info.duration_months} {mesi}.
        </p>
      </div>

      <Card className="border-2 border-dashed border-teal-500 bg-teal-50">
        <CardContent className="p-5 text-center space-y-2">
          <div className="text-xs font-semibold tracking-widest text-teal-800">IL TUO CODICE CONVENZIONE</div>
          <div className="font-mono text-3xl font-bold text-stone-900 break-all" data-testid="code-landing-code">{code}</div>
          <Button variant="ghost" size="sm" onClick={copy} className="text-teal-700" data-testid="code-landing-copy-btn">
            <Copy size={14} className="mr-1" /> Copia codice
          </Button>
        </CardContent>
      </Card>

      {!info.available && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3" data-testid="code-landing-full">
          Questo codice ha raggiunto il numero massimo di attivazioni. Contatta la tua cooperativa.
        </p>
      )}

      <div className="space-y-2">
        {isAndroid && (
          <a href={intentUrl(code)} className="block" data-testid="code-landing-open-app">
            <Button className="w-full bg-teal-600 hover:bg-teal-700 h-12">
              <Smartphone size={18} className="mr-2" /> Apri nell'app
            </Button>
          </a>
        )}
        <StoreButtons playHref={playUrlWithCode(code)} />
        <p className="text-xs text-stone-500 text-center">
          Su Android, installando da questo link il codice si attiva da solo al primo avvio. In alternativa apri l'app, tocca Premium e
          inserisci il codice.
        </p>
      </div>
    </div>
  );
}
