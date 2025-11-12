"use client";

import { useState } from "react";

export default function NewLeadPage() {
  const [form, setForm] = useState({
    email: "",
    name: "",
    company: "",
    phone: "",
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Lead submitted:", form);
    alert("Lead logged to console.");
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-heading">Add Lead Manually</h1>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border border-white/10 bg-white/5 p-6"
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-fg/80">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={onChange}
            className="w-full rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm outline-none ring-0 focus:border-primary"
            placeholder="jane@company.com"
          />
        </div>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm text-fg/80">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={onChange}
            className="w-full rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm outline-none ring-0 focus:border-primary"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label htmlFor="company" className="mb-1 block text-sm text-fg/80">
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            value={form.company}
            onChange={onChange}
            className="w-full rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm outline-none ring-0 focus:border-primary"
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-fg/80">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={onChange}
            className="w-full rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm outline-none ring-0 focus:border-primary"
            placeholder="+1 555 123 4567"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full rounded-lg bg-secondary px-6 py-3 font-medium text-white transition hover:brightness-110"
          >
            Save Lead
          </button>
        </div>
      </form>
    </main>
  );
}


