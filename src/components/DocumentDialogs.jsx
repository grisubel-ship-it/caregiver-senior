import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const CATEGORIES = [
  { value: "ricetta", label: "Ricetta" },
  { value: "referto", label: "Referto" },
  { value: "piano_terapeutico", label: "Piano terapeutico" },
  { value: "esame", label: "Esame" },
  { value: "certificato", label: "Certificato" },
  { value: "impegnativa", label: "Impegnativa" },
  { value: "altro", label: "Altro" },
];
export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || "Altro";
export const EXPIRING = ["ricetta", "piano_terapeutico", "certificato", "impegnativa"];

const dayDiff = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
};

// Testo e colore della scadenza: rosso se scaduto, ambra entro 7 giorni
export function expiryInfo(iso) {
  if (!iso) return null;
  const n = dayDiff(iso);
  const date = new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  if (n < 0) return { text: `Scaduto il ${date}`, cls: "bg-red-50 text-red-700", days: n };
  if (n === 0) return { text: "Scade oggi", cls: "bg-red-50 text-red-700", days: n };
  if (n <= 7) return { text: `Scade tra ${n} ${n === 1 ? "giorno" : "giorni"}`, cls: "bg-amber-50 text-amber-800", days: n };
  return { text: `Scade il ${date}`, cls: "bg-stone-100 text-stone-600", days: n };
}

const today = () => new Date().toLocaleDateString("it-IT");
const autoTitle = (cat) => `${cat === "altro" ? "Documento" : categoryLabel(cat)} del ${today()}`;

function DocFields({ title, setTitle, category, setCategory, expires, setExpires }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="doc-category-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value} data-testid={`doc-category-option-${c.value}`}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Ricetta medico di base" data-testid="doc-title-input" />
      </div>
      {EXPIRING.includes(category) && (
        <div className="space-y-1.5">
          <Label>Scade il (facoltativo)</Label>
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} data-testid="doc-expires-input" />
          <p className="text-xs text-stone-500">Ti avvisiamo 7 giorni prima e il giorno stesso.</p>
        </div>
      )}
    </div>
  );
}

function DocDialog({ open, testId, heading, description, initial, busy, saveLabel, onSave, onCancel, children }) {
  const [title, setTitle] = useState("");
  const [expires, setExpires] = useState("");
  const [category, setCategory] = useState("altro");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCategory(initial?.category || "altro");
    setExpires(initial?.expires_on || "");
    setTitle(initial?.title || autoTitle(initial?.category || "altro"));
    setTouched(Boolean(initial?.title));
  }, [open, initial]);
  const changeCategory = (c) => {
    setCategory(c);
    if (!touched) setTitle(autoTitle(c));
  };
  const changeTitle = (t) => {
    setTouched(true);
    setTitle(t);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onCancel()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DocFields title={title} setTitle={changeTitle} category={category} setCategory={changeCategory} expires={expires} setExpires={setExpires} />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy} data-testid="doc-cancel-btn">Annulla</Button>
          <Button onClick={() => onSave({ title: title.trim(), category, expires_on: EXPIRING.includes(category) ? expires : "" })} disabled={busy || !title.trim()} className="bg-teal-600 hover:bg-teal-700" data-testid="doc-save-btn">
            {busy ? <Loader2 size={16} className="mr-1 animate-spin" /> : null} {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SaveScanDialog({ pages, busy, onSave, onCancel, renewing }) {
  return (
    <DocDialog
      open={pages.length > 0}
      testId="scan-save-dialog"
      heading={renewing ? "Rinnova documento" : "Salva documento"}
      description={`${pages.length} ${pages.length === 1 ? "pagina" : "pagine"} · ${renewing ? `sostituirà «${renewing.title}»` : "verrà salvato come PDF nella scheda dell'assistito"}`}
      initial={renewing}
      busy={busy}
      saveLabel="Salva PDF"
      onSave={onSave}
      onCancel={onCancel}
    >
      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="scan-preview">
        {pages.map((src, i) => (
          <img key={i} src={src} alt={`Pagina ${i + 1}`} className="h-28 rounded border border-stone-200 shrink-0" />
        ))}
      </div>
    </DocDialog>
  );
}

export function EditDocDialog({ doc, busy, onSave, onCancel }) {
  return (
    <DocDialog
      open={Boolean(doc)}
      testId="doc-edit-dialog"
      heading="Modifica documento"
      description="Cambia nome, categoria o data di scadenza"
      initial={doc}
      busy={busy}
      saveLabel="Salva"
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
