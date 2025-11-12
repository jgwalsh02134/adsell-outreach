import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { parse } from "csv-parse/sync";
import { z } from "zod";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ---------- Types ----------
const LeadZ = z.object({
  email: z.string().email().optional(),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  role: z.string().trim().optional(),
  website: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  source: z.string().trim().optional(),
  tags: z.array(z.string()).optional().default([]),
});
type Lead = z.infer<typeof LeadZ>;

function dedupeKey(l: Lead) {
  if (l.email && l.email.trim()) return `e:${l.email.toLowerCase()}`;
  const n = (l.contactName ?? "").toLowerCase().replace(/\s+/g, "");
  const c = (l.company ?? "").toLowerCase().replace(/\s+/g, "");
  return `n:${n}|c:${c}`;
}

// ---------- 1) Create/Upsert Lead ----------
export const createLead = onRequest({ cors: true, timeoutSeconds: 30 }, async (req, res): Promise<void> => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  try {
    const orgId = (req.query.orgId as string) || "default";
    const lead = LeadZ.parse(req.body?.lead ?? {});
    const key = dedupeKey(lead);

    const col = db.collection("leads");
    const existing = await col.where("orgId", "==", orgId).where("dedupe", "==", key).limit(1).get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.set({ ...lead, orgId, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      res.json({ inserted: 0, updated: 1, id: doc.id });
      return;
    }

    const doc = await col.add({
      ...lead,
      orgId,
      dedupe: key,
      score: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ inserted: 1, updated: 0, id: doc.id });
  } catch (e: any) {
    logger.error(e);
    res.status(400).json({ error: e.message ?? "invalid payload" });
  }
});

// ---------- 2) Import CSV ----------
const ImportZ = z.object({
  orgId: z.string().default("default"),
  csvText: z.string(),
  mapping: z.record(z.string(), z.string()),
  bulkTags: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
});

export const importCsv = onRequest({ cors: true, timeoutSeconds: 300 }, async (req, res): Promise<void> => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  try {
    const { orgId, csvText, mapping, bulkTags, source } = ImportZ.parse(req.body);
    const rows: any[] = parse(csvText, { columns: true, skip_empty_lines: true });

    const leads: Lead[] = rows.map((r) => {
      const obj: any = {};
      for (const [field, header] of Object.entries(mapping)) obj[field] = (r as any)[header] ?? undefined;
      if (bulkTags?.length) obj.tags = [...new Set([...(obj.tags ?? []), ...bulkTags])];
      if (source) obj.source = source;
      return LeadZ.parse(obj);
    });

    const col = db.collection("leads");
    let inserted = 0, updated = 0, merged = 0;
    const batch = db.batch();
    const seen = new Map<string, FirebaseFirestore.DocumentReference>();

    for (const l of leads) {
      const key = dedupeKey(l);

      if (seen.has(key)) {
        batch.set(seen.get(key)!, { ...l, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        merged++; continue;
      }

      const existing = await col.where("orgId", "==", orgId).where("dedupe", "==", key).limit(1).get();
      if (!existing.empty) {
        const ref = existing.docs[0].ref;
        batch.set(ref, { ...l, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        updated++; seen.set(key, ref);
      } else {
        const ref = col.doc();
        batch.set(ref, {
          ...l, orgId, dedupe: key, score: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        inserted++; seen.set(key, ref);
      }
    }

    await batch.commit();
    res.json({ inserted, updated, merged, total: leads.length });
  } catch (e: any) {
    logger.error(e);
    res.status(400).json({ error: e.message ?? "import failed" });
  }
});

// ---------- 3) Shortlink Redirect ----------
export const r = onRequest({ cors: false, timeoutSeconds: 15 }, async (req, res): Promise<void> => {
  try {
    const shortCode = (req.path || req.url || "").split("/").pop()!;
    const snap = await db.collection("campaigns").where("shortCode", "==", shortCode).limit(1).get();
    if (snap.empty) { res.status(404).send("Not found"); return; }

    const doc = snap.docs[0];
    await doc.ref.set({
      clicks: admin.firestore.FieldValue.increment(1),
      lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
      lastReferrer: req.get("referer") ?? null
    }, { merge: true });

    const target = (doc.get("targetUrl") as string) || "https://adsell.ai";
    res.redirect(302, target);
  } catch (e: any) {
    logger.error(e);
    res.status(500).send("error");
  }
});


