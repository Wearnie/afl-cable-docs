# Handover Brief — For the US Software Team

Short context on this repo so you can decide what to keep, rebuild, or retire before re-platforming it into your Azure tenancy.

## What this app actually does

AFL Melbourne ships fibre-optic cable drums. Each drum has a "yellow sheet" that lists a DJ number (order ID) and a product code. Historically, product documentation (TDS, stripping, installation, final test cert) went to the customer by email after the drum shipped — manual, error-prone, asynchronous.

This app replaces that with a QR on the drum label. Workflow:

1. Dispatch takes the yellow sheet, types DJ + product code into `/generate`, prints the QR sticker, slaps it on the drum.
2. QC uploads the Final Test Certificate PDF (single or bulk) at `/upload`. PDF is parsed server-side for DJ + product code; cert attaches to the DJ automatically.
3. Customer scans the QR → sees all the relevant docs including the cert, no email/chase-up.

Admin surface (`/audit`, `/coverage`, `/users`, `/admin`, `/review`, etc.) is for curating the pattern → document mappings that power the lookup.

## Who uses it

- **Dispatch** (5-10 users): generate QR, upload certs. Role: `dispatch`.
- **Admins** (~2-3 people — Mithra, Jim): everything above plus pattern/doc maintenance and user management. Role: `admin`.
- **Customers** (hundreds, intermittent): anonymous scan of the QR — no auth.

## What works well

- **QR workflow is solid.** Copy-QR-image to clipboard means dispatch pastes straight into their existing label template.
- **Pattern matching is well-tested** (56 unit tests). Customer-suffix handling (`-SYDT`, `-AG`, etc.) is non-trivial and correct.
- **Bulk cert upload** does what it says — drop 20 PDFs, walk away.
- **Auth is minimal but correct** (bcrypt, JWT, role gates, password reset flow).
- **Zero ongoing cost** — everything sits in SWA Free + pay-per-use Blob, ~$2/month total.

## Known issues / things we'd rebuild differently

| Issue | Impact | What we'd do |
|---|---|---|
| JSON-in-blob as the data store | Works fine at current scale, but no transactional guarantees beyond ETag concurrency. Sync endpoint does a full-file merge. | Cosmos DB or even a tiny Postgres would be nicer long-term. |
| No server-side pattern matching API | Client has to download the whole doc-map (few KB, fine today; grows linearly with doc count) | Move `findDocuments()` into an API endpoint once doc count crosses ~1000 patterns. |
| No infrastructure as code | All Azure resources were clicked into existence | Bicep or Terraform for reproducibility — especially important for you standing up in a new tenant. |
| `/api/sync-mapping` has no UI trigger | Only reachable via curl | Add a button to `/admin` if you keep the SharePoint dependency. |
| `QRGenerator`'s `mode="product"` branch | No caller left after dispatch workflow change. Dead code. | Delete when you're confident no printed product-code QRs are still in circulation. |
| `/api/verify-admin` | Legacy endpoint. Superseded by `/api/auth/me`. | Delete. |
| No Application Insights / alerting | Fires in the dark | Wire it up when you re-host. |
| No E2E tests | Unit tests cover pattern logic only | Playwright smoke test for the login → generate → scan → cert upload loop would be cheap insurance. |
| Dev-mode auth fallback | When `JWT_SECRET` isn't set, `requireDispatch` / `requireAdmin` silently pass. Fine for local dev, scary if anyone ever deploys without `JWT_SECRET` set. | Consider failing closed in prod even if env var check is cheap belt-and-braces. |
| PDF text extraction is fragile | `pdf-parse` regex against specific wording. Scanned PDFs without text layer fail. | If the supplier PDF format ever changes, cert upload breaks silently. Consider fallback or explicit error UI. |

## What's in the repo that you probably don't need

- `seed-users.cjs` — one-off script to bootstrap the first admin. Keep until you've added your own seeding path, then delete.
- `scripts/convert-urls.js`, `scripts/extract-urls.js`, `scripts/url-mapping.json` — migration helpers from the pre-Azure setup. Safe to delete.
- `api/sync-mapping.js` + Microsoft Graph env vars — SharePoint sync. It's manual-only and was mostly an emergency rehydrate path. If you don't want the SharePoint dependency, delete the endpoint and drop the env vars.
- `api/product-codes.js` — thin list endpoint, only used by one admin page. Could inline-fetch `dj-mapping.json` directly.

## What needs a real decision

1. **Domain.** Currently the Azure-generated `lemon-moss-071796800.6.azurestaticapps.net`. AFL will want `docs.afl.com.au` or similar — your call based on whose domain it sits under.
2. **Repo ownership.** Repo is being transferred from the original author's personal GitHub (`Wearnie/afl-cable-docs`) to an AFL org. You'll want it in your team's GitHub org.
3. **Auth provider.** Currently email/password with bcrypt hashes in a JSON file. If AFL has SSO (Azure AD / Entra), you'll probably want to wire that up.
4. **Data hosting.** You'll stand up your own Azure tenant. Can either (a) re-create the blob layout and import the JSON snapshots + PDFs, or (b) rewrite against a DB and import via a migration script.

## Handover checklist

- [ ] Repo transferred / cloned into your GitHub org
- [ ] Azure SWA + storage + Functions stood up in your tenant
- [ ] Env vars configured (`AZURE_STORAGE_CONNECTION_STRING`, `JWT_SECRET`, `VITE_DOC_BASE_URL`, `AZURE_FUNCTIONS_ENVIRONMENT=Production`)
- [ ] `data/*.json` snapshots imported into the new blob
- [ ] `docs/**/*.pdf` imported into the new blob (or new paths mapped in `document-map.json`)
- [ ] First admin seeded (via `seed-users.cjs` or equivalent)
- [ ] GitHub Actions deploy token regenerated & added to new repo
- [ ] Custom domain wired up (if desired)
- [ ] Smoke test: login → register a DJ → generate QR → upload a cert PDF → scan the QR → see the cert

## Contact (post-handover)

Tom Wearne — tom.wearne@icloud.com — happy to answer questions for ~30 days after handover. Ping about anything that's not obvious from the code or these docs.
