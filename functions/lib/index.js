"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCsv = exports.createLead = void 0;
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
const sync_1 = require("csv-parse/sync");
// Initialize Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp();
}
const firestore = admin.firestore();
// Enforce App Check on all HTTPS functions and set region
(0, options_1.setGlobalOptions)({
    region: "us-central1",
    enforceAppCheck: true,
    maxInstances: 10,
});
// Schemas
const leadSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1).max(200),
    company: zod_1.z.string().min(1).max(200).optional().default(""),
    phone: zod_1.z.string().max(100).optional().default(""),
});
const importSchema = zod_1.z.object({
    csvText: zod_1.z.string().min(1),
    mapping: zod_1.z.object({
        email: zod_1.z.string(), // column name for email
        name: zod_1.z.string().optional(),
        company: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
    }),
    delimiter: zod_1.z.string().length(1).optional(), // optional custom delimiter
});
exports.createLead = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
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
            .set({
            email: emailKey,
            name: lead.name,
            company: lead.company ?? "",
            phone: lead.phone ?? "",
            updatedAt: now,
            createdAt: now,
        }, { merge: true });
        res.status(200).json({ ok: true });
    }
    catch (err) {
        console.error("createLead error", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.importCsv = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 120 }, async (req, res) => {
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
        const records = (0, sync_1.parse)(csvText, {
            columns: true,
            skip_empty_lines: true,
            bom: true,
            delimiter: delimiter ?? undefined,
            trim: true,
        });
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
        const emailToLead = new Map();
        for (const row of records) {
            const emailRaw = (row[emailColumn] ?? "").toString().trim().toLowerCase();
            if (!emailRaw)
                continue;
            const lead = {
                email: emailRaw,
                name: (row[nameColumn] ?? "").toString().trim(),
                company: (row[companyColumn] ?? "").toString().trim(),
                phone: (row[phoneColumn] ?? "").toString().trim(),
            };
            // Validate each lead (only email strictly required)
            const valid = leadSchema.pick({ email: true }).safeParse({ email: lead.email });
            if (!valid.success)
                continue;
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
    }
    catch (err) {
        console.error("importCsv error", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
