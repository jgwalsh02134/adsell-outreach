"use client";

import { useState } from "react";
import Papa from "papaparse";

type Row = Record<string, string>;

export default function UploadLeadsPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleFile = (file: File) => {
    setError("");
    setHeaders([]);
    setRows([]);
    setFileName(file.name);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      preview: 50,
      complete: (results) => {
        const data = (results.data || []) as Row[];
        if (data.length === 0) {
          setError("No rows found in CSV.");
          return;
        }
        const cols = Array.from(
          new Set(
            data.flatMap((r) => Object.keys(r || {})).filter(Boolean)
          )
        );
        setHeaders(cols);
        setRows(data);
      },
      error: (e) => {
        setError(e.message || "Failed to parse CSV.");
      },
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-heading">Upload CSV</h1>

      <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-6">
        <label
          htmlFor="csv"
          className="mb-3 block text-sm text-fg/80"
        >
          Select a CSV file (first 50 rows will be previewed)
        </label>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          onChange={onChange}
          className="block w-full cursor-pointer rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-white"
        />
        {fileName && (
          <p className="mt-2 text-xs text-fg/60">Selected: {fileName}</p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="min-w-full border-collapse">
            <thead className="bg-white/5">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-fg/80"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white/0" : "bg-white/5"}
                >
                  {headers.map((h) => (
                    <td key={h} className="whitespace-nowrap px-4 py-3 text-sm">
                      {r?.[h] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-white/10 px-4 py-2 text-xs text-fg/60">
            Showing up to 50 rows.
          </div>
        </div>
      )}
    </main>
  );
}


