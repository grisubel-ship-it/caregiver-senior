import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Lock, LogOut, Plus, Trash2, Users, FileSpreadsheet, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "cgsync.admin_token";
const errMsg = (e, fb) => {
  const d = e?.response?.data?.detail;
  return typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg).join(" ") : fb;
};

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/admin/login`, { password });
      sessionStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token);
    } catch (err) {
      toast.error(errMsg(err, "Accesso non riuscito"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="max-w-sm mx-auto mt-10" data-testid="admin-login-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Lock size={18} /> Area amministratore</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" data-testid="admin-password-input" />
          <Button type="submit" disabled={busy || !password} className="w-full bg-teal-600 hover:bg-teal-700" data-testid="admin-login-btn">
            Accedi
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateForm({ onCreate }) {
  const [f, setF] = useState({ cooperative_name: "", code: "", max_uses: 50, duration_months: 12 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const ok = await onCreate({ ...f, code: f.code || null, max_uses: Number(f.max_uses), duration_months: Number(f.duration_months) });
    if (ok) setF({ cooperative_name: "", code: "", max_uses: 50, duration_months: 12 });
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Nuovo codice convenzione</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label>Cooperativa / ente</Label>
            <Input required value={f.cooperative_name} onChange={set("cooperative_name")} placeholder="Es. Coop. Sociale Aurora" data-testid="admin-coop-name-input" />
          </div>
          <div className="space-y-1">
            <Label>Codice (vuoto = automatico)</Label>
            <Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="AURORA2026" data-testid="admin-code-input" />
          </div>
          <div className="space-y-1">
            <Label>Attivazioni massime</Label>
            <Input type="number" min={1} required value={f.max_uses} onChange={set("max_uses")} data-testid="admin-max-uses-input" />
          </div>
          <div className="space-y-1">
            <Label>Durata Premium (mesi)</Label>
            <Input type="number" min={1} max={120} required value={f.duration_months} onChange={set("duration_months")} data-testid="admin-duration-input" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" data-testid="admin-create-btn">
              <Plus size={16} className="mr-1" /> Crea codice
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

async function copyLink(code) {
  const url = `${window.location.origin}/c/${code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiato: invialo alla cooperativa", { description: url });
  } catch {
    window.prompt("Copia il link:", url);
  }
}

function CodeRow({ c, onToggle, onDelete, onDownload }) {
  const full = c.current_uses >= c.max_uses;
  return (
    <div className="p-3 rounded-lg border border-stone-200 flex flex-wrap items-center gap-3 justify-between" data-testid={`admin-code-row-${c.code}`}>
      <div className="min-w-0">
        <div className="font-mono font-semibold text-stone-900 flex items-center gap-2">
          {c.code}
          {!c.is_active && <Badge variant="outline">Disattivato</Badge>}
          {full && <Badge className="bg-amber-500 hover:bg-amber-500">Esaurito</Badge>}
        </div>
        <div className="text-sm text-stone-600 truncate">{c.cooperative_name}</div>
        <div className="text-xs text-stone-500 flex items-center gap-1" data-testid={`admin-code-usage-${c.code}`}>
          <Users size={12} /> {c.current_uses} / {c.max_uses} attivazioni · {c.duration_months} {c.duration_months === 1 ? "mese" : "mesi"}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => copyLink(c.code)} data-testid={`admin-code-link-${c.code}`}>
          <Link2 size={14} className="mr-1" /> Link
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDownload(c.code, "report.csv", `attivazioni-${c.code}.csv`)} data-testid={`admin-code-report-${c.code}`}>
          <FileSpreadsheet size={14} className="mr-1" /> Report
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDownload(c.code, "flyer.pdf", `volantino-${c.code}.pdf`)} data-testid={`admin-code-flyer-${c.code}`}>
          <FileText size={14} className="mr-1" /> Volantino
        </Button>
        <Switch checked={c.is_active} onCheckedChange={(v) => onToggle(c.code, v)} data-testid={`admin-code-toggle-${c.code}`} />
        <Button variant="ghost" size="icon" onClick={() => onDelete(c.code)} aria-label="Elimina" data-testid={`admin-code-delete-${c.code}`}>
          <Trash2 size={16} className="text-red-600" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [codes, setCodes] = useState([]);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  const call = async (fn, okMsg) => {
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await load();
      return true;
    } catch (err) {
      if (err?.response?.status === 401) logout();
      toast.error(errMsg(err, "Operazione non riuscita"));
      return false;
    }
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/admin/conventions`, { headers: { Authorization: `Bearer ${token}` } });
      setCodes(data);
    } catch (err) {
      if (err?.response?.status === 401) logout();
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (code, file, filename) => {
    try {
      const { data } = await axios.get(`${API}/admin/conventions/${code}/${file}`, { ...auth, responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err?.response?.status === 401) logout();
      toast.error("Download non riuscito");
    }
  };

  if (!token) return <AdminLogin onLogin={setToken} />;

  return (
    <div className="space-y-5" data-testid="admin-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-900">Codici convenzione</h1>
        <Button variant="ghost" size="sm" onClick={logout} data-testid="admin-logout-btn"><LogOut size={16} className="mr-1" /> Esci</Button>
      </div>
      <CreateForm onCreate={(body) => call(() => axios.post(`${API}/admin/conventions`, body, auth), "Codice creato")} />
      <Card>
        <CardHeader><CardTitle className="text-base">Codici esistenti ({codes.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2" data-testid="admin-codes-list">
          {codes.length === 0 && <p className="text-sm text-stone-500">Nessun codice ancora creato.</p>}
          {codes.map((c) => (
            <CodeRow
              key={c.code}
              c={c}
              onDownload={download}
              onToggle={(code, v) => call(() => axios.patch(`${API}/admin/conventions/${code}`, { is_active: v }, auth))}
              onDelete={(code) => window.confirm(`Eliminare il codice ${code}?`) && call(() => axios.delete(`${API}/admin/conventions/${code}`, auth), "Codice eliminato")}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
