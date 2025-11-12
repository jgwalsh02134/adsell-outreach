export default function Home() {
  return (
    <section className="relative">
      <div className="container py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl leading-tight">Reach more publishers & advertisers — faster.</h1>
            <p className="mt-4 opacity-80">Import leads from CSV or add them individually, then run outreach.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a className="btn btn-primary" href="/leads/upload">Upload CSV</a>
              <a className="btn btn-secondary" href="/leads/new">Add Lead Manually</a>
              <a className="btn btn-ghost" href="/app/dashboard">View Dashboard</a>
            </div>
            <div className="mt-5 text-sm opacity-70">CSV preview shows first 50 rows.</div>
          </div>
          <div className="card p-6 md:p-8">
            <div className="text-sm opacity-75 mb-3">Today’s Snapshot</div>
            <div className="grid grid-cols-3 gap-4">
              <Kpi label="Leads" value="0" />
              <Kpi label="Sequences" value="0" />
              <Kpi label="Trials" value="0" />
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-6 text-sm opacity-80">Start by uploading a list or adding a single contact.</div>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="container py-10 grid md:grid-cols-3 gap-6">
          <Feature title="Fast CSV Intake" desc="Clean mapping, preview, and import in minutes." />
          <Feature title="Manual Add" desc="Quick form for single contacts." />
          <Feature title="On-brand UI" desc="Space Grotesk + Inter with AdSell colors." />
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="rounded-2xl bg-[#0b111a] border border-[var(--border)] p-4">
    <div className="text-xs opacity-70">{label}</div><div className="text-2xl font-semibold">{value}</div></div>);
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (<div className="rounded-2xl bg-[#0b111a] border border-[var(--border)] p-5">
    <div className="font-semibold">{title}</div><div className="mt-1 opacity-75 text-sm">{desc}</div></div>);
}
