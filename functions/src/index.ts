import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import { z } from "zod";
import { parse } from "csv-parse/sync";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// Canonical lead fields
type Lead = {
  email?: string;
  contactName?: string;
  company?: string;
  phone?: string;
  role?: string;
  website?: string;
  industry?: string;
  source?: string;
  tags?: string[];
  orgId?: string | null;
};

const createLeadSchema = z.object({
  orgId: z.string().optional(),
  lead: z.object({
    email: z.string().email().optional(),
    contactName: z.string().min(1).optional(),
    company: z.string().min(1).optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    website: z.string().url().optional(),
    industry: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const importCsvSchema = z.object({
  orgId: z.string().optional(),
  csvText: z.string().min(1),
  mapping: z.record(z.string()), // canonical -> column name
  bulkTags: z.array(z.string()).optional(),
  source: z.string().optional(),
});

function normalize(str?: string | null): string {
  return (str ?? "").toString().trim();
}
function normalizeEmail(email?: string | null): string {
  return normalize(email).toLowerCase();
}
function dedupKeyFromLead(lead: Lead): string | null {
  const emailKey = normalizeEmail(lead.email);
  if (emailKey) return `email:${emailKey}`;
  const name = normalize(lead.contactName);
  const company = normalize(lead.company);
  if (name && company) return `nc:${name.toLowerCase()}::${company.toLowerCase()}`;
  return null;
}
function docIdForLead(lead: Lead): string {
  const k = dedupKeyFromLead(lead);
  // use normalized email as doc id when available; else deterministic from name+company
  if (k?.startsWith("email:")) return k.slice(6);
  return Buffer.from(k ?? `${Date.now()}-${Math.random()}`).toString("hex").slice(0, 40);
}

export const createLead = onRequest({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { orgId, lead } = parsed.data;

    const key = dedupKeyFromLead(lead);
    if (!key) return res.status(400).json({ error: "Lead must include email or (contactName + company)." });
    const id = docIdForLead(lead);
    const ref = db.collection("leads").doc(id);
    const snap = await ref.get();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const payload = {
      email: normalizeEmail(lead.email) || admin.firestore.FieldValue.delete(),
      contactName: normalize(lead.contactName) || admin.firestore.FieldValue.delete(),
      company: normalize(lead.company) || admin.firestore.FieldValue.delete(),
      phone: normalize(lead.phone) || admin.firestore.FieldValue.delete(),
      role: normalize(lead.role) || admin.firestore.FieldValue.delete(),
      website: normalize(lead.website) || admin.firestore.FieldValue.delete(),
      industry: normalize(lead.industry) || admin.firestore.FieldValue.delete(),
      source: normalize(lead.source) || admin.firestore.FieldValue.delete(),
      tags: lead.tags && lead.tags.length ? lead.tags : admin.firestore.FieldValue.delete(),
      orgId: orgId ?? null,
      dedupKey: key,
      updatedAt: now,
      ...(snap.exists ? {} : { createdAt: now }),
    };
    await ref.set(payload, { merge: true });
    res.status(200).json({ inserted: snap.exists ? 0 : 1, updated: snap.exists ? 1 : 0, id });
  } catch (err) {
    console.error("createLead error", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export const importCsv = onRequest({ cors: true, timeoutSeconds: 300 }, async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const parsed = importCsvSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { orgId, csvText, mapping, bulkTags, source } = parsed.data;

    const rows = (parse(csvText, { columns: true, skip_empty_lines: true, bom: true, trim: true }) ??
      []) as Record<string, string>[];
    const MAX_ROWS = 5000;
    const total = rows.length;
    if (total > MAX_ROWS) return res.status(429).json({ error: `Too many rows (>${MAX_ROWS}).` });

    // Build leads using mapping: canonical -> column name
    const leadsRaw: Lead[] = rows.map((row) => {
      const get = (key: string) => normalize(row[mapping[key]]);
      const email = normalizeEmail(mapping.email ? row[mapping.email] : undefined);
      const lead: Lead = {
        email: email || undefined,
        contactName: get("contactName"),
        company: get("company"),
        phone: get("phone"),
        role: get("role"),
        website: get("website"),
        industry: get("industry"),
        source: source || get("source") || undefined,
        tags: bulkTags && bulkTags.length ? bulkTags : undefined,
        orgId: orgId ?? null,
      };
      return lead;
    });

    // Deduplicate by email OR (name+company)
    const dedup = new Map<string, Lead>();
    for (const lead of leadsRaw) {
      const key = dedupKeyFromLead(lead);
      if (!key) continue;
      dedup.set(key, lead);
    }
    const merged = total - dedup.size;
    const leads = Array.from(dedup.values());

    // Determine doc IDs and existence
    const docs = leads.map((l) => ({ id: docIdForLead(l), lead: l }));
    const refs = docs.map((d) => db.collection("leads").doc(d.id));
    // Batch existence check in chunks of 500
    const existsSet = new Set<string>();
    for (let i = 0; i < refs.length; i += 500) {
      const slice = refs.slice(i, i + 500);
      const snaps = await db.getAll(...slice);
      snaps.forEach((s) => {
        if (s.exists) existsSet.add(s.id);
      });
    }

    let inserted = 0;
    let updated = 0;
    const writer = db.bulkWriter();
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const { id, lead } of docs) {
      const exists = existsSet.has(id);
      if (exists) updated++;
      else inserted++;
      const payload = {
        email: normalizeEmail(lead.email) || admin.firestore.FieldValue.delete(),
        contactName: normalize(lead.contactName) || admin.firestore.FieldValue.delete(),
        company: normalize(lead.company) || admin.firestore.FieldValue.delete(),
        phone: normalize(lead.phone) || admin.firestore.FieldValue.delete(),
        role: normalize(lead.role) || admin.firestore.FieldValue.delete(),
        website: normalize(lead.website) || admin.firestore.FieldValue.delete(),
        industry: normalize(lead.industry) || admin.firestore.FieldValue.delete(),
        source: normalize(lead.source) || admin.firestore.FieldValue.delete(),
        tags: lead.tags && lead.tags.length ? lead.tags : admin.firestore.FieldValue.delete(),
        orgId: lead.orgId ?? null,
        dedupKey: dedupKeyFromLead(lead),
        updatedAt: now,
        ...(exists ? {} : { createdAt: now }),
      };
      writer.set(db.collection("leads").doc(id), payload, { merge: true });
    }
    await writer.close();

    res.status(200).json({ inserted, updated, merged, total });
  } catch (err) {
    console.error("importCsv error", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export const r = onRequest({ cors: false, timeoutSeconds: 15 }, async (req, res) => {
  try {
    if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const shortCode = parts[parts.length - 1] || "";
    if (!shortCode) return res.redirect(302, "https://adsell.ai");

    const snap = await db
      .collection("campaigns")
      .where("shortCode", "==", shortCode)
      .limit(1)
      .get();
    if (snap.empty) return res.redirect(302, "https://adsell.ai");
    const doc = snap.docs[0];
    const data = doc.data() || {};
    const targetUrl = typeof data.targetUrl === "string" && data.targetUrl ? data.targetUrl : "https://adsell.ai";
    await doc.ref.set(
      {
        clicks: admin.firestore.FieldValue.increment(1),
        lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    res.redirect(302, targetUrl);
  } catch (err) {
    console.error("redirect r error", err);
    res.redirect(302, "https://adsell.ai");
  }
});


