# Deploy AFL Cable Docs

Stand up your own instance from a cold clone. Target: working app on your Azure subscription in one working day for a competent Azure dev.

For business context on what the app does and who uses it, read [HANDOVER-BRIEF.md](./HANDOVER-BRIEF.md) first. For architecture, read [ARCHITECTURE.md](./ARCHITECTURE.md). For day-2 operations, see [RUNBOOK.md](./RUNBOOK.md).

---

## 0. Prerequisites

- Azure subscription; Contributor on the target resource group
- Azure CLI ≥ 2.50 (`az --version`)
- `azcopy` ([install](https://aka.ms/azcopy))
- Node.js 22.12+ (`node -v`)
- GitHub admin on this repo (or your fork)
- `gh` CLI ([install](https://cli.github.com)) — makes steps 3/6 scriptable
- `openssl` — for the JWT secret

You'll also receive from AFL Melbourne (via the password-manager vault described in HANDOVER-BRIEF):
- A **30-day read SAS URL** to the current Melbourne blob container (for data migration)
- Existing admin/dispatch login credentials

---

## 1. Fork or transfer the repo into your org

If you're taking ownership: GitHub → Settings → **Transfer ownership** to your AFL-US org.

If you're forking first and transferring later: `gh repo fork <current-org>/afl-cable-docs --org <your-org> --clone=false` (substitute the current owner of the repo you received in the handover email).

Clone locally:

```bash
git clone https://github.com/<your-org>/afl-cable-docs
cd afl-cable-docs
```

---

## 2. Stand up Azure (≈ 5 minutes)

```bash
# 2a. Create a resource group
az group create --name rg-afl-cable-docs --location eastus2

# 2b. Deploy infrastructure
az deployment group create \
  --resource-group rg-afl-cable-docs \
  --template-file infra/main.bicep \
  --parameters \
      repoUrl=https://github.com/<your-org>/afl-cable-docs \
      jwtSecret=$(openssl rand -hex 32)
```

**Check:** the command prints outputs including `storageAccountName`, `swaDefaultHostname`, and `blobBaseUrl`. Save `blobBaseUrl` — you'll need it in step 3.

Parameter reference: see [infra/README.md](./infra/README.md) for custom region, monitoring toggle, etc.

---

## 3. Wire up GitHub Actions (≈ 2 minutes)

The deploy workflow in `.github/workflows/deploy.yml` needs one secret and one variable.

```bash
# 3a. Get the SWA deploy token
SWA_NAME="$(az deployment group show -g rg-afl-cable-docs -n main \
  --query properties.outputs.swaName.value -o tsv)"
TOKEN="$(az staticwebapp secrets list --name "$SWA_NAME" \
  --query properties.apiKey -o tsv)"

# 3b. Add it to the repo as AZURE_SWA_DEPLOY_TOKEN
gh secret set AZURE_SWA_DEPLOY_TOKEN --body "$TOKEN"

# 3c. Add the blob URL as a build-time variable
BLOB_URL="$(az deployment group show -g rg-afl-cable-docs -n main \
  --query properties.outputs.blobBaseUrl.value -o tsv)"
gh variable set VITE_DOC_BASE_URL --body "$BLOB_URL"
```

**Check:** `gh secret list` shows `AZURE_SWA_DEPLOY_TOKEN`; `gh variable list` shows `VITE_DOC_BASE_URL` pointing at your blob.

---

## 4. Migrate data from Melbourne (≈ 10–60 minutes)

The current Melbourne deployment holds all the live data (users, DJ mappings, document patterns, all PDFs). You need to copy it into your new blob container before the app will be useful.

```bash
# Connection string for YOUR new storage account
TARGET_CONN="$(az deployment group show -g rg-afl-cable-docs -n main \
  --query properties.outputs.storageConnectionString.value -o tsv)"

# The SAS URL Melbourne sent you (from the password vault)
SOURCE_SAS="https://aflcabledocs.blob.core.windows.net/afl-cable-docs?sv=…"

# Sanity check first
./scripts/restore-from-sas.sh "$SOURCE_SAS" "$TARGET_CONN" --dry-run

# If happy, run for real
./scripts/restore-from-sas.sh "$SOURCE_SAS" "$TARGET_CONN"
```

Running time scales with the PDF library — tens of MB moves fast; if the `docs/` tree is several GB it can take up to an hour.

**Alternative (air-gapped transfer):** if Melbourne sends a tarball instead of a SAS:

```bash
./scripts/restore-from-tarball.sh ./afl-cable-docs-snapshot-YYYY-MM-DD.tar.gz "$TARGET_CONN"
```

**Check:**

```bash
az storage blob list --connection-string "$TARGET_CONN" \
  --container-name afl-cable-docs --query 'length(@)' -o tsv
# should print a number > 0, typically > 100 (json + PDFs combined)
```

---

## 5. Seed the first admin (≈ 30 seconds)

```bash
AZURE_STORAGE_CONNECTION_STRING="$TARGET_CONN" \
  node scripts/seed-first-admin.cjs \
    --email admin@<your-org>.com \
    --name "First Admin" \
    --password-from-stdin
# (type a password — at least 8 chars; it'll be hashed and stored)
```

This creates the user with `mustChangePassword: true`, so they're forced to pick a real password on first login.

**Check:** `scripts/seed-first-admin.cjs` prints `✓ Seeded admin: admin@<your-org>.com`.

If the migration in step 4 already brought across the Melbourne users, you can skip this step and log in with a Melbourne admin credential (delivered via password vault) — but seeding a fresh admin is cleaner.

---

## 6. Push to main → first deploy (≈ 2 minutes)

Any commit to `main` triggers `.github/workflows/deploy.yml`, which builds the frontend and deploys the Functions.

```bash
# If you haven't pushed since fork/transfer, a README touch will do
git commit --allow-empty -m "chore: trigger first deploy"
git push origin main

# Watch it
gh run watch
```

**Check:** the run shows a green `Build and Deploy Job`. Visit the SWA URL:

```bash
echo "https://$(az deployment group show -g rg-afl-cable-docs -n main \
  --query properties.outputs.swaDefaultHostname.value -o tsv)"
```

You should see the login page.

---

## 7. Smoke test (≈ 5 minutes)

Log in and walk the dispatch workflow. If any step fails, something's wrong and you need to debug before go-live.

1. Visit the SWA URL.
2. Sign in with the seeded admin (step 5). Forced to change password — do it.
3. Go to **QR Sticker Generator**. In "Create QR Code", enter a test DJ `99999999` and a test product code (any 13-char AFL code — browse the migrated `data/dj-mapping.json` for a real one). Click **Generate QR**.
4. QR renders. Click **Copy QR Image** — should say "Copied ✓".
5. Open a new tab, navigate to `/dj/99999999`. Documents should list.
6. Go to **/upload** and upload a sample Final Test Cert PDF. It should parse the DJ number + product code and attach.
7. Re-hit `/dj/<that-dj>`. Test cert should appear in the doc list.

If all six steps pass, the app is alive.

---

## 8. Custom domain (≈ 15 minutes)

The Azure-generated SWA URL is not for customer use. Recommended: `docs.<your-afl-domain>` (e.g. `docs.aflglobal.com`).

1. Azure Portal → your SWA → **Custom domains** → **Add**
2. Choose the validation method (CNAME or TXT record) and add the DNS record in your registrar
3. Wait for SSL certificate provisioning (Azure-managed, usually under 15 minutes)
4. Test: `https://docs.<your-afl-domain>/dj/99999999` should return the same customer page

---

## 9. Redirect the old Melbourne URL (critical — do NOT skip)

Every QR sticker physically on a drum in a customer's warehouse points at `https://lemon-moss-071796800.6.azurestaticapps.net/dj/<dj>`. If you cut over without a redirect, every sticker breaks.

Options:

**Option A — keep Melbourne SWA alive, configure a redirect rule**  
In the Melbourne repo's `staticwebapp.config.json`, add:

```json
{
  "routes": [
    { "route": "/dj/*", "redirect": "https://docs.<your-afl-domain>/dj/*", "statusCode": 301 },
    { "route": "/*",    "redirect": "https://docs.<your-afl-domain>/*",    "statusCode": 301 }
  ]
}
```

Push to Melbourne's main. Melbourne SWA now 301s everything to your new domain. Keep it alive for at least as long as stickers-in-the-field do.

**Option B — transfer the Melbourne SWA URL** (if Azure lets you) to the new sub, then flip its config. More work; Option A is usually enough.

**Check:** `curl -sI https://lemon-moss-071796800.6.azurestaticapps.net/dj/99999999` returns `HTTP/1.1 301` with a `Location:` pointing at your new domain.

---

## 10. Revoke Melbourne access (when you're live and stable)

Once you're running on your own domain with the redirect in place and a week of green:

- Email Tom confirming go-live
- Tom revokes his admin account on your instance (or hands over its password)
- You remove Tom's access from the old Melbourne Azure / GitHub

Handover is complete.

---

## 11. Future: SSO migration

Recommended once you're settled. The current email-password system is portable but feature-light.

Azure SWA has first-class Entra auth. Wire it via `staticwebapp.config.json` and a new Entra app registration in your tenant. See HANDOVER-BRIEF.md §7.2 for the recommended role-to-group mapping.

When you switch, retire `/api/auth/*` + `src/components/AuthProvider`'s email-password form. Update `requireDispatch`/`requireAdmin` in `api/lib/auth.js` to read `x-ms-client-principal` instead of the JWT.

No deadline. Ship when ready.

---

## Troubleshooting

See [RUNBOOK.md](./RUNBOOK.md#troubleshooting) for a table of common symptoms and fixes (404 on PDFs, cert upload parse errors, dispatch 403s, etc.).

For anything not covered there: tom.wearne@aflglobal.com — 30 days of follow-up post-go-live. Ongoing AFL-side contact: Mithra BaluBavitha — mithra.balubavitha@aflglobal.com.
