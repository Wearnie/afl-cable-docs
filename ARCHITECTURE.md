# Architecture

## System overview

```
 ┌────────────────┐      HTTPS       ┌──────────────────────────────┐
 │  Browser (SPA) │ ───────────────> │  Azure Static Web App        │
 │   React + Vite │                  │  ─ static hosting (dist/)    │
 └────────────────┘                  │  ─ managed Functions API     │
         │                           │     (api/ folder)            │
         │ <──── JSON + PDFs ─────── │                              │
         │                           └──────────────┬───────────────┘
         │                                          │
         │                                          │  Azure SDK
         │                                          v
         │                           ┌──────────────────────────────┐
         │                           │  Azure Blob Storage          │
         │                           │   container: afl-cable-docs  │
         │                           │   ├ data/*.json              │
         │                           │   └ docs/<type>/*.pdf        │
         │                           └──────────────────────────────┘
         │
         │  Direct read of PDFs (bypasses API for bandwidth)
         └───────────> https://aflcabledocs.blob.core.windows.net/afl-cable-docs/docs/...
```

Three layers, one tenant-hosted dependency (SharePoint via Microsoft Graph, used only by the sync endpoint).

## Data model

All persistent data lives as JSON in Azure Blob Storage (container `afl-cable-docs`, prefix `data/`). No relational DB. ETag-based optimistic concurrency (`readJSON` + `writeJSON` in `api/lib/blob-storage.js`).

| File | Shape | Owned by |
|---|---|---|
| `data/users.json` | `{ [email]: { name, role, passwordHash, mustChangePassword, createdAt } }` | `api/auth/users.js`, `api/auth/login.js`, `api/auth/password.js` |
| `data/dj-mapping.json` | `{ [djNumber]: productCode }` | `api/dj-mapping.js` (CRUD), `api/upload-cert.js` (side-effect write), `api/sync-mapping.js` (bulk SharePoint merge) |
| `data/document-map.json` | `{ entries: [{ pattern, type, name, path }] }` | `api/document-map.js` |
| `data/final-test-certs.json` | `{ [djNumber]: { url, name, productCode, uploadedAt } }` | `api/upload-cert.js` |
| `data/dj-doc-overrides.json` | `{ [djNumber]: { exclude: [path], include: [{type,name,path}] } }` | `api/dj-overrides.js` |
| `data/audit-log.jsonl` | Line-delimited JSON: `{ ts, user, action, target, … }` | `appendAuditLog()` in `blob-storage.js` |

Blob layout for PDFs:

```
docs/
  tds/*.pdf
  stripping/*.pdf
  installation/*.pdf
  storage-handling/*.pdf
  osp/*.pdf
  test-certificates/*.pdf       # legacy — hidden from UI since 2026-03-18
  other/*.pdf
  final-test-certs/<djNumber>.pdf   # one per DJ, uploaded via /api/upload-cert
```

## Core workflows

### 1. Dispatch prints a QR (primary workflow)

```
Yellow sheet (DJ + Product Code)
        │
        v
GeneratePage "Create QR Code"
        │  saveDJMapping({ [dj]: code })  →  POST /api/dj-mapping
        v                                    writes data/dj-mapping.json
invalidateDJMappingCache + re-fetch
        │
        v
QRGenerator → QR points at /dj/<djNumber>
        │
        v
Dispatch: Copy QR Image / Download / Print Sticker
```

### 2. Customer scans QR

```
Scan /dj/12345678
        │
        v
DJDocumentPage (public, unauthed)
  loadDJMapping  →  GET /api/dj-mapping      →  dj-mapping.json
  loadDocumentMap →  GET /api/document-map   →  document-map.json
  loadFinalTestCerts → GET /api/final-test-certs → final-test-certs.json
  loadDJOverrides → GET /api/dj-overrides    →  dj-doc-overrides.json
        │
        v
lookupProductCode(dj) → productCode
findDocuments(productCode) → [TDS, Stripping, Installation, …]
applyOverrides(dj, docs) → filtered/augmented per-DJ list
findFinalTestCert(dj) → appended if uploaded
        │
        v
Render list; each DocumentCard links directly at Blob URL (DOC_BASE_URL + entry.path)
```

### 3. Final Test Cert upload

```
UploadPage (bulk) OR GeneratePage (single)
        │
        v
POST /api/upload-cert { fileName, fileBase64 }
        │
        │  pdf-parse → regex → DJ + Product Code
        │
        ├─ uploadBlob(docs/final-test-certs/<dj>.pdf, buffer)
        ├─ write data/final-test-certs.json [dj] = { url, name, productCode, uploadedAt }
        ├─ write data/dj-mapping.json [dj] = productCode (side-effect; registers if missing)
        └─ appendAuditLog
```

### 4. SharePoint sync (admin-only, manual, escape hatch)

```
POST /api/sync-mapping
        │
        ├─ getGraphToken() via MICROSOFT_* env
        ├─ readExcelSheet from SHAREPOINT_SITE_ID / EXCEL_FILE_PATH / EXCEL_SHEET_NAME
        ├─ parse rows → { [dj]: productCode }
        └─ merge into data/dj-mapping.json (SharePoint wins on conflict; manual-only
           entries are preserved)
```

## Product code pattern matching (`src/data/documentMap.js`)

Product codes are 13-char base + optional suffix. Patterns in `document-map.json` use non-alphanumeric wildcards.

Suffix rules:
- **Safe suffixes** (`-FP`, `-ESS`, `-SH2`, `-ANT`, `-TMC`): stripped before matching. Same cable, same docs.
- **Customer suffixes** (`-SYDT`, `-TMR`, `-AG`, `-SIE`, `-FLH`, `-EM`): stripped for Stripping + Installation lookup, but retained for TDS lookup. A customer-suffixed code only matches a TDS if the stored pattern is long enough to cover the suffix — so `-SYDT` codes only get the SYDT-specific TDS, never the generic 13-char TDS.

This is covered by 56 unit tests in `src/data/documentMap.test.js`.

## Authentication

JWT (HS256), 8-hour expiry, stored in `sessionStorage` (clears on browser close).

- `POST /api/auth/login` → `{ token, user }` or `{ mustChangePassword, tempToken, user }` (temp token has `purpose: 'password-change'`)
- `POST /api/auth/password` → set new password with current-password verification
- `GET /api/auth/me` → verify current token, return user
- Token sent as `x-auth-token: Bearer <jwt>` on all write endpoints

Role tiers (`api/lib/auth.js`):
- `requireDispatch()` — accepts `dispatch` or `admin`
- `requireAdmin()` — admin only

## API reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | Email + password → JWT |
| PUT | `/api/auth/password` | JWT (incl. password-change temp token) | Change password |
| GET | `/api/auth/me` | JWT | Verify session, return user |
| GET | `/api/auth/users` | admin | List users |
| POST | `/api/auth/users` | admin | Create user |
| PUT | `/api/auth/users` | admin | Update user (name, role, password reset) |
| DELETE | `/api/auth/users` | admin | Delete user |
| GET | `/api/dj-mapping` | public | Full DJ → product code map (or `?dj=` single) |
| POST | `/api/dj-mapping` | dispatch | Add/update mappings (yellow-sheet workflow) |
| DELETE | `/api/dj-mapping` | admin | Remove mappings |
| GET | `/api/document-map` | public | Full doc-pattern map |
| POST | `/api/document-map` | admin | Add doc pattern entries |
| PUT | `/api/document-map` | admin | Batch edit (remove + add) |
| DELETE | `/api/document-map` | admin | Remove patterns |
| GET | `/api/final-test-certs` | public | Full cert index |
| POST | `/api/upload-cert` | dispatch | Upload cert PDF; auto-extracts DJ + PC; writes both cert index and dj-mapping |
| POST | `/api/upload-doc` | admin | Upload a static doc PDF (TDS, stripping, etc.) |
| DELETE | `/api/delete-doc` | admin | Delete a doc from blob + remove from doc-map |
| POST | `/api/dj-overrides` | admin | Per-DJ include/exclude doc overrides |
| POST | `/api/sync-mapping` | admin | Bulk-merge DJ mapping from SharePoint Excel |
| GET | `/api/product-codes` | public | Convenience — list of known product codes |
| POST | `/api/verify-admin` | n/a | Legacy; current code uses `/api/auth/me` |

## Frontend routes

| Path | Component | Access |
|---|---|---|
| `/` | HomePage in App.jsx | logged-in |
| `/generate` | GeneratePage | dispatch+ (admin sees extra manual-DJ section) |
| `/upload` | UploadPage | dispatch+ (bulk cert upload) |
| `/users` | UsersPage (AdminGate) | admin |
| `/audit` | AuditPage (AdminGate) | admin — pattern review/edit |
| `/coverage` | CoverageAuditPage (AdminGate) | admin — coverage checker |
| `/review` | ReviewPage (AdminGate) | admin — pattern review |
| `/review-matches` | ReviewMatchesPage (AdminGate) | admin — match editor |
| `/admin` | AdminPage (AdminGate) | admin — DJ mapping editor |
| `/dj/:djNumber` | DJDocumentPage | **public** (QR scan target) |
| `/:productCode` | DocumentPage | **public** (legacy product-code scan target) |

## Caching

Client-side module-level caches for frequently fetched data:
- `src/data/documentMap.js` — `loadDocumentMap()` + `invalidateDocumentMapCache()`
- `src/data/djLookup.js` — `loadDJMapping()` + `invalidateDJMappingCache()`
- `src/data/finalTestCerts.js` — `loadFinalTestCerts()` + `invalidateFinalTestCertsCache()`
- `src/data/djOverrides.js` — `loadDJOverrides()` + `reloadDJOverrides()`

Invalidate after writes to ensure fresh reads. API GET calls are cache-busted via `?_t=Date.now()` to bypass any CDN cache.

## Key architectural decisions

- **JSON-in-blob, not a DB.** Dataset is tiny (500s of DJs, 100s of doc patterns). ETag concurrency is enough. Adding a DB would be overkill and tie the app to another managed service.
- **JWT + sessionStorage.** No refresh tokens, no cookies. Users re-login if session > 8h. Good enough for an internal tool.
- **No server-side rendering.** SPA + REST. Easier to host on SWA's free tier.
- **Blob URLs served directly to the browser**, bypassing the Functions API for PDF downloads — saves Functions invocations and bandwidth.
- **Pattern matching in the client**, not the API. `findDocuments()` runs in the browser over the whole doc-map (a few KB). Simpler caching, no round-trip per code.
- **SharePoint sync merges rather than overwrites** so manual registrations aren't wiped.
