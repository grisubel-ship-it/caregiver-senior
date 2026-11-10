import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlarmClock, Plus, MoreVertical, Pencil, Pause, Play, Trash2, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isNative } from "@/lib/subscription";
import { listReminders, createReminder, updateReminder, deleteReminder, enabledIds, setEnabledHere, syncReminders } from "@/lib/reminders";
import { ReminderDialog } from "@/components/ReminderDialog";

const errMsg = (e, fb) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : d?.message || fb;
};

function ReminderRow({ r, on, onToggle, onEdit, onPause, onDelete }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border border-stone-200 ${r.active ? "" : "opacity-60"}`} data-testid={`reminder-row-${r.id}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-900 truncate">
          {r.medication}
          {r.dose && <span className="font-normal text-stone-500"> · {r.dose}</span>}
          {!r.active && <span className="ml-1 text-xs text-amber-700">(sospeso)</span>}
        </div>
        <div className="flex flex-wrap gap-1 mt-1" data-testid={`reminder-times-${r.id}`}>
          {r.times.map((t) => (
            <span key={t} className="text-xs px-1.5 rounded bg-teal-50 text-teal-800">{t}</span>
          ))}
        </div>
      </div>
      {isNative() && (
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          <BellRing size={14} />
          <Switch checked={on} onCheckedChange={(v) => onToggle(r, v)} disabled={!r.active} aria-label="Avvisami su questo telefono" data-testid={`reminder-notify-${r.id}`} />
        </label>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Altre azioni" data-testid={`reminder-menu-${r.id}`}>
            <MoreVertical size={16} className="text-stone-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(r)} data-testid={`reminder-edit-${r.id}`}><Pencil size={14} className="mr-2" /> Modifica</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onPause(r)} data-testid={`reminder-pause-${r.id}`}>
            {r.active ? <Pause size={14} className="mr-2" /> : <Play size={14} className="mr-2" />} {r.active ? "Sospendi" : "Riattiva"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDelete(r)} className="text-red-600" data-testid={`reminder-delete-${r.id}`}><Trash2 size={14} className="mr-2" /> Elimina</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RemindersSection({ patientId }) {
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(enabledIds);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const resync = () => syncReminders().catch(() => {}).finally(() => setEnabled(enabledIds()));

  const load = useCallback(async () => {
    try {
      setItems(await listReminders(patientId));
    } catch {
      /* non critico */
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (body) => {
    setBusy(true);
    try {
      if (dialog === "new") {
        const r = await createReminder(patientId, body);
        if (isNative()) await setEnabledHere(r.id, true).catch(() => false);
        toast.success(isNative() ? "Promemoria creato: riceverai l'avviso su questo telefono" : "Promemoria creato");
      } else {
        await updateReminder(dialog.id, body);
        toast.success("Promemoria aggiornato");
      }
      setDialog(null);
      await load();
      resync();
    } catch (e) {
      toast.error(errMsg(e, "Salvataggio non riuscito"));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn, ok) => {
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
      resync();
    } catch (e) {
      toast.error(errMsg(e, "Operazione non riuscita"));
    }
  };

  const toggle = async (r, on) => {
    try {
      const done = await setEnabledHere(r.id, on);
      if (!done) toast.error("Consenti le notifiche per Caregiver Senior nelle impostazioni del telefono");
    } catch {
      toast.error("Impossibile programmare l'avviso");
    }
    setEnabled(enabledIds());
  };

  return (
    <Card data-testid="reminders-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlarmClock size={16} className="text-teal-600" /> Promemoria farmaci
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDialog("new")} data-testid="add-reminder-btn">
            <Plus size={16} className="mr-1" /> Aggiungi
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-stone-500" data-testid="reminders-empty">
            Imposta gli orari delle terapie: chi attiva l'avviso riceve una notifica sul telefono ogni giorno.
          </p>
        ) : (
          items.map((r) => (
            <ReminderRow
              key={r.id}
              r={r}
              on={enabled.includes(r.id)}
              onToggle={toggle}
              onEdit={setDialog}
              onPause={(x) => act(() => updateReminder(x.id, { active: !x.active }), x.active ? "Promemoria sospeso" : "Promemoria riattivato")}
              onDelete={(x) => window.confirm(`Eliminare il promemoria "${x.medication}"?`) && act(() => deleteReminder(x.id), "Promemoria eliminato")}
            />
          ))
        )}
        {!isNative() && items.length > 0 && (
          <p className="text-xs text-stone-500" data-testid="reminders-web-note">Le notifiche arrivano sull'app installata su Android o iPhone.</p>
        )}
      </CardContent>
      <ReminderDialog open={Boolean(dialog)} initial={dialog === "new" ? null : dialog} busy={busy} onSave={save} onCancel={() => setDialog(null)} />
    </Card>
  );
}
