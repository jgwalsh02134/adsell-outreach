"use client";

import { useState } from "react";
import Papa from "papaparse";
import { getAppCheckToken } from "@/src/lib/firebase";

type Row = Record<string, string>;

export default function UploadLeadsPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

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

  const onImport = async () => {
    try {
      setStatus("submitting");
      setMessage("");
      setError("");
      if (rows.length === 0) {
        setStatus("error");
        setMessage("No rows to import.");
        return;
      }
      // Build mapping by guessing headers
      const guess = (candidates: string[]) =>
        headers.find((h) => candidates.includes(h.toLowerCase())) ?? headers[0];
      const normalized = headers.map((h) => h.toLowerCase());
      const headerLowerToOriginal = new Map<string, string>();
      headers.forEach((h, i) => headerLowerToOriginal.set(normalized[i], h));
      const mapping = {
        email:
          headerLowerToOriginal.get("email") ??
          headerLowerToOriginal.get("e-mail") ??
          headerLowerToOriginal.get("work email") ??
          headerLowerToOriginal.get("business email") ??
          headers[0],
        name:
          headerLowerToOriginal.get("name") ??
          headerLowerToOriginal.get("full name") ??
          headerLowerToOriginal.get("contact") ??
          undefined,
        company:
          headerLowerToOriginal.get("company") ??
          headerLowerToOriginal.get("organization") ??
          headerLowerToOriginal.get("company name") ??
          undefined,
        phone:
          headerLowerToOriginal.get("phone") ??
          headerLowerToOriginal.get("phone number") ??
          headerLowerToOriginal.get("mobile") ??
          undefined,
      };

      const csvText = Papa.unparse(rows, { columns: headers });
      const appCheckToken = await getAppCheckToken();
      const res = await fetch("/api/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({ csvText, mapping }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setStatus("success");
      setMessage(`Imported ${data?.imported ?? rows.length} unique leads.`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Failed to import CSV.");
    }
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

      {status === "success" && (
        <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message || "Success."}
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message || "Something went wrong."}
        </div>
      )}

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
      <div className="mt-6">
        <button
          onClick={onImport}
          disabled={rows.length === 0 || status === "submitting"}
          className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {status === "submitting" ? "Importing..." : "Import to Leads"}
        </button>
      </div>
    </main>
  );
}
