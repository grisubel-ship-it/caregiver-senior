import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SUGGESTED = ["08:00", "20:00", "13:00", "18:00", "10:00", "16:00", "22:00", "06:00"];
const nextFree = (times) => SUGGESTED.find((t) => !times.includes(t)) || "12:00";

function TimesField({ times, setTimes }) {
  const set = (i, v) => setTimes(times.map((t, j) => (j === i ? v : t)));
  return (
    <div className="space-y-1.5">
      <Label>Orari (ogni giorno)</Label>
      <div className="flex flex-wrap gap-2">
        {times.map((t, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input type="time" value={t} onChange={(e) => set(i, e.target.value)} className="w-28" data-testid={`reminder-time-input-${i}`} />
            {times.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => setTimes(times.filter((_, j) => j !== i))} aria-label="Togli orario" data-testid={`reminder-time-remove-${i}`}>
                <X size={14} />
              </Button>
            )}
          </div>
        ))}
        {times.length < 8 && (
          <Button variant="outline" size="sm" onClick={() => setTimes([...times, nextFree(times)])} data-testid="reminder-time-add-btn">
            <Plus size={14} className="mr-1" /> Orario
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReminderDialog({ open, initial, busy, onSave, onCancel }) {
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState(["08:00"]);
  useEffect(() => {
    if (!open) return;
    setMedication(initial?.medication || "");
    setDose(initial?.dose || "");
    setTimes(initial?.times?.length ? initial.times : ["08:00"]);
  }, [open, initial]);
  const dup = new Set(times).size !== times.length;
  const valid = medication.trim() && times.every((t) => /^\d{2}:\d{2}$/.test(t)) && !dup;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg" data-testid="reminder-dialog">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifica promemoria" : "Nuovo promemoria"}</DialogTitle>
          <DialogDescription>Visibile a tutti i caregiver: ognuno sceglie se ricevere l'avviso sul proprio telefono.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Farmaco</Label>
            <Input value={medication} maxLength={80} onChange={(e) => setMedication(e.target.value)} placeholder="Es. Ramipril" data-testid="reminder-medication-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Dose (facoltativa)</Label>
            <Input value={dose} maxLength={60} onChange={(e) => setDose(e.target.value)} placeholder="Es. 5 mg, 1 compressa" data-testid="reminder-dose-input" />
          </div>
          <TimesField times={times} setTimes={setTimes} />
          {dup && <p className="text-xs text-red-600" data-testid="reminder-dup-error">Ci sono due orari uguali.</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy} data-testid="reminder-cancel-btn">Annulla</Button>
          <Button onClick={() => onSave({ medication: medication.trim(), dose: dose.trim(), times })} disabled={busy || !valid} className="bg-teal-600 hover:bg-teal-700" data-testid="reminder-save-btn">
            {busy ? <Loader2 size={16} className="mr-1 animate-spin" /> : null} Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
