# adsell-outreach
AdSell Outreach — a no-auth, public prototype for sales &amp; marketing ops. Import leads via CSV or manual form, build segments, run multi-step email sequences, track 14-day trials, create promo short links, and view dashboards. Next.js + Firebase Functions.

## Local Dev

1) Backend (Firebase Emulators)

- Prereqs: Firebase CLI installed and logged in
- Terminal A:
  - `cd functions`
  - `npm i`
  - `npx firebase emulators:start`

2) Frontend (Next.js)

- Create `web/.env.local` with:

```
NEXT_PUBLIC_FUNCTIONS_BASE=http://127.0.0.1:5001/adsell-outreach/us-central1
```

- Terminal B:
  - `cd web`
  - `npm i`
  - `npm run dev`

3) Use the app

- Visit http://localhost:3000
- Upload CSV or add a lead. All writes go through HTTPS Functions; client Firestore writes are disabled by rules.

Notes:
- For production, set `NEXT_PUBLIC_FUNCTIONS_BASE` to your deployed Functions base, e.g. `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net`.
- Firestore rules (`firestore.rules`) deny client writes; the server functions perform writes.
