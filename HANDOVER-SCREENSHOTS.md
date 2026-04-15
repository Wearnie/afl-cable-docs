# Visual Walkthrough — AFL Cable Docs

A screen-by-screen tour of the app as used in production. Read this after HANDOVER-BRIEF.md and before diving into the code.

Screenshots live in [`docs/screenshots/`](./docs/screenshots/) and are embedded below. If an image is missing, the caption still tells you what you'd see.

---

## 1. Login

The one public entry point for the authenticated surface. JWT-backed, session-scoped (clears on browser close). First login forces a password change.

![Login screen](./docs/screenshots/01-login.png)

---

## 2. Home — Dispatch view

Dispatch sees a single card: the QR Sticker Generator. Nothing else is surfaced — they don't need anything else.

Top-right: the user chip showing signed-in name, role, and a Sign Out button.

![Home as dispatch](./docs/screenshots/02-home-dispatch.png)

---

## 3. Home — Admin view

Admins see four cards: QR Generator (primary), Pattern Audit, Coverage Audit, User Management. Same signed-in chip top-right.

![Home as admin](./docs/screenshots/03-home-admin.png)

---

## 4. Generate — Dispatch view

Two sections, top to bottom:
- **Create QR Code** (primary) — DJ number + product code, click Generate QR.
- **Upload Final Test Certificate** — drop a cert PDF, DJ + product code auto-extracted.

Nothing else. Deliberately minimal for the yellow-sheet workflow.

![Generate as dispatch](./docs/screenshots/04-generate-dispatch.png)

---

## 5. Generate — Admin view

Same two sections as dispatch, plus a third "Or look up an existing DJ" admin panel in the middle. That panel resolves an already-mapped DJ, shows the docs that would appear, and lets admins add/remove per-DJ document overrides.

![Generate as admin](./docs/screenshots/05-generate-admin.png)

---

## 6. Generate — QR rendered

After Create QR, the QR image, its target URL, docs preview, and action buttons render inline: **Copy QR Image** (writes a PNG to the system clipboard), **Download**, **Print Sticker**, **Copy URL**. Copy-QR-Image is the button dispatch actually uses day-to-day — they paste straight into their label template.

![Generated QR with buttons](./docs/screenshots/06-generate-qr-rendered.png)

---

## 7. Upload — bulk cert upload mid-progress

Multi-select PDFs (file input has the `multiple` attribute). Uploads run sequentially (etag concurrency on the shared `dj-mapping.json`) with per-row status: queued → uploading → success/failure with reason. End-of-run summary: "N uploaded · M failed".

![Bulk cert upload in progress](./docs/screenshots/07-upload-bulk.png)

---

## 8. Pattern Audit (admin only)

Where document-to-product-code patterns are reviewed and edited. Full CRUD on `document-map.json`. Filters by type (TDS, Stripping, Installation, Other), search by pattern or document name.

![Pattern audit](./docs/screenshots/08-pattern-audit.png)

---

## 9. Coverage Audit (admin only)

Loads every product code the app knows about, runs `findDocuments()` against each, and flags codes missing any document type. Useful before a release to verify no customer ships without the right docs behind their QR.

![Coverage audit](./docs/screenshots/09-coverage-audit.png)

---

## 10. User Management (admin only)

List, create, edit, delete users. Role dropdown (`dispatch` / `admin`), password reset inline (forces change-on-next-login).

![User management](./docs/screenshots/10-users.png)

---

## 11. Public QR scan — by DJ number

What the customer sees when they scan the sticker on a drum. No login. Clean, mobile-first layout: logo header, DJ badge, then a card listing every document for that order. Tapping a card opens the PDF directly from Blob Storage.

Reached via `/dj/<djNumber>`. This is the "real" scan URL; every newly-printed sticker points here.

![Public DJ scan](./docs/screenshots/11-public-scan-dj.png)

---

## 12. Public QR scan — with Final Test Cert attached

Same view as above, but after the cert has been uploaded. The cert appears as a "Test Certificate" card alongside the product docs.

If a DJ hits this page *before* its cert is uploaded, the cert row reads "pending upload" — the printable QR is still useful pre-cert.

![Public scan with cert](./docs/screenshots/12-public-scan-cert.png)

---

## How to capture these screenshots

For Tom (before handover) or the US team (after re-platform) to regenerate this walkthrough:

1. Log into the deployed app with both a dispatch and an admin account.
2. Capture each screen at roughly 1440×900 viewport (macOS Preview or built-in screenshot tool is fine).
3. Save to `docs/screenshots/NN-<name>.png` using the filenames referenced above.
4. Commit the PNGs.
5. Optionally export this markdown to PDF via VS Code's markdown preview → print-to-PDF, or GitHub's preview → print, to attach to the handover email.

The markdown file references images by relative path, so dropping the files in place "turns on" each image with no edits needed here.
