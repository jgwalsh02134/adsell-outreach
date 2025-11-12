import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import { z } from "zod";
import { parse } from "csv-parse/sync";

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

// Enforce App Check on all HTTPS functions and set region
setGlobalOptions({
  region: "us-central1",
  enforceAppCheck: true,
  maxInstances: 10,
});

// Schemas
const leadSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200).optional().default(""),
  phone: z.string().max(100).optional().default(""),
});

const importSchema = z.object({
  csvText: z.string().min(1),
  mapping: z.object({
    email: z.string(),   // column name for email
    name: z.string().optional(),
    company: z.string().optional(),
    phone: z.string().optional(),
  }),
  delimiter: z.string().length(1).optional(), // optional custom delimiter
});

export const createLead = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }
      const parsed = leadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const lead = parsed.data;
      const emailKey = lead.email.toLowerCase().trim();
      const now = admin.firestore.FieldValue.serverTimestamp();
      await firestore
        .collection("leads")
        .doc(emailKey)
        .set(
          {
            email: emailKey,
            name: lead.name,
            company: lead.company ?? "",
            phone: lead.phone ?? "",
            updatedAt: now,
            createdAt: now,
          },
          { merge: true }
        );
      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("createLead error", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const importCsv = onRequest(
  { cors: true, timeoutSeconds: 120 },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }
      const parsed = importSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const { csvText, mapping, delimiter } = parsed.data;

      // Parse CSV
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        delimiter: delimiter ?? undefined,
        trim: true,
      }) as Record<string, string>[];

      // Simple request rate limiting guard: hard cap rows per request
      const MAX_ROWS = 1000;
      if (records.length > MAX_ROWS) {
        res.status(429).json({ error: `Too many rows (>${MAX_ROWS}).` });
        return;
      }

      // Map records to leads and dedupe by email
      const emailColumn = mapping.email;
      const nameColumn = mapping.name ?? "name";
      const companyColumn = mapping.company ?? "company";
      const phoneColumn = mapping.phone ?? "phone";

      const emailToLead = new Map<
        string,
        { email: string; name: string; company: string; phone: string }
      >();

      for (const row of records) {
        const emailRaw = (row[emailColumn] ?? "").toString().trim().toLowerCase();
        if (!emailRaw) continue;
        const lead = {
          email: emailRaw,
          name: (row[nameColumn] ?? "").toString().trim(),
          company: (row[companyColumn] ?? "").toString().trim(),
          phone: (row[phoneColumn] ?? "").toString().trim(),
        };
        // Validate each lead (only email strictly required)
        const valid = leadSchema.pick({ email: true }).safeParse({ email: lead.email });
        if (!valid.success) continue;
        emailToLead.set(emailRaw, lead); // dedupe by email
      }

      if (emailToLead.size === 0) {
        res.status(400).json({ error: "No valid rows with email found." });
        return;
      }

      // Batch write using BulkWriter for performance
      const writer = firestore.bulkWriter();
      const now = admin.firestore.FieldValue.serverTimestamp();
      for (const [email, lead] of emailToLead) {
        writer.set(firestore.collection("leads").doc(email), {
          email,
          name: lead.name,
          company: lead.company,
          phone: lead.phone,
          updatedAt: now,
          createdAt: now,
        }, { merge: true });
      }
      await writer.close();

      res.status(200).json({ ok: true, imported: emailToLead.size });
    } catch (err: any) {
      console.error("importCsv error", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);


