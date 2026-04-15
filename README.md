# AFL Cable Docs

> **Standing up a fresh instance?** → See [DEPLOY.md](./DEPLOY.md). Clone → Bicep → migrate data → smoke test. One working day end-to-end.

Internal web app for AFL Global (Melbourne). Dispatch staff print QR labels for cable drums; customers scan the label to access the relevant product documents (TDS, stripping, installation, final test certificate).

Stack: **React 19 + Vite** frontend, **Azure Functions** (Node.js) API, **Azure Blob Storage** for data + PDFs, served as an **Azure Static Web App**.

## Repo map

```
src/              React frontend (Vite)
  pages/          Route components
  components/     Shared UI (AuthProvider, QRGenerator, DocumentCard, …)
  data/           Client-side lookups (documentMap, djLookup, finalTestCerts)
  lib/            API client (adminApi.js — all /api calls)
api/              Azure Functions (one file per endpoint)
  lib/            Shared helpers (auth.js, blob-storage.js, azure-adapter.js)
public/           Static assets; local-dev fallback for /data and /docs
scripts/          Dev-only utilities (URL extraction, archives)
seed-users.cjs    One-off script to seed the first admin user
staticwebapp.config.json  Azure SWA routing + fallback rules
```

Deeper reference:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — system diagram, data model, API reference, auth
- **[RUNBOOK.md](./RUNBOOK.md)** — env vars, Azure resources, ops procedures, secret rotation
- **[HANDOVER-BRIEF.md](./HANDOVER-BRIEF.md)** — context for the US dev team, known issues, what we'd rebuild differently

## Quick start (local dev)

Prereqs: Node 22.12+ (or 20.19+), npm.

```bash
git clone <repo>
cd afl-cable-docs
npm install
npm run dev
```

Default dev mode skips real auth (falls through to `admin` role) because `JWT_SECRET` isn't set locally. Data loads from `public/data/*.json`; PDFs served from `public/docs/`.

For full-stack local dev against real Azure Functions, use the Azure Static Web Apps CLI:

```bash
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --api-location api
# Then set the env vars in api/local.settings.json (see RUNBOOK.md)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 (frontend only) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (currently: pattern-matching unit tests) |

## Deploy

Pushes to `main` trigger GitHub Actions (`.github/workflows/azure-static-web-apps-lemon-moss-071796800.yml`) which builds and deploys to Azure SWA. No manual step.

Env vars live in **Azure Portal → Static Web App → Configuration**, not in the repo. See RUNBOOK.md for the full list.

## Current live URL

Azure-generated: `https://lemon-moss-071796800.6.azurestaticapps.net`

No custom domain. US dev team will wire up their own when re-platformed.

## Public routes (no auth)

- `/dj/:djNumber` — QR landing page by DJ number
- `/:productCode` — QR landing page by product code (legacy — safe to remove once all printed labels are DJ-based)

Everything else requires login (dispatch or admin). See ARCHITECTURE.md for the full route + role matrix.

## Tests

`src/data/documentMap.test.js` — 56 tests covering pattern matching, suffix stripping (safe + customer), TDS resolution for customer-suffixed codes. Good signal when modifying product-code logic.

No integration or E2E tests. Manual smoke tests documented in RUNBOOK.md.
