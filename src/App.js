import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  Settings as SettingsIcon,
  Activity,
  Pill,
  AlertCircle,
  StickyNote,
  Undo2,
  Heart,
  MoreVertical,
  Eraser,
  ListX,
  Sparkles,
  Copy,
  X,
  Pencil,
  History,
  TrendingUp,
  Search,
  Clock,
  ChevronRight,
  Crown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { getAppUserId } from "@/lib/subscription";
import ProPage from "@/pages/ProPage";
import AdminPage from "@/pages/AdminPage";
import { AccessProvider, AccessGate, TrialBanner, DeepLinkHandler } from "@/components/AccessGate";
import CodeLandingPage from "@/pages/CodeLandingPage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Axios: timeout 15s + retry automatico su errori di rete/500/502/503/504
// utile quando il backend si sta risvegliando dopo inattività
axios.defaults.timeout = 15000;
axios.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err?.config;
    if (!cfg || cfg.__retryCount >= 3) return Promise.reject(err);
    const status = err?.response?.status;
    const isRetryable = !err.response || [502, 503, 504, 408, 429, 500].includes(status);
    if (!isRetryable) return Promise.reject(err);
    cfg.__retryCount = (cfg.__retryCount || 0) + 1;
    const delay = 800 * cfg.__retryCount; // 800ms, 1.6s, 2.4s
    await new Promise((r) => setTimeout(r, delay));
    return axios(cfg);
  }
);

// ---------- Utility: Undo toast ----------
const UNDO_MS = 5000;

async function deleteWithUndo({ label, doDelete, doRestore }) {
  const removed = await doDelete();
  toast(`${label} eliminato`, {
    duration: UNDO_MS,
    action: {
      label: "Annulla",
      onClick: async () => {
        await doRestore(removed);
        toast.success(`${label} ripristinato`);
      },
    },
  });
  return removed;
}

// ---------- Confirm Dialog ----------
function ConfirmDialog({ trigger, title, description, confirmText = "Elimina", onConfirm, destructive = true, testId }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent data-testid={`${testId}-dialog`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testId}-cancel`}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            data-testid={`${testId}-confirm`}
            onClick={onConfirm}
            className={destructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------- Context Menu wrapper ----------
// Ogni azione distruttiva è dentro un DropdownMenu (…) + un AlertDialog di conferma.
// Usiamo state controllato per collegare i due componenti in modo affidabile.
function ItemMenu({ testId, ariaLabel = "Azioni", size = "icon", actions }) {
  const [openDialog, setOpenDialog] = useState(null); // key dell'action con conferma aperta

  const current = actions.find((a) => a.key === openDialog);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            aria-label={ariaLabel}
            data-testid={`${testId}-menu-btn`}
            className="text-stone-500 hover:text-stone-900"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid={`${testId}-menu`}>
          {actions.map((a, i) =>
            a.separator ? (
              <DropdownMenuSeparator key={`sep-${i}`} />
            ) : a.label ? (
              <DropdownMenuLabel key={a.key ?? i} className="text-xs text-stone-500">
                {a.label}
              </DropdownMenuLabel>
            ) : (
              <DropdownMenuItem
                key={a.key}
                data-testid={`${testId}-${a.key}`}
                onClick={() => {
                  if (a.confirm) setOpenDialog(a.key);
                  else a.onSelect?.();
                }}
                className={a.destructive ? "text-red-600 focus:text-red-700 focus:bg-red-50" : ""}
              >
                {a.icon && <a.icon size={14} className="mr-2" />}
                {a.text}
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {current?.confirm && (
        <AlertDialog open={true} onOpenChange={(o) => !o && setOpenDialog(null)}>
          <AlertDialogContent data-testid={`${testId}-${current.key}-dialog`}>
            <AlertDialogHeader>
              <AlertDialogTitle>{current.confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{current.confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid={`${testId}-${current.key}-cancel`}>
                Annulla
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid={`${testId}-${current.key}-confirm`}
                onClick={() => {
                  current.onSelect?.();
                  setOpenDialog(null);
                }}
                className={current.destructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
              >
                {current.confirm.confirmText ?? "Conferma"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ---------- Layout ----------
function Shell({ children }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group" data-testid="home-link">
            <div className="w-9 h-9 rounded-xl bg-teal-600 grid place-items-center">
              <Heart size={18} className="text-white" fill="white" />
            </div>
            <div>
              <div className="font-semibold text-stone-900 leading-tight">Caregiver Senior</div>
              <div className="text-xs text-stone-500 leading-tight">Anziani & Cronici</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/pro" data-testid="pro-link">
              <Button variant="ghost" size="sm" className="text-teal-700 gap-1">
                <Crown size={16} /> Premium
              </Button>
            </Link>
            <Link to="/impostazioni" data-testid="settings-link">
              <Button variant="ghost" size="icon" aria-label="Impostazioni">
                <SettingsIcon size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <TrialBanner />
      <main className="max-w-4xl mx-auto px-5 py-6">{children}</main>
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}

// ---------- Patients List ----------
function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buonanotte";
  if (h < 12) return "Buongiorno";
  if (h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function PatientsList() {
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        axios.get(`${API}/patients`),
        axios.get(`${API}/data/stats`),
      ]);
      setPatients(pRes.data);
      setStats(sRes.data);
    } catch (e) {
      const isNetwork = !e.response;
      toast.error(
        isNetwork
          ? "Server non raggiungibile. Controlla la connessione e riprova."
          : `Errore ${e.response?.status || ''}: ${e.response?.data?.detail || 'imprevisto'}`,
        {
          action: {
            label: "Riprova",
            onClick: () => load(),
          },
          duration: 8000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (patient) => {
    await deleteWithUndo({
      label: `Assistito ${patient.name}`,
      doDelete: async () => {
        const { data } = await axios.delete(`${API}/patients/${patient.id}`);
        setPatients((prev) => prev.filter((p) => p.id !== patient.id));
        return data;
      },
      doRestore: async (removed) => {
        await axios.post(`${API}/patients/restore`, {
          patient: removed.patient,
          entries: removed.entries,
        });
        load();
      },
    });
  };

  const filtered = patients.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.pathology ?? "").toLowerCase().includes(q)
    );
  });

  const dateStr = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <div className="text-xs uppercase tracking-wider text-teal-700 font-semibold">
          {dateStr}
        </div>
        <h1 className="text-3xl font-serif text-stone-900 mt-1" data-testid="patients-title">
          {greeting()}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          {patients.length === 0
            ? "Registra il primo assistito per iniziare"
            : `${patients.length} ${patients.length === 1 ? "persona" : "persone"} in cura • ${stats?.entries ?? 0} voci nel diario`}
        </p>
      </div>

      {/* Quick stats */}
      {stats && patients.length > 0 && (
        <div className="grid grid-cols-4 gap-2" data-testid="quick-stats">
          {[
            { label: "Assistiti", value: stats.patients, icon: Users, color: "bg-teal-50 text-teal-700" },
            { label: "Parametri", value: stats.vitals, icon: Activity, color: "bg-blue-50 text-blue-700" },
            { label: "Farmaci", value: stats.medications, icon: Pill, color: "bg-purple-50 text-purple-700" },
            { label: "Sintomi", value: stats.symptoms, icon: AlertCircle, color: "bg-orange-50 text-orange-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className={`w-8 h-8 rounded-lg grid place-items-center ${s.color} mb-2`}>
                <s.icon size={16} />
              </div>
              <div className="text-2xl font-serif text-stone-900 leading-none">{s.value}</div>
              <div className="text-xs text-stone-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + CTA */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input
            placeholder="Cerca per nome o patologia…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            data-testid="patients-search"
          />
        </div>
        <Button
          onClick={() => navigate("/nuovo")}
          className="bg-teal-600 hover:bg-teal-700 shrink-0"
          data-testid="add-patient-btn"
        >
          <Plus size={16} className="mr-1" /> Nuovo
        </Button>
      </div>

      {loading && <div className="text-stone-500 text-sm py-8 text-center">Caricamento…</div>}

      {!loading && patients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-teal-50 mx-auto grid place-items-center">
              <Heart className="text-teal-600" size={36} fill="currentColor" />
            </div>
            <div>
              <p className="text-stone-900 font-medium">Nessun assistito registrato</p>
              <p className="text-stone-500 text-sm mt-1">
                Inizia registrando la persona di cui ti stai prendendo cura
              </p>
            </div>
            <Button onClick={() => navigate("/nuovo")} className="bg-teal-600 hover:bg-teal-700" data-testid="empty-add-btn">
              <Plus size={16} className="mr-1" /> Aggiungi assistito
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && patients.length > 0 && filtered.length === 0 && (
        <div className="text-stone-500 text-sm py-8 text-center">
          Nessun risultato per "{query}"
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((p) => (
          <Card
            key={p.id}
            className="hover:border-teal-300 transition-colors"
            data-testid={`patient-card-${p.id}`}
          >
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <button
                className="flex-1 text-left flex items-center gap-3"
                onClick={() => navigate(`/paziente/${p.id}`)}
                data-testid={`open-patient-${p.id}`}
              >
                <div
                  className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 grid place-items-center font-semibold shrink-0"
                  aria-hidden
                >
                  {p.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-stone-900 truncate">{p.name}</div>
                  <div className="text-sm text-stone-500 mt-0.5 flex gap-2 items-center flex-wrap">
                    {p.pathology && (
                      <Badge variant="secondary" className="font-normal truncate max-w-[200px]">
                        {p.pathology}
                      </Badge>
                    )}
                    {p.birth_year && (
                      <span className="text-xs">nato nel {p.birth_year}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-stone-300 shrink-0" />
              </button>
              <ItemMenu
                testId={`patient-${p.id}`}
                ariaLabel={`Azioni per ${p.name}`}
                actions={[
                  {
                    key: "open",
                    text: "Apri scheda",
                    icon: ChevronLeft,
                    onSelect: () => navigate(`/paziente/${p.id}`),
                  },
                  { separator: true },
                  {
                    key: "delete",
                    text: "Elimina assistito",
                    icon: Trash2,
                    destructive: true,
                    confirm: {
                      title: `Eliminare ${p.name}?`,
                      description:
                        "Verranno eliminati anche tutti i dati clinici associati. Avrai 5 secondi per annullare dal toast.",
                      confirmText: "Elimina",
                    },
                    onSelect: () => handleDelete(p),
                  },
                ]}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- New Patient ----------
function NewPatient() {
  const [form, setForm] = useState({ name: "", pathology: "", birth_year: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, birth_year: form.birth_year ? parseInt(form.birth_year, 10) : null };
      await axios.post(`${API}/patients`, payload);
      toast.success("Assistito registrato");
      navigate("/");
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        err?.message ||
        "errore sconosciuto";
      toast.error(`Salvataggio non riuscito: ${detail}`);
      console.error("[NewPatient] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-lg">
      <Link to="/" className="text-teal-700 text-sm inline-flex items-center gap-1" data-testid="back-to-list">
        <ChevronLeft size={16} /> Torna all'elenco
      </Link>
      <h1 className="text-2xl font-serif text-stone-900">Nuovo assistito</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome e cognome *</Label>
          <Input
            id="name"
            data-testid="patient-name-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Es. Maria Rossi"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pathology">Patologia principale</Label>
            <Input
              id="pathology"
              data-testid="patient-pathology-input"
              value={form.pathology}
              onChange={(e) => setForm({ ...form, pathology: e.target.value })}
              placeholder="Es. Note quotidiane"
            />
          </div>
          <div>
            <Label htmlFor="birth_year">Anno di nascita</Label>
            <Input
              id="birth_year"
              data-testid="patient-birth-input"
              type="number"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              placeholder="1945"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Note</Label>
          <Textarea
            id="notes"
            data-testid="patient-notes-input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Routine, orari, note utili al passaggio di consegne…"
            rows={4}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700" data-testid="save-patient-btn">
            {saving ? "Salvataggio…" : "Salva assistito"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/")}>Annulla</Button>
        </div>
      </form>
    </div>
  );
}

// ---------- Patient Detail (diary) ----------
const KIND_META = {
  vital: { label: "Parametro", plural: "parametri", icon: Activity, color: "text-blue-600 bg-blue-50" },
  medication: { label: "Farmaco", plural: "farmaci", icon: Pill, color: "text-purple-600 bg-purple-50" },
  symptom: { label: "Sintomo", plural: "sintomi", icon: AlertCircle, color: "text-orange-600 bg-orange-50" },
  note: { label: "Nota", plural: "note", icon: StickyNote, color: "text-stone-600 bg-stone-100" },
};

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entryForm, setEntryForm] = useState({ kind: "vital", label: "", value: "", unit: "" });
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverText, setHandoverText] = useState("");
  const [handoverHours, setHandoverHours] = useState(24);
  const [handovers, setHandovers] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [trendLabels, setTrendLabels] = useState([]);
  const [trendSelected, setTrendSelected] = useState(null);
  const [trendData, setTrendData] = useState([]);

  const load = async () => {
    try {
      const [pRes, eRes, hRes, trendRes] = await Promise.all([
        axios.get(`${API}/patients/${id}`),
        axios.get(`${API}/entries?patient_id=${id}`),
        axios.get(`${API}/handovers?patient_id=${id}`),
        axios.get(`${API}/patients/${id}/trend`),
      ]);
      setPatient(pRes.data);
      setEntries(eRes.data);
      setHandovers(hRes.data);
      const labels = trendRes.data.labels || [];
      setTrendLabels(labels);
      if (labels.length > 0 && !trendSelected) {
        setTrendSelected(labels[0]);
      }
    } catch {
      toast.error("Assistito non trovato");
      navigate("/");
    }
  };

  // Carica la serie storica quando cambia il parametro selezionato
  useEffect(() => {
    if (!trendSelected) {
      setTrendData([]);
      return;
    }
    axios
      .get(`${API}/patients/${id}/trend?label=${encodeURIComponent(trendSelected)}&days=30`)
      .then(({ data }) => setTrendData(data.series || []))
      .catch(() => setTrendData([]));
  }, [id, trendSelected]);

  useEffect(() => {
    load();
  }, [id]);

  const addEntry = async (e) => {
    e.preventDefault();
    if (!entryForm.label.trim()) {
      toast.error("Indica un'etichetta (es. 'Pressione', 'Metformina')");
      return;
    }
    try {
      await axios.post(`${API}/entries`, { ...entryForm, patient_id: id });
      setEntryForm({ kind: entryForm.kind, label: "", value: "", unit: "" });
      toast.success("Voce aggiunta al diario");
      load();
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  const handleDeleteEntry = async (entry) => {
    await deleteWithUndo({
      label: `${KIND_META[entry.kind]?.label ?? "Voce"} "${entry.label}"`,
      doDelete: async () => {
        const { data } = await axios.delete(`${API}/entries/${entry.id}`);
        setEntries((prev) => prev.filter((x) => x.id !== entry.id));
        return data;
      },
      doRestore: async (removed) => {
        await axios.post(`${API}/entries/restore`, { entry: removed.entry });
        load();
      },
    });
  };

  const bulkDelete = async (kind) => {
    try {
      const { data } = await axios.post(`${API}/entries/bulk-delete`, {
        patient_id: id,
        kind,
      });
      toast.success(`${data.count} voci eliminate`);
      load();
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const generateHandover = async () => {
    setHandoverOpen(true);
    setHandoverLoading(true);
    setHandoverText("");
    try {
      const { data } = await axios.post(`${API}/ai/handover`, {
        patient_id: id,
        hours: handoverHours,
        app_user_id: getAppUserId(),
      });
      setHandoverText(data.handover || "Nessun contenuto generato.");
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 402 && detail?.code === "pro_required") {
        setHandoverOpen(false);
        toast.error(detail.message || "Prova gratuita terminata");
        // Reindirizza al paywall dopo un attimo
        setTimeout(() => navigate("/pro"), 1200);
      } else {
        const msg = typeof detail === "string" ? detail : "Impossibile generare la consegna.";
        toast.error(msg);
        setHandoverOpen(false);
      }
    } finally {
      setHandoverLoading(false);
    }
  };

  const copyHandover = async () => {
    try {
      await navigator.clipboard.writeText(handoverText);
      toast.success("Consegna copiata negli appunti");
    } catch {
      toast.error("Impossibile copiare");
    }
  };

  const saveEditedEntry = async (patch) => {
    try {
      await axios.patch(`${API}/entries/${editingEntry.id}`, patch);
      toast.success("Voce aggiornata");
      setEditingEntry(null);
      load();
    } catch {
      toast.error("Errore nel salvataggio");
    }
  };

  const deleteHandover = async (handover) => {
    try {
      await axios.delete(`${API}/handovers/${handover.id}`);
      setHandovers((prev) => prev.filter((h) => h.id !== handover.id));
      toast.success("Consegna eliminata");
    } catch {
      toast.error("Errore");
    }
  };

  const openHandoverFromHistory = (h) => {
    setHandoverText(h.text);
    setHandoverHours(h.hours);
    setHandoverOpen(true);
  };

  if (!patient) return <div className="text-stone-500">Caricamento…</div>;

  const counts = entries.reduce((acc, e) => {
    acc[e.kind] = (acc[e.kind] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Link to="/" className="text-teal-700 text-sm inline-flex items-center gap-1" data-testid="back-btn">
        <ChevronLeft size={16} /> Elenco assistiti
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif text-stone-900" data-testid="patient-detail-name">{patient.name}</h1>
          <div className="mt-2 flex gap-2 flex-wrap">
            {patient.pathology && <Badge variant="secondary">{patient.pathology}</Badge>}
            {patient.birth_year && <Badge variant="outline">nato nel {patient.birth_year}</Badge>}
          </div>
          {patient.notes && (
            <p className="mt-3 text-stone-600 text-sm max-w-xl whitespace-pre-wrap">{patient.notes}</p>
          )}
        </div>
        <ItemMenu
          testId="patient-header"
          ariaLabel="Azioni assistito"
          actions={[
            { label: "Azioni sul diario" },
            ...Object.entries(counts).map(([kind, count]) => ({
              key: `bulk-${kind}`,
              text: `Cancella tutti i ${KIND_META[kind]?.plural ?? "elementi"} (${count})`,
              icon: ListX,
              destructive: true,
              confirm: {
                title: `Cancellare tutti i ${KIND_META[kind]?.plural ?? "elementi"}?`,
                description: `Verranno eliminate ${count} voci di questo tipo per ${patient.name}. L'operazione non è annullabile.`,
                confirmText: "Cancella",
              },
              onSelect: () => bulkDelete(kind),
            })),
            ...(entries.length > 0
              ? [
                  {
                    key: "clear-diary",
                    text: "Svuota tutto il diario",
                    icon: Eraser,
                    destructive: true,
                    confirm: {
                      title: `Svuotare tutto il diario di ${patient.name}?`,
                      description: `Verranno eliminate tutte le ${entries.length} voci registrate. L'assistito rimane. Operazione non annullabile.`,
                      confirmText: "Svuota diario",
                    },
                    onSelect: async () => {
                      try {
                        await axios.post(`${API}/entries/bulk-delete`, { patient_id: id });
                        toast.success("Diario svuotato");
                        load();
                      } catch {
                        toast.error("Errore");
                      }
                    },
                  },
                ]
              : []),
            { separator: true },
            {
              key: "delete-patient",
              text: "Elimina assistito",
              icon: Trash2,
              destructive: true,
              confirm: {
                title: `Eliminare ${patient.name}?`,
                description:
                  "Verranno eliminati anche tutti i dati clinici associati. Avrai 5 secondi per annullare.",
                confirmText: "Elimina",
              },
              onSelect: async () => {
                await deleteWithUndo({
                  label: `Assistito ${patient.name}`,
                  doDelete: async () => {
                    const { data } = await axios.delete(`${API}/patients/${id}`);
                    return data;
                  },
                  doRestore: async (removed) => {
                    await axios.post(`${API}/patients/restore`, {
                      patient: removed.patient,
                      entries: removed.entries,
                    });
                  },
                });
                navigate("/");
              },
            },
          ]}
        />
      </div>

      {/* AI Handover generator */}
      <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-teal-600 grid place-items-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900">Consegna con IA</div>
              <div className="text-sm text-stone-600">
                Genera una nota di passaggio consegne per il turno successivo, basata sulle voci del diario
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Select value={String(handoverHours)} onValueChange={(v) => setHandoverHours(parseInt(v, 10))}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-[110px]" data-testid="handover-hours-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">Ultime 8h</SelectItem>
                <SelectItem value="12">Ultime 12h</SelectItem>
                <SelectItem value="24">Ultime 24h</SelectItem>
                <SelectItem value="72">Ultimi 3g</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateHandover}
              disabled={handoverLoading || entries.length === 0}
              className="bg-teal-600 hover:bg-teal-700 shrink-0"
              data-testid="generate-handover-btn"
            >
              <Sparkles size={16} className="mr-1" /> Genera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Handover history + trend */}
      {(handovers.length > 0 || trendLabels.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {/* Handover history */}
          {handovers.length > 0 && (
            <Card data-testid="handover-history-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History size={16} className="text-teal-600" /> Consegne generate
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {handovers.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {handovers.slice(0, 6).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-2 group p-2 -mx-2 rounded-lg hover:bg-stone-50 cursor-pointer"
                    onClick={() => openHandoverFromHistory(h)}
                    data-testid={`handover-history-${h.id}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 grid place-items-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-stone-500 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(h.created_at).toLocaleString("it-IT", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <span className="text-stone-400 ml-1">• {h.hours}h • {h.entries_count} voci</span>
                      </div>
                      <div className="text-sm text-stone-800 mt-0.5 line-clamp-2">
                        {h.text.replace(/[#*_`]/g, "").slice(0, 130)}…
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-red-600 h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHandover(h);
                      }}
                      aria-label="Elimina consegna"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
                {handovers.length > 6 && (
                  <p className="text-xs text-stone-400 text-center pt-1">
                    +{handovers.length - 6} consegne precedenti
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trend chart */}
          {trendLabels.length > 0 && (
            <Card data-testid="trend-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp size={16} className="text-teal-600" /> Andamento
                  </CardTitle>
                  <Select value={trendSelected ?? ""} onValueChange={setTrendSelected}>
                    <SelectTrigger className="w-[150px] h-8" data-testid="trend-select">
                      <SelectValue placeholder="Parametro" />
                    </SelectTrigger>
                    <SelectContent>
                      {trendLabels.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {trendData.length === 0 ? (
                  <div className="text-xs text-stone-400 text-center py-8">
                    Servono almeno 2 rilevazioni con valore numerico
                  </div>
                ) : (
                  <div className="h-[180px] -ml-3" style={{ minHeight: 180 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <LineChart
                        data={trendData.map((p) => ({
                          ...p,
                          time: new Date(p.t).getTime(),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                        <XAxis
                          dataKey="time"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          tickFormatter={(t) =>
                            new Date(t).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                            })
                          }
                          fontSize={10}
                          stroke="#78716c"
                        />
                        <YAxis fontSize={10} stroke="#78716c" width={30} />
                        <Tooltip
                          labelFormatter={(t) =>
                            new Date(t).toLocaleString("it-IT")
                          }
                          formatter={(v, n) => [`${v}${trendData[0]?.unit ? ' ' + trendData[0].unit : ''}`, n === "value2" ? "min" : "max"]}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#0f766e"
                          strokeWidth={2}
                          dot={{ fill: "#0f766e", r: 3 }}
                          name={trendSelected}
                        />
                        {trendData.some((d) => d.value2 != null) && (
                          <Line
                            type="monotone"
                            dataKey="value2"
                            stroke="#0891b2"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={{ fill: "#0891b2", r: 3 }}
                            name="min"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Add entry form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aggiungi al diario clinico</CardTitle>
          <CardDescription>Parametri, farmaci, sintomi o note del turno</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addEntry} className="grid gap-3 md:grid-cols-[140px_1fr_140px_100px_auto]">
            <Select value={entryForm.kind} onValueChange={(v) => setEntryForm({ ...entryForm, kind: v })}>
              <SelectTrigger data-testid="entry-kind-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vital">Parametro</SelectItem>
                <SelectItem value="medication">Farmaco</SelectItem>
                <SelectItem value="symptom">Sintomo</SelectItem>
                <SelectItem value="note">Nota</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={entryForm.kind === "medication" ? "Nome farmaco" : entryForm.kind === "vital" ? "Es. Pressione" : "Descrizione"}
              value={entryForm.label}
              onChange={(e) => setEntryForm({ ...entryForm, label: e.target.value })}
              data-testid="entry-label-input"
            />
            <Input
              placeholder="Valore"
              value={entryForm.value}
              onChange={(e) => setEntryForm({ ...entryForm, value: e.target.value })}
              data-testid="entry-value-input"
            />
            <Input
              placeholder="Unità"
              value={entryForm.unit}
              onChange={(e) => setEntryForm({ ...entryForm, unit: e.target.value })}
              data-testid="entry-unit-input"
            />
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" data-testid="add-entry-btn">
              <Plus size={16} />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Entries list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Diario clinico</h2>
          {entries.length > 0 && (
            <span className="text-xs text-stone-500" data-testid="entries-count">
              {entries.length} {entries.length === 1 ? "voce" : "voci"}
            </span>
          )}
        </div>
        {entries.length === 0 && (
          <div className="text-stone-500 text-sm py-8 text-center bg-white rounded-lg border border-dashed">
            Nessuna voce registrata. Aggiungi la prima usando il form sopra.
          </div>
        )}
        {entries.map((e) => {
          const meta = KIND_META[e.kind] ?? KIND_META.note;
          const Icon = meta.icon;
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-3"
              data-testid={`entry-${e.id}`}
            >
              <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${meta.color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900 truncate">{e.label}</div>
                <div className="text-xs text-stone-500 flex gap-2">
                  <span>{new Date(e.created_at).toLocaleString("it-IT")}</span>
                  {(e.value || e.unit) && (
                    <span className="font-medium text-stone-700">
                      {e.value} {e.unit}
                    </span>
                  )}
                </div>
              </div>
              <ItemMenu
                testId={`entry-${e.id}`}
                ariaLabel="Azioni voce"
                actions={[
                  {
                    key: "edit",
                    text: "Modifica voce",
                    icon: Pencil,
                    onSelect: () => setEditingEntry(e),
                  },
                  { separator: true },
                  {
                    key: "delete",
                    text: "Elimina voce",
                    icon: Trash2,
                    destructive: true,
                    confirm: {
                      title: "Eliminare questa voce?",
                      description: "Puoi annullare l'operazione entro 5 secondi dal toast.",
                      confirmText: "Elimina",
                    },
                    onSelect: () => handleDeleteEntry(e),
                  },
                ]}
              />
            </div>
          );
        })}
      </div>

      {/* AI Handover Dialog */}
      <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="handover-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-600" />
              Consegna generata per {patient.name}
            </DialogTitle>
            <DialogDescription>
              Generata dall'IA dalle voci del diario delle ultime {handoverHours} ore. Rileggila prima di condividerla.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-3">
            {handoverLoading ? (
              <div className="flex items-center gap-3 text-stone-500 py-8 justify-center">
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: "0.15s" }} />
                <div className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: "0.3s" }} />
                <span className="ml-2">Sto elaborando il diario…</span>
              </div>
            ) : (
              <pre
                className="whitespace-pre-wrap font-sans text-sm text-stone-800 leading-relaxed"
                data-testid="handover-text"
              >
                {handoverText}
              </pre>
            )}
          </div>
          <DialogFooter className="border-t pt-3">
            <div className="text-xs text-stone-500 mr-auto max-w-[60%]">
              ⚠️ Contenuto generato dall'IA. Non sostituisce il parere medico.
            </div>
            <Button variant="outline" onClick={() => setHandoverOpen(false)} data-testid="handover-close-btn">
              <X size={16} className="mr-1" /> Chiudi
            </Button>
            <Button
              onClick={copyHandover}
              disabled={handoverLoading || !handoverText}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="handover-copy-btn"
            >
              <Copy size={16} className="mr-1" /> Copia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <EditEntryDialog
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={saveEditedEntry}
      />
    </div>
  );
}

// ---------- Edit Entry Dialog ----------
function EditEntryDialog({ entry, onClose, onSave }) {
  const [form, setForm] = useState({ kind: "", label: "", value: "", unit: "" });

  useEffect(() => {
    if (entry) {
      setForm({
        kind: entry.kind,
        label: entry.label ?? "",
        value: entry.value ?? "",
        unit: entry.unit ?? "",
      });
    }
  }, [entry]);

  if (!entry) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error("L'etichetta è obbligatoria");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="edit-entry-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={16} className="text-teal-600" /> Modifica voce del diario
          </DialogTitle>
          <DialogDescription>
            Correggi i valori. La data e l'ora originali vengono mantenute.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 py-2">
          <div>
            <Label htmlFor="edit-kind">Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger id="edit-kind" data-testid="edit-entry-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vital">Parametro</SelectItem>
                <SelectItem value="medication">Farmaco</SelectItem>
                <SelectItem value="symptom">Sintomo</SelectItem>
                <SelectItem value="note">Nota</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-label">Etichetta</Label>
            <Input
              id="edit-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              data-testid="edit-entry-label"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-value">Valore</Label>
              <Input
                id="edit-value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                data-testid="edit-entry-value"
              />
            </div>
            <div>
              <Label htmlFor="edit-unit">Unità</Label>
              <Input
                id="edit-unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                data-testid="edit-entry-unit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" data-testid="edit-entry-save">
              Salva modifiche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Settings / Data management ----------
function SettingsPage() {
  const [stats, setStats] = useState(null);

  const load = async () => {
    const { data } = await axios.get(`${API}/data/stats`);
    setStats(data);
  };

  useEffect(() => {
    load();
  }, []);

  const clearCollection = async (name, label) => {
    try {
      await axios.delete(`${API}/data/collection/${name}`);
      toast.success(`${label} svuotati`);
      load();
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  const wipeAll = async () => {
    try {
      await axios.delete(`${API}/data/wipe`);
      toast.success("Tutti i dati sono stati eliminati");
      load();
    } catch {
      toast.error("Errore durante il reset");
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/" className="text-teal-700 text-sm inline-flex items-center gap-1" data-testid="settings-back">
        <ChevronLeft size={16} /> Torna alla home
      </Link>
      <div>
        <h1 className="text-3xl font-serif text-stone-900">Gestione dati</h1>
        <p className="text-stone-500 text-sm mt-1">
          Elimina singole categorie o esegui un reset totale (diritto all'oblio GDPR).
        </p>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Assistiti", stats.patients],
              ["Parametri", stats.vitals],
              ["Farmaci", stats.medications],
              ["Sintomi", stats.symptoms],
              ["Note", stats.notes],
              ["Totale voci diario", stats.entries],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-stone-200 p-3">
                <div className="text-2xl font-serif text-stone-900">{value}</div>
                <div className="text-xs text-stone-500">{label}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cancellazione per categoria</CardTitle>
          <CardDescription>Le operazioni sono irreversibili.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
            <div>
              <div className="font-medium">Diario clinico</div>
              <div className="text-xs text-stone-500">Parametri, farmaci, sintomi, note ({stats?.entries ?? 0})</div>
            </div>
            <ConfirmDialog
              testId="clear-entries"
              title="Svuotare tutto il diario clinico?"
              description={`Verranno eliminate ${stats?.entries ?? 0} voci di tutti gli assistiti. Gli assistiti verranno mantenuti.`}
              confirmText="Svuota diario"
              onConfirm={() => clearCollection("entries", "Diario clinico")}
              trigger={
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" data-testid="clear-entries-btn">
                  <Trash2 size={14} className="mr-1" /> Svuota
                </Button>
              }
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200">
            <div>
              <div className="font-medium">Tutti gli assistiti</div>
              <div className="text-xs text-stone-500">Assistiti ({stats?.patients ?? 0}) + tutto il loro diario</div>
            </div>
            <ConfirmDialog
              testId="clear-patients"
              title="Eliminare tutti gli assistiti?"
              description="Verranno rimossi anche tutti i dati clinici associati. L'operazione non è annullabile."
              confirmText="Elimina tutti"
              onConfirm={() => clearCollection("patients", "Assistiti")}
              trigger={
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" data-testid="clear-patients-btn">
                  <Trash2 size={14} className="mr-1" /> Svuota
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-700">Zona pericolosa</CardTitle>
          <CardDescription>Reset totale dell'app — utile per il diritto all'oblio (GDPR).</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmDialog
            testId="wipe-all"
            title="Reset totale dei dati"
            description="Verranno eliminati TUTTI gli assistiti e TUTTO il diario clinico. Questa operazione non è annullabile e non è possibile recuperare i dati. Vuoi davvero procedere?"
            confirmText="Sì, elimina tutto"
            onConfirm={wipeAll}
            trigger={
              <Button className="w-full bg-red-600 hover:bg-red-700" data-testid="wipe-all-btn">
                <Trash2 size={16} className="mr-2" /> Reset totale dell'app
              </Button>
            }
          />
          <p className="text-xs text-stone-500 mt-3">
            I dati sono salvati sul server dell'app. Cancellandoli, l'operazione è definitiva.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- App ----------
function App() {
  // RevenueCat viene inizializzato solo nella Paywall (/pro) per evitare crash all'avvio.
  return (
    <BrowserRouter>
      <AccessProvider>
      <DeepLinkHandler />
      <Shell>
        <AccessGate>
        <Routes>
          <Route path="/" element={<PatientsList />} />
          <Route path="/nuovo" element={<NewPatient />} />
          <Route path="/paziente/:id" element={<PatientDetail />} />
          <Route path="/impostazioni" element={<SettingsPage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/c/:code" element={<CodeLandingPage />} />
        </Routes>
        </AccessGate>
      </Shell>
      </AccessProvider>
    </BrowserRouter>
  );
}

export default App;
