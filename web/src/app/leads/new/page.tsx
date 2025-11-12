"use client";

import { useState } from "react";
type Form = { email: string; name: string; company: string; phone: string };
const initial: Form = { email: "", name: "", company: "", phone: "" };

export default function NewLead() {
  const [form, setForm] = useState<Form>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const set = (k: keyof Form) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const validate = (): boolean => {
    const e: Partial<Form> = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.name) e.name = "Name required";
    if (!form.company) e.company = "Company required";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setMsg(null); setErr(null);
    if (!validate()) return;
    try {
      const res = await fetch("/api/create-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "default",
          lead: {
            email: form.email,
            contactName: form.name,
            company: form.company,
            phone: form.phone,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create lead.");
      setMsg(`Saved! ${data.inserted ? "Inserted" : "Updated"} (id: ${data.id ?? "n/a"}).`);
      setForm(initial);
    } catch (e: any) {
      setErr(e?.message || "Request failed.");
    }
  };
  return (
    <div className="container py-12">
      <h1 className="font-heading text-3xl mb-2">Add Lead Manually</h1>
      <p className="opacity-80 mb-6">Add a single potential client quickly.</p>
      <form onSubmit={submit} className="card p-6 md:p-8 grid gap-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" value={form.email} onChange={set("email")} placeholder="alex@brand.com" />
          {errors.email && <div className="text-red-400 text-sm mt-1">{errors.email}</div>}
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={form.name} onChange={set("name")} placeholder="Alex Taylor" />
            {errors.name && <div className="text-red-400 text-sm mt-1">{errors.name}</div>}
          </div>
          <div>
            <label className="label" htmlFor="company">Company</label>
            <input id="company" className="input" value={form.company} onChange={set("company")} placeholder="Acme Inc." />
            {errors.company && <div className="text-red-400 text-sm mt-1">{errors.company}</div>}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" className="input" value={form.phone} onChange={set("phone")} placeholder="+1 555 123 4567" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn btn-secondary">Save Lead</button>
          <a href="/" className="btn btn-ghost">Cancel</a>
        </div>
        {msg && <div className="text-sm opacity-80 text-emerald-300">{msg}</div>}
        {err && <div className="text-sm opacity-80 text-red-400">{err}</div>}
      </form>
    </div>
  );}
