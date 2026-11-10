import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FileSearch, FileText, Share2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchDocuments, openDocument, shareDocument } from "@/lib/scanner";
import { CATEGORIES, categoryLabel } from "@/components/DocumentDialogs";

const isCancel = (e) => /cancel|abort/i.test(String(e?.message || e));

function ResultRow({ d }) {
  const run = async (fn, fail) => {
    try {
      const res = await fn(d);
      if (res === "downloaded") toast.success("PDF scaricato: allegalo al messaggio per inviarlo");
    } catch (e) {
      if (!isCancel(e)) toast.error(fail);
    }
  };
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-stone-200" data-testid={`search-result-${d.id}`}>
      <button onClick={() => run(openDocument, "Impossibile aprire il documento")} className="flex items-center gap-3 flex-1 min-w-0 text-left" data-testid={`search-result-open-${d.id}`}>
        <FileText size={20} className="text-red-600 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-stone-900 truncate">{d.title}</div>
          <div className="text-xs text-stone-500 truncate">
            <span className="px-1.5 rounded bg-teal-50 text-teal-800 mr-1">{categoryLabel(d.category)}</span>
            {d.patient_name}
          </div>
        </div>
      </button>
      <Link to={`/paziente/${d.patient_id}`} className="text-xs text-teal-700 underline shrink-0" data-testid={`search-result-patient-${d.id}`}>Scheda</Link>
      <Button variant="ghost" size="icon" onClick={() => run(shareDocument, "Condivisione non riuscita")} aria-label="Condividi" data-testid={`search-result-share-${d.id}`}>
        <Share2 size={16} className="text-teal-700" />
      </Button>
    </div>
  );
}

export function DocumentSearch() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!q.trim() && !category) return setResults(null);
    const t = setTimeout(async () => {
      try {
        setResults(await searchDocuments(q, category));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, category]);

  return (
    <Card data-testid="document-search-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><FileSearch size={16} className="text-teal-600" /> Cerca nei documenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ricette, referti… di tutti gli assistiti" className="pl-9" data-testid="document-search-input" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(category === c.value ? "" : c.value)}
              className={`px-2.5 py-1 rounded-full text-xs border whitespace-nowrap transition-colors ${category === c.value ? "bg-teal-600 text-white border-teal-600" : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"}`}
              data-testid={`document-search-cat-${c.value}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {results && results.length === 0 && <p className="text-sm text-stone-500" data-testid="document-search-empty">Nessun documento trovato.</p>}
        {results?.map((d) => <ResultRow key={d.id} d={d} />)}
      </CardContent>
    </Card>
  );
}
