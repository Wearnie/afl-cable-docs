# Runbook

Operational reference for the AFL Cable Docs app.

## Azure resources

| Resource | Name / ID | Purpose |
|---|---|---|
| Static Web App | `lemon-moss-071796800` | Frontend hosting + managed Functions API |
| Storage Account | `aflcabledocs` | Blob storage for data + PDFs |
| Blob Container | `afl-cable-docs` | Single container, see layout in ARCHITECTURE.md |
| Resource Group | (check Azure Portal) | Groups the above |
| Region | (check Azure Portal) | — |
| Subscription | (check Azure Portal) | **Verify ownership is AFL corporate, not personal** |

## Environment variables

All set in **Azure Portal → Static Web App → Configuration → Application settings**. Not committed to the repo.

| Variable | Required | Purpose |
|---|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Yes | Connection string to the `aflcabledocs` storage account. Used by `api/lib/blob-storage.js` for all data reads/writes. |
| `AZURE_STORAGE_CONTAINER` | No | Override container name. Defaults to `afl-cable-docs`. |
| `JWT_SECRET` | Yes (password mode) | Signing key for session tokens. Min 32 chars of entropy. Rotating invalidates all sessions. Ignored when `AUTH_MODE=entra`. |
| `AZURE_FUNCTIONS_ENVIRONMENT` | Yes (`Production`) | When set to `Production`, error messages to the client are sanitised to "Internal server error". |
| `AUTH_MODE` | No (defaults to `password`) | Set to `entra` to use Microsoft Entra ID SSO instead of email/password. See [SSO-MIGRATION.md](./SSO-MIGRATION.md). |
| `AAD_CLIENT_ID` | Yes (entra mode) | Entra app registration client ID. Referenced by `staticwebapp.config.json`. |
| `AAD_CLIENT_SECRET` | Yes (entra mode) | Entra app registration client secret. Rotate before expiry. |
| `AUTH_ADMIN_EMAILS` | No | Comma-separated bootstrap admin allowlist for Entra mode. Wins over AAD role claims. |
| `AUTH_DISPATCH_EMAILS` | No | Comma-separated bootstrap dispatch allowlist for Entra mode. |

Frontend env (set at **build time** via GitHub Actions, not at runtime):

| Variable | Required | Purpose |
|---|---|---|
| `VITE_DOC_BASE_URL` | Yes (prod) | Blob base URL for PDFs. Set to `https://aflcabledocs.blob.core.windows.net/afl-cable-docs/docs`. Locally defaults to `/docs`. |

## Deployment

Pushes to `main` → GitHub Actions → Azure SWA. Workflow file: `.github/workflows/azure-static-web-apps-lemon-moss-071796800.yml`.

Two secrets needed in GitHub:

- `AZURE_STATIC_WEB_APPS_API_TOKEN_LEMON_MOSS_071796800` — deploy token. Regenerate via Azure Portal → SWA → Manage deployment token if transferred to new GitHub org.
- `GITHUB_TOKEN` — provided automatically by Actions.

## Operational procedures

### Add a user
Sign in as admin → `/users` → fill form. Initial password can be anything; user is forced to change on first login (`mustChangePassword: true`).

### Reset a user's password
`/users` → edit user → set a new password. They'll be prompted to change on next login.

### Upload a static document (TDS, Stripping, Installation, etc.)
`/audit` → select doc type → upload. Then add pattern mapping(s) via the same page so the doc surfaces for matching product codes.

### Add / edit pattern mappings
`/audit` — full CRUD on `document-map.json`. Use `/coverage` to verify all active product codes resolve to the docs they should.

### Upload Final Test Certificates
Primary: `/upload` — drop one or many PDFs. DJ number + product code auto-extracted via `pdf-parse` regex on page 1 of the PDF.

Backup: `/generate` top section — single-file upload with step animation.

### Register a DJ → Product Code (yellow sheet flow)
`/generate` top — "Create QR Code" section. DJ + product code inputs, click Generate QR. Saves to `data/dj-mapping.json` and renders the QR immediately.

### Delete a document
`/audit` → find doc → Delete. Removes from blob + doc-map atomically.

### Inspect the audit log
Download `data/audit-log.jsonl` from blob storage via Azure Portal (Storage Browser) or Azure CLI:

```bash
az storage blob download \
  --account-name aflcabledocs \
  --container-name afl-cable-docs \
  --name data/audit-log.jsonl \
  --file ./audit-log.jsonl
```

Append-only. Every write-path action is logged with `{ ts, user, action, target, ... }`.

## Secret rotation

### JWT_SECRET
1. Azure Portal → SWA → Configuration → edit `JWT_SECRET` with a new high-entropy value
2. Save & restart
3. All existing sessions are invalidated — users must re-login

### Storage account key
1. Azure Portal → Storage Account → Security + networking → Access keys → Rotate key1
2. Copy the new connection string
3. Update `AZURE_STORAGE_CONNECTION_STRING` in SWA Configuration
4. Save & restart

## Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| QR scan shows "Invalid Product Code" | Non-AFL code, or base doesn't resolve to 13 chars after stripping suffixes | `stripSuffix(code).length === 13`? |
| Scan shows docs but PDF link 404s | `VITE_DOC_BASE_URL` mismatch between build and blob layout | Verify the env var in the deployed build's JS matches the blob container path |
| Cert upload fails "Could not find Job Number" | PDF is a scan with no text layer, or wording differs from `Job Number: NNNNNNNN` | Inspect the PDF; cert upload needs a text-layer PDF matching the regex |
| Dispatch user gets 403 on registration | Old role mapping; `POST /api/dj-mapping` now requires dispatch, not admin | Re-deploy `main` |
| Login hangs | `JWT_SECRET` not set in Production | SWA Configuration |
| "File too large" on upload | >10 MB PDF | Split the source PDF or compress |

## Backups

No automated backup. Blob data is Azure's built-in redundancy only.

To snapshot the data files before a risky change:

```bash
for f in users.json dj-mapping.json document-map.json final-test-certs.json dj-doc-overrides.json audit-log.jsonl; do
  az storage blob download \
    --account-name aflcabledocs \
    --container-name afl-cable-docs \
    --name "data/$f" \
    --file "./snapshot-$(date +%Y%m%d)-$f"
done
```

## Monitoring

None currently. Azure SWA and Functions expose metrics in the Azure Portal (requests, errors, duration) but no alerting is configured. Worth the US team wiring up Application Insights when re-platforming.
