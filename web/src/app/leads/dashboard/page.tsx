"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, orderBy, limit, query,
  getCountFromServer, where, Timestamp
} from "firebase/firestore";

type Lead = { id:string; email?:string; contactName?:string; company?:string; source?:string; createdAt?:any };

export default function Dashboard() {
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [weekImports, setWeekImports] = useState<number>(0);
  const [recent, setRecent] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const leadsCol = collection(db, "leads");
        const totalSnap = await getCountFromServer(leadsCol);
        setTotalLeads(totalSnap.data().count);

        const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7*24*60*60*1000);
        const qWeek = query(leadsCol, where("createdAt", ">=", sevenDaysAgo));
        const weekSnap = await getCountFromServer(qWeek);
        setWeekImports(weekSnap.data().count);

        const qRecent = query(leadsCol, orderBy("createdAt", "desc"), limit(10));
        const rSnap = await getDocs(qRecent);
        setRecent(rSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-12">
      <h1 className="font-heading text-3xl mb-2">Dashboard</h1>
      <p className="opacity-80 mb-6">High-level snapshot of outreach activity.</p>

      <div className="grid md:grid-cols-3 gap-5">
        <Kpi label="Total Leads" value={totalLeads} loading={loading} />
        <Kpi label="Imports (7d)" value={weekImports} loading={loading} />
        <Kpi label="Sequences Running" value={0} loading={loading} hint="Placeholder" />
      </div>

      <div className="mt-8 card p-6">
        <div className="font-semibold mb-3">Recent Leads</div>
        <div className="overflow-auto border border-[var(--border)] rounded-2xl">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr><Th>Email</Th><Th>Name</Th><Th>Company</Th><Th>Source</Th><Th>Created</Th></tr>
            </thead>
            <tbody>
              {recent.map(l => (
                <tr key={l.id} className="odd:bg-[#0b111a]">
                  <Td>{l.email}</Td>
                  <Td>{l.contactName}</Td>
                  <Td>{l.company}</Td>
                  <Td>{l.source}</Td>
                  <Td>{l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString() : ""}</Td>
                </tr>
              ))}
              {!loading && recent.length === 0 && (
                <tr><td className="px-3 py-6 opacity-70" colSpan={5}>No leads yet. Try adding one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, loading, hint }:{label:string; value:number; loading:boolean; hint?:string}) {
  return (
    <div className="rounded-2xl bg-[#0b111a] border border-[var(--border)] p-5">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-3xl font-semibold">{loading ? "…" : value}</div>
      {hint && <div className="text-xs opacity-60 mt-1">{hint}</div>}
    </div>
  );
}
function Th({children}:{children:any}){return <th className="px-3 py-2 text-left font-medium">{children}</th>}
function Td({children}:{children:any}){return <td className="px-3 py-2">{children}</td>}


