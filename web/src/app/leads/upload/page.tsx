"use client";

import { useState } from "react";
import Papa from "papaparse";
type Row = Record<string, string>;

export default function UploadCSV() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [showMapping, setShowMapping] = useState<boolean>(false);
  const [stats, setStats] = useState<{ inserted: number; updated: number; merged: number; total: number } | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const onDrop = async (file: File) => {
    try {
      setError(null); setFileName(file.name); setStats(null);
      const text = await file.text();
      setCsvText(text);
      Papa.parse(text, {
        header: true, skipEmptyLines: true,
        complete: (r) => { const data = (r.data as Row[]).slice(0, 50); setRows(data); setHeaders(Object.keys(data[0] ?? {})); },
        error: (err) => setError(err.message),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to read file.");
    }
  };

  const guessMapping = (): Record<string, string> => {
    const find = (regex: RegExp) => headers.find(h => regex.test(h.toLowerCase()));
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const by = (patterns: RegExp[]) => {
      for (const p of patterns) {
        const h = find(p);
        if (h) return h;
      }
      return undefined as unknown as string;
    };
    return {
      email: by([/email/]),
      contactName: by([/name/]),
      company: by([/company/, /publication/]),
      phone: by([/phone/]),
      role: by([/title/, /role/]),
      website: by([/website/, /url/]),
      industry: by([/industry/]),
    };
  };

  const importNow = async () => {
    if (!csvText) { setError("No CSV text loaded."); return; }
    setBusy(true); setError(null); setStats(null);
    try {
      const mapping = guessMapping();
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: "default", csvText, mapping, source: "manual-upload" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Import failed.");
      setStats({ inserted: data.inserted ?? 0, updated: data.updated ?? 0, merged: data.merged ?? 0, total: data.total ?? 0 });
    } catch (e: any) {
      setError(e?.message || "Request failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container py-12">
      <h1 className="font-heading text-3xl mb-2">Upload CSV</h1>
      <p className="opacity-80 mb-6">Drag in a CSV or click to select. Preview shows first 50 rows.</p>
      <label className="card grid place-items-center p-10 cursor-pointer hover:shadow-soft transition-shadow">
        <input type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onDrop(f); }} />
        <div className="text-center">
          <div className="text-lg font-semibold">Drop CSV here</div>
          <div className="text-sm opacity-70 mt-1">{fileName ?? "or click to choose a file"}</div>
        </div>
      </label>
      {error && <div className="mt-4 text-red-400">Error: {error}</div>}
      {rows.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 opacity-80 text-sm">Previewing {rows.length} rows</div>
          <div className="overflow-auto border border-[var(--border)] rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>{rows.map((r,i) => (
                <tr key={i} className="odd:bg-[#0b111a]">{headers.map(h => <td key={h} className="px-3 py-2">{r[h]}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-primary" onClick={() => setShowMapping(s => !s)}>
              {showMapping ? "Hide Mapping" : "Continue to Mapping"}
            </button>
            <button className="btn btn-secondary" onClick={importNow} disabled={busy}>
              {busy ? "Importing..." : "Import Now"}
            </button>
            <a href="/" className="btn btn-ghost">Cancel</a>
          </div>
          {showMapping && (
            <div className="mt-6 card p-4">
              <div className="font-semibold mb-2">Detected Mapping</div>
              <ul className="grid md:grid-cols-2 gap-2 text-sm opacity-80">
                {Object.entries(guessMapping()).map(([k,v]) => (
                  <li key={k}><span className="opacity-60">{k}</span>: <span className="font-mono">{v ?? "—"}</span></li>
                ))}
              </ul>
              <div className="mt-2 text-xs opacity-60">You can adjust mapping logic in code later.</div>
            </div>
          )}
          {stats && (
            <div className="mt-6 card p-5">
              <div className="font-semibold mb-2">Import Summary</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><div className="text-xs opacity-70">Total</div><div className="text-xl font-semibold">{stats.total}</div></div>
                <div><div className="text-xs opacity-70">Inserted</div><div className="text-xl font-semibold text-emerald-300">{stats.inserted}</div></div>
                <div><div className="text-xs opacity-70">Updated</div><div className="text-xl font-semibold text-blue-300">{stats.updated}</div></div>
                <div><div className="text-xs opacity-70">Merged</div><div className="text-xl font-semibold text-yellow-300">{stats.merged}</div></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );}
