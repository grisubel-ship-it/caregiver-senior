import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSummary } from "@/lib/scanner";

export function DoctorSummaryCard({ patient }) {
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await getSummary(patient, Number(days));
    } catch (e) {
      if (/cancel|abort/i.test(String(e?.message || e))) return;
      toast.error(e?.response?.status === 402 ? "Funzione riservata a Premium o alla prova gratuita" : "Riepilogo non riuscito, riprova");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="doctor-summary-card">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 grid place-items-center shrink-0">
            <Stethoscope size={18} className="text-teal-700" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-stone-900">Riepilogo per il medico</div>
            <p className="text-sm text-stone-500">Un PDF con terapia, parametri, sintomi e note, con i documenti allegati in fondo.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="flex-1" data-testid="summary-days-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="summary-days-7">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30" data-testid="summary-days-30">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90" data-testid="summary-days-90">Ultimi 90 giorni</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={busy} className="bg-teal-600 hover:bg-teal-700" data-testid="summary-create-btn">
            {busy ? <Loader2 size={16} className="mr-1 animate-spin" /> : <FileDown size={16} className="mr-1" />} Crea PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
