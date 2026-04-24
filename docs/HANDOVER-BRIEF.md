# Handover Brief — AFL Cable Docs

For the US software team taking over this repo from AFL Melbourne.

## TL;DR

- **What:** a small internal web app that replaces AFL Melbourne's manual cable-documentation email workflow with a QR-on-the-drum + self-serve customer page.
- **Where it lives now:** Azure Static Web App (`lemon-moss-071796800.6.azurestaticapps.net`), Azure Blob Storage, GitHub Actions deploy. ~$2/month running cost.
- **Status:** in daily production use by the Melbourne dispatch team. Stable. Ready to re-platform.
- **Read these three docs alongside this one:** [README.md](../README.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [RUNBOOK.md](./RUNBOOK.md). Optional visual tour: [HANDOVER-SCREENSHOTS.md](./HANDOVER-SCREENSHOTS.md).
- **Switching sign-in to Microsoft Entra ID:** the code is already in place behind a feature flag. See [SSO-MIGRATION.md](./SSO-MIGRATION.md) for the full playbook — Entra app registration, role mapping, env vars, rollback.

## Getting started for the US team

A sensible first-day order of operations:

1. Clone the repo, `npm install`, `npm run dev` — local dev mode skips auth and loads from `public/data/`. You'll see the app within 30 seconds of cloning.
2. Read **README.md** for the repo layout and scripts.
3. Read **ARCHITECTURE.md** for the data model, core workflows, API reference, and the product-code pattern-matching rules (the last bit is non-trivial — take it seriously).
4. Browse **HANDOVER-SCREENSHOTS.md** for a visual tour of each page as used by dispatch and admin.
5. Use **RUNBOOK.md** as the reference when standing up your own Azure resources: env vars, secrets, deploy mechanics, ops procedures.
6. Smoke-test against the existing deployed app with a dispatch credential to feel the workflow before you touch the code.

## What this app actually does

AFL Melbourne ships fibre-optic cable drums. Each drum has a "yellow sheet" that lists a DJ number (order ID) and a product code. Historically, product documentation (TDS, stripping, installation, final test cert) went to the customer by email after the drum shipped — manual, error-prone, asynchronous.

This app replaces that with a QR on the drum label. Workflow:

1. Dispatch takes the yellow sheet, types DJ + product code into `/generate`, prints the QR sticker, slaps it on the drum.
2. QC uploads the Final Test Certificate PDF (single or bulk) at `/upload`. PDF is parsed server-side for DJ + product code; cert attaches to the DJ automatically.
3. Customer scans the QR → sees all the relevant docs including the cert, no email/chase-up.

Admin surface (`/audit`, `/coverage`, `/users`, `/admin`, `/review`, etc.) is for curating the pattern → document mappings that power the lookup.

## Who uses it

- **Dispatch** (5–10 users): generate QR, upload certs. Role: `dispatch`.
- **Admins** (~2–3 people — Mithra, Jim): everything above plus pattern/doc maintenance and user management. Role: `admin`.
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
| JSON-in-blob as the data store | Works fine at current scale; no transactional guarantees beyond ETag concurrency. Sync endpoint does a full-file merge. | Cosmos DB or a small Postgres would be nicer long-term. |
| No server-side pattern matching API | Client downloads the whole doc-map (few KB today, grows linearly with doc count) | Move `findDocuments()` into an API endpoint once doc count crosses ~1,000 patterns. |
| No infrastructure as code | All Azure resources were created through the portal | Bicep or Terraform for reproducibility — especially important for you standing up a new tenant. |
| No Application Insights / alerting | No production observability beyond the SWA portal metrics | Wire it up when you re-host. |
| No E2E tests | Unit tests cover pattern logic only | A Playwright smoke test for the login → generate → scan → cert upload loop would be cheap insurance. |
| Dev-mode auth fallback | When `JWT_SECRET` isn't set, `requireDispatch`/`requireAdmin` silently pass. Safe in dev; would be dangerous in prod if `JWT_SECRET` were ever absent. | Consider failing closed in prod as belt-and-braces, even though the env-var check is already there. |
| PDF text extraction is fragile | `pdf-parse` regex matches specific wording on page 1. Scanned PDFs without a text layer fail with a generic error. | If the supplier PDF format ever changes, cert upload breaks silently. Add a fallback or an explicit "parse failed" UI. |

## What's in the repo you might not need

- `scripts/seed-first-admin.cjs` — one-off script to bootstrap the first admin user. Keep until you've added your own seeding path (or switched to Entra SSO — see [SSO-MIGRATION.md](./SSO-MIGRATION.md)), then delete.

Note: `api/product-codes.js` IS used (consumed by `CoverageAuditPage` and `ReviewMatchesPage`) — don't remove it.

## Decisions that need a real call

1. **Domain.** Currently the Azure-generated `lemon-moss-071796800.6.azurestaticapps.net`. AFL will want `docs.afl.com.au` or similar — your call based on whose domain it sits under.
2. **Repo ownership.** Repo currently sits on the original author's GitHub during the handover window; it should be transferred or forked into an AFL-owned GitHub organisation as your first action. See `DEPLOY.md` §1.
3. **Auth provider.** Currently email/password with bcrypt hashes in a JSON file. If AFL has SSO (Azure AD / Entra), you'll probably want to wire that up.
4. **Data hosting.** You'll stand up your own Azure tenant. Can either (a) re-create the blob layout and import the JSON snapshots + PDFs, or (b) rewrite against a DB and import via a migration script.

## Handover checklist

- [ ] Repo transferred / cloned into your GitHub org
- [ ] Azure SWA + storage + Functions stood up in your tenant
- [ ] Env vars configured (`AZURE_STORAGE_CONNECTION_STRING`, `JWT_SECRET`, `VITE_DOC_BASE_URL`, `AZURE_FUNCTIONS_ENVIRONMENT=Production`)
- [ ] `data/*.json` snapshots imported into the new blob
- [ ] `docs/**/*.pdf` imported into the new blob (or new paths mapped in `document-map.json`)
- [ ] First admin seeded (via `scripts/seed-first-admin.cjs` or equivalent)
- [ ] GitHub Actions deploy token regenerated & added to new repo
- [ ] Custom domain wired up (if desired)
- [ ] Smoke test: login → register a DJ → generate QR → upload a cert PDF → scan the QR → see the cert

## Contact (post-handover)

Tom Wearne — tom.wearne@aflglobal.com — happy to answer questions for ~30 days after handover. Ping about anything that's not obvious from the code or these docs.
Mithra BaluBavitha — mithra.balubavitha@aflglobal.com — primary ongoing contact for AFL-side workflow questions.

---

*Prepared by Tom Wearne · v1.0 handover · April 2026*
