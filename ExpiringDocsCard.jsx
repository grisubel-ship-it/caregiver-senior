import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, FileText, BellRing } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { isNative } from "@/lib/subscription";
import { listExpiring } from "@/lib/scanner";
import { expiryAlertsOn, setExpiryAlerts } from "@/lib/reminders";
import { categoryLabel, expiryInfo } from "@/components/DocumentDialogs";

function AlertsToggle() {
  const [on, setOn] = useState(expiryAlertsOn);
  const change = async (v) => {
    try {
      const ok = await setExpiryAlerts(v);
      if (!ok) toast.error("Consenti le notifiche per Caregiver Senior nelle impostazioni del telefono");
      else toast.success(v ? "Riceverai gli avvisi di scadenza su questo telefono" : "Avvisi di scadenza disattivati");
    } catch {
      toast.error("Impossibile programmare gli avvisi");
    }
    setOn(expiryAlertsOn());
  };
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-stone-700 pt-1">
      <span className="flex items-center gap-2"><BellRing size={14} className="text-teal-700" /> Avvisami su questo telefono</span>
      <Switch checked={on} onCheckedChange={change} data-testid="expiry-alerts-toggle" />
    </label>
  );
}

export function ExpiringDocsCard() {
  const [docs, setDocs] = useState(null);
  useEffect(() => {
    listExpiring(30).then(setDocs).catch(() => setDocs([]));
  }, []);
  if (!docs) return null;
  if (!docs.length && !isNative()) return null;

  return (
    <Card className={docs.some((d) => expiryInfo(d.expires_on).days <= 7) ? "border-amber-300" : ""} data-testid="expiring-docs-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><CalendarClock size={16} className="text-amber-600" /> Documenti in scadenza</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {docs.length === 0 && <p className="text-sm text-stone-500" data-testid="expiring-docs-empty">Nessun documento in scadenza nei prossimi 30 giorni.</p>}
        {docs.map((d) => {
          const exp = expiryInfo(d.expires_on);
          return (
            <Link key={d.id} to={`/paziente/${d.patient_id}?doc=${d.id}`} className="flex items-center gap-3 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors" data-testid={`expiring-doc-${d.id}`}>
              <FileText size={18} className="text-red-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-stone-900 truncate">{d.title}</div>
                <div className="text-xs text-stone-500 truncate">{categoryLabel(d.category)} · {d.patient_name}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${exp.cls}`}>{exp.text}</span>
            </Link>
          );
        })}
        {isNative() && <AlertsToggle />}
      </CardContent>
    </Card>
  );
}
