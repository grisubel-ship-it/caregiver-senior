import { useEffect } from "react";
import { Apple, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAY_URL, APP_STORE_URL, isAndroidDevice, isIOSDevice } from "@/lib/subscription";

export function StoreButtons({ playHref = PLAY_URL }) {
  const ios = isIOSDevice();
  return (
    <div className="space-y-2">
      <a href={playHref} target="_blank" rel="noreferrer" className="block" data-testid="store-btn-google-play">
        <Button className="w-full h-12 bg-stone-900 hover:bg-stone-800">
          <Smartphone size={18} className="mr-2" /> Scarica su Google Play
        </Button>
      </a>
      {APP_STORE_URL ? (
        <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className="block" data-testid="store-btn-app-store">
          <Button className="w-full h-12 bg-stone-900 hover:bg-stone-800">
            <Apple size={18} className="mr-2" /> Scarica su App Store
          </Button>
        </a>
      ) : (
        <p
          className={`text-sm text-center rounded-md p-3 ${ios ? "bg-amber-50 border border-amber-200 text-amber-900" : "text-stone-500"}`}
          data-testid="store-app-store-soon"
        >
          <Apple size={14} className="inline mr-1 -mt-0.5" />
          Su iPhone cerca <b>Caregiver Senior</b> nell'App Store.
        </p>
      )}
    </div>
  );
}

export default function DownloadPage() {
  useEffect(() => {
    if (isAndroidDevice()) window.location.replace(PLAY_URL);
    else if (isIOSDevice() && APP_STORE_URL) window.location.replace(APP_STORE_URL);
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6 py-6 text-center" data-testid="download-page">
      <h1 className="text-3xl font-serif text-stone-900">Scarica Caregiver Senior</h1>
      <p className="text-stone-600 text-sm">Il diario di cura per tutta la famiglia. 30 giorni gratis, senza registrazione.</p>
      <StoreButtons />
    </div>
  );
}
