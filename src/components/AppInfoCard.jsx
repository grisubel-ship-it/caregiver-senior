import { useEffect, useState } from "react";
import axios from "axios";
import { Capacitor } from "@capacitor/core";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const PROD_HOST = "app-release-config.emergent.host";
const PLATFORMS = { android: "Android", ios: "iPhone / iPad", web: "Web" };

const Row = ({ label, value, testId }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-stone-100 last:border-0">
    <span className="text-stone-500">{label}</span>
    <span className="font-medium text-stone-800 text-right break-all" data-testid={testId}>{value}</span>
  </div>
);

export const AppInfoCard = () => {
  const [version, setVersion] = useState("Versione web");
  const [online, setOnline] = useState(null);
  const host = new URL(BACKEND).host;
  const isProd = host === PROD_HOST;
  const platform = Capacitor.getPlatform();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App }) =>
        App.getInfo().then((i) => setVersion(`${i.version} (build ${i.build})`)).catch(() => {})
      );
    }
    axios.get(`${BACKEND}/api/`, { timeout: 8000 }).then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  const status = online === null ? "Verifica…" : online ? "Collegato" : "Non raggiungibile";

  return (
    <Card data-testid="app-info-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Info size={18} /> Informazioni app</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <Row label="Versione" value={version} testId="app-info-version" />
        <Row label="Dispositivo" value={PLATFORMS[platform] || platform} testId="app-info-platform" />
        <Row label="Server" value={isProd ? "Ufficiale" : "Di prova (anteprima)"} testId="app-info-server-type" />
        <Row label="Indirizzo" value={host} testId="app-info-server-host" />
        <Row label="Stato" value={status} testId="app-info-server-status" />
        {!isProd && (
          <p className="text-xs text-amber-700 mt-3" data-testid="app-info-preview-warning">
            Questa app è collegata al server di prova: i dati non sono quelli ufficiali.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
