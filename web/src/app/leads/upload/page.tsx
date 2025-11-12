"use client";

import { useState } from "react";
import Papa from "papaparse";
type Row = Record<string, string>;

export default function UploadCSV() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onDrop = (file: File) => {
    setError(null); setFileName(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (r) => { const data = (r.data as Row[]).slice(0, 50); setRows(data); setHeaders(Object.keys(data[0] ?? {})); },
      error: (err) => setError(err.message),
    });
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
            <button className="btn btn-primary">Continue to Mapping</button>
            <a href="/" className="btn btn-ghost">Cancel</a>
          </div>
        </div>
      )}
    </div>
  );}
