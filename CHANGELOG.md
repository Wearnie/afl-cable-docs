# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-16

Initial handover release. The app has been live in daily production at the AFL
Tottenham plant (Melbourne) since the migration from the original Vercel/GitHub-as-database
prototype to Azure Static Web Apps + Functions + Blob Storage. See `HANDOVER-BRIEF.md`
for the full context.

### Features

- QR sticker generation per DJ number with one-click image copy to clipboard
- Bulk Final Test Certificate upload with drag-and-drop (`/upload`)
- Customer-facing public scan pages at `/dj/<djNumber>` and `/<productCode>`
- Pattern-based document mapping with customer-suffix support (`-SYDT`, `-AG`, etc.)
- Per-DJ document overrides (admin)
- Full user management with email/password auth + bcrypt + JWT
- Role-aware UI (dispatch vs admin)
- Audit log for every write-path action

### Infrastructure

- Bicep template for one-command provisioning of Storage + SWA + Functions (`infra/main.bicep`)
- Data migration scripts: SAS-based and tarball-based (`scripts/restore-from-*.sh`)
- Parameterised first-admin seed (`scripts/seed-first-admin.cjs`)
- GitHub Actions workflow auto-deploys on push to `main`

### Documentation

- `README.md` — repo orientation
- `DEPLOY.md` — clone-to-go-live operational playbook
- `ARCHITECTURE.md` — system design + data model + API reference
- `RUNBOOK.md` — day-2 operational procedures
- `HANDOVER-BRIEF.md` — context + known issues + decisions for the receiving team
- `HANDOVER-SCREENSHOTS.md` — visual walkthrough of each page

### Tests

- 56 unit tests covering product-code pattern matching + suffix stripping (`src/data/documentMap.test.js`)

### Known issues at handover

See `HANDOVER-BRIEF.md` for the full list. Highlights:

- No rate limiting on `/api/auth/login` (low risk for an internal app, worth adding for production)
- PDF text extraction is fragile to template changes (relies on regex against page 1)
- No Application Insights instrumentation in code (resource provisionable via Bicep `enableMonitoring=true`)
- No E2E tests beyond unit tests for pattern matching

[1.0.0]: https://github.com/Wearnie/afl-cable-docs/releases/tag/v1.0-handover-ready
