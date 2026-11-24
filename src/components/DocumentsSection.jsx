import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileText, ScanLine, Trash2, Share2, Pencil, MoreVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isNative } from "@/lib/subscription";
import {
  scanPagesNative,
  readFilesAsDataUrls,
  imagesToPdf,
  uploadDocument,
  listDocuments,
  deleteDocument,
  updateDocument,
  openDocument,
  shareDocument,
} from "@/lib/scanner";
import { CATEGORIES, EXPIRING, categoryLabel, expiryInfo, SaveScanDialog, EditDocDialog } from "@/components/DocumentDialogs";
import { syncReminders } from "@/lib/reminders";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
const errMsg = (e, fb) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : d?.message || fb;
};
const isCancel = (e) => /cancel|abort/i.test(String(e?.message || e));

function DocRow({ doc, highlighted, onOpen, onShare, onEdit, onDelete, onRenew }) {
  const exp = expiryInfo(doc.expires_on);
  const renewable = EXPIRING.includes(doc.category);
  return (
    <div
      id={`doc-${doc.id}`}
      className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border transition-shadow ${highlighted ? "border-amber-400 ring-2 ring-amber-200" : "border-stone-200"}`}
      data-testid={`document-row-${doc.id}`}
    >
      <button onClick={() => onOpen(doc)} className="flex items-center gap-3 flex-1 min-w-0 text-left" data-testid={`document-open-${doc.id}`}>
        <FileText size={20} className="text-red-600 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-stone-900 truncate">{doc.title}</div>
          <div className="text-xs text-stone-500 flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 rounded bg-teal-50 text-teal-800" data-testid={`document-category-${doc.id}`}>{categoryLabel(doc.category)}</span>
            {exp && <span className={`px-1.5 rounded ${exp.cls}`} data-testid={`document-expiry-${doc.id}`}>{exp.text}</span>}
            {fmtDate(doc.created_at)} · {doc.pages} {doc.pages === 1 ? "pag." : "pagg."}
          </div>
        </div>
      </button>
      {renewable && exp && exp.days <= 30 && (
        <Button size="sm" variant="outline" onClick={() => onRenew(doc)} className="order-last w-full sm:order-none sm:w-auto h-8 px-2 text-amber-800 border-amber-300 hover:bg-amber-50" data-testid={`document-renew-${doc.id}`}>
          <RefreshCw size={14} className="mr-1" /> <span>Rinnova<span className="sm:hidden">: scansiona il nuovo</span></span>
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={() => onShare(doc)} aria-label="Condividi documento" data-testid={`document-share-${doc.id}`}>
        <Share2 size={16} className="text-teal-700" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Altre azioni" data-testid={`document-menu-${doc.id}`}>
            <MoreVertical size={16} className="text-stone-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(doc)} data-testid={`document-edit-${doc.id}`}>
            <Pencil size={14} className="mr-2" /> Modifica (nome, categoria, scadenza)
          </DropdownMenuItem>
          {renewable && (
            <DropdownMenuItem onSelect={() => onRenew(doc)} data-testid={`document-renew-menu-${doc.id}`}>
              <RefreshCw size={14} className="mr-2" /> Rinnova (scansiona il nuovo)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onDelete(doc)} className="text-red-600" data-testid={`document-delete-${doc.id}`}>
            <Trash2 size={14} className="mr-2" /> Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CategoryFilter({ docs, value, onChange }) {
  const present = CATEGORIES.filter((c) => docs.some((d) => (d.category || "altro") === c.value));
  if (present.length < 2) return null;
  const chip = (v, label, n) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      className={`px-2.5 py-1 rounded-full text-xs border whitespace-nowrap transition-colors ${value === v ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"}`}
      data-testid={`documents-filter-${v}`}
    >
      {label} · {n}
    </button>
  );
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" data-testid="documents-filter">
      {chip("all", "Tutti", docs.length)}
      {present.map((c) => chip(c.value, c.label, docs.filter((d) => (d.category || "altro") === c.value).length))}
    </div>
  );
}

export function DocumentsSection({ patientId }) {
  const [docs, setDocs] = useState([]);
  const [pages, setPages] = useState([]);
  const [renewing, setRenewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [params] = useSearchParams();
  const focusId = params.get("doc");

  const load = useCallback(async () => {
    try {
      setDocs(await listDocuments(patientId));
    } catch {
      /* lista non critica */
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (focusId && docs.some((d) => d.id === focusId)) {
      document.getElementById(`doc-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, docs]);

  const startScan = async (renewDoc = null) => {
    setRenewing(renewDoc ? { title: renewDoc.title, category: renewDoc.category, expires_on: "", id: renewDoc.id } : null);
    if (!isNative()) return fileRef.current?.click();
    try {
      const imgs = await scanPagesNative();
      if (imgs.length) setPages(imgs);
    } catch (e) {
      const msg = String(e?.message || e);
      if (/permission|denied|autoriz/i.test(msg)) toast.error("Consenti l'accesso alla fotocamera nelle impostazioni del telefono");
      else if (!isCancel(e)) toast.error("Scansione non riuscita, riprova");
    }
  };

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length) setPages(await readFilesAsDataUrls(files));
  };

  const save = async ({ title, category, expires_on }) => {
    setBusy(true);
    try {
      const pdf = await imagesToPdf(pages);
      await uploadDocument(patientId, pdf, title, pages.length, category, expires_on, renewing?.id || "");
      toast.success(renewing ? "Documento rinnovato: il vecchio è stato sostituito" : "Documento salvato");
      setPages([]);
      setRenewing(null);
      load();
      if (expires_on || renewing) syncReminders().catch(() => {});
    } catch (e) {
      toast.error(errMsg(e, "Salvataggio non riuscito, riprova"));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (changes) => {
    setBusy(true);
    try {
      const updated = await updateDocument(editing.id, changes);
      setDocs((d) => d.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
      toast.success("Documento aggiornato");
      syncReminders().catch(() => {});
    } catch (e) {
      toast.error(errMsg(e, "Modifica non riuscita"));
    } finally {
      setBusy(false);
    }
  };

  const open = async (doc) => {
    try {
      await openDocument(doc);
    } catch (e) {
      if (!isCancel(e)) toast.error("Impossibile aprire il documento");
    }
  };

  const share = async (doc) => {
    const t = toast.loading("Preparo il PDF…");
    try {
      const res = await shareDocument(doc);
      toast.dismiss(t);
      if (res === "downloaded") toast.success("PDF scaricato: allegalo al messaggio per inviarlo");
    } catch (e) {
      toast.dismiss(t);
      if (!isCancel(e)) toast.error("Condivisione non riuscita");
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Eliminare "${doc.title}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocs((d) => d.filter((x) => x.id !== doc.id));
      toast.success("Documento eliminato");
    } catch {
      toast.error("Eliminazione non riuscita");
    }
  };

  const shown = filter === "all" ? docs : docs.filter((d) => (d.category || "altro") === filter);
  useEffect(() => {
    if (filter !== "all" && !docs.some((d) => (d.category || "altro") === filter)) setFilter("all");
  }, [docs, filter]);

  return (
    <Card data-testid="documents-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} className="text-teal-600" /> Documenti
            {docs.length > 0 && <Badge variant="secondary" className="font-normal">{docs.length}</Badge>}
          </CardTitle>
          <Button size="sm" onClick={() => startScan()} className="bg-teal-600 hover:bg-teal-700" data-testid="scan-document-btn">
            <ScanLine size={16} className="mr-1" /> Scansiona
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={onFiles} data-testid="scan-file-input" />
        {docs.length === 0 ? (
          <p className="text-sm text-stone-500" data-testid="documents-empty">
            Scansiona ricette, referti o piani terapeutici: restano allegati alla scheda e li vedono tutti i caregiver.
          </p>
        ) : (
          <>
            <CategoryFilter docs={docs} value={filter} onChange={setFilter} />
            {shown.map((d) => (
              <DocRow key={d.id} doc={d} highlighted={d.id === focusId} onOpen={open} onShare={share} onEdit={setEditing} onDelete={remove} onRenew={startScan} />
            ))}
          </>
        )}
      </CardContent>
      <SaveScanDialog pages={pages} busy={busy} onSave={save} renewing={renewing} onCancel={() => { setPages([]); setRenewing(null); }} />
      <EditDocDialog doc={editing} busy={busy} onSave={saveEdit} onCancel={() => setEditing(null)} />
    </Card>
  );
}
