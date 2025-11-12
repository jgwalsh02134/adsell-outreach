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
exports.r = exports.importCsv = exports.createLead = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const sync_1 = require("csv-parse/sync");
const zod_1 = require("zod");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
// ---------- Types ----------
const LeadZ = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    contactName: zod_1.z.string().trim().optional(),
    phone: zod_1.z.string().trim().optional(),
    company: zod_1.z.string().trim().optional(),
    role: zod_1.z.string().trim().optional(),
    website: zod_1.z.string().trim().optional(),
    industry: zod_1.z.string().trim().optional(),
    source: zod_1.z.string().trim().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
function dedupeKey(l) {
    if (l.email && l.email.trim())
        return `e:${l.email.toLowerCase()}`;
    const n = (l.contactName ?? "").toLowerCase().replace(/\s+/g, "");
    const c = (l.company ?? "").toLowerCase().replace(/\s+/g, "");
    return `n:${n}|c:${c}`;
}
// ---------- 1) Create/Upsert Lead ----------
exports.createLead = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
    }
    try {
        const orgId = req.query.orgId || "default";
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
    }
    catch (e) {
        logger.error(e);
        res.status(400).json({ error: e.message ?? "invalid payload" });
    }
});
// ---------- 2) Import CSV ----------
const ImportZ = zod_1.z.object({
    orgId: zod_1.z.string().default("default"),
    csvText: zod_1.z.string(),
    mapping: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    bulkTags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    source: zod_1.z.string().optional(),
});
exports.importCsv = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 300 }, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
    }
    try {
        const { orgId, csvText, mapping, bulkTags, source } = ImportZ.parse(req.body);
        const rows = (0, sync_1.parse)(csvText, { columns: true, skip_empty_lines: true });
        const leads = rows.map((r) => {
            const obj = {};
            for (const [field, header] of Object.entries(mapping))
                obj[field] = r[header] ?? undefined;
            if (bulkTags?.length)
                obj.tags = [...new Set([...(obj.tags ?? []), ...bulkTags])];
            if (source)
                obj.source = source;
            return LeadZ.parse(obj);
        });
        const col = db.collection("leads");
        let inserted = 0, updated = 0, merged = 0;
        const batch = db.batch();
        const seen = new Map();
        for (const l of leads) {
            const key = dedupeKey(l);
            if (seen.has(key)) {
                batch.set(seen.get(key), { ...l, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                merged++;
                continue;
            }
            const existing = await col.where("orgId", "==", orgId).where("dedupe", "==", key).limit(1).get();
            if (!existing.empty) {
                const ref = existing.docs[0].ref;
                batch.set(ref, { ...l, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                updated++;
                seen.set(key, ref);
            }
            else {
                const ref = col.doc();
                batch.set(ref, {
                    ...l, orgId, dedupe: key, score: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                inserted++;
                seen.set(key, ref);
            }
        }
        await batch.commit();
        res.json({ inserted, updated, merged, total: leads.length });
    }
    catch (e) {
        logger.error(e);
        res.status(400).json({ error: e.message ?? "import failed" });
    }
});
// ---------- 3) Shortlink Redirect ----------
exports.r = (0, https_1.onRequest)({ cors: false, timeoutSeconds: 15 }, async (req, res) => {
    try {
        const shortCode = (req.path || req.url || "").split("/").pop();
        const snap = await db.collection("campaigns").where("shortCode", "==", shortCode).limit(1).get();
        if (snap.empty) {
            res.status(404).send("Not found");
            return;
        }
        const doc = snap.docs[0];
        await doc.ref.set({
            clicks: admin.firestore.FieldValue.increment(1),
            lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
            lastReferrer: req.get("referer") ?? null
        }, { merge: true });
        const target = doc.get("targetUrl") || "https://adsell.ai";
        res.redirect(302, target);
    }
    catch (e) {
        logger.error(e);
        res.status(500).send("error");
    }
});
