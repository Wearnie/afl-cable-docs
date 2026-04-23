# SSO Migration — Microsoft Entra ID

Guide for the US software team taking this app over and switching sign-in from the current email/password system to Microsoft Entra ID (AFL's corporate directory).

## TL;DR

- The code is already wired up. Flipping to Entra is a config change, not a code change.
- Single env var (`AUTH_MODE=entra`) flips the feature flag. Defaults to `password` if unset.
- Sign-in uses Azure Static Web Apps' native Entra provider (`/.auth/login/aad`) — no OAuth code, no JWT exchange, no session management.
- Role mapping is driven by AAD app roles (`dispatch`, `admin`), with an env-var email whitelist as a bootstrap fallback.
- The password system (users in `data/users.json`, bcrypt, JWT) stays intact but is bypassed in Entra mode. You can retire it later once Entra is verified.

Rollback is a single env-var change. <5 minutes.

---

## 1. Why Entra

- AFL staff already sign in to Microsoft products with their Entra identity. One less password to remember.
- MFA, conditional access, disablement-on-departure are all delegated to Entra.
- Users and roles are managed in the Azure admin centre, not in a JSON file in a blob.
- We lose nothing — the QR scanner / customer document pages stay anonymous; only internal admin/dispatch routes change.

## 2. Architecture

Sign-in is handled entirely by the Azure Static Web Apps platform. There is no callback handler to write, no token endpoint, no session cookie management.

```
Browser                         SWA platform                 API (Functions)
   │                                 │                            │
   │  GET /                          │                            │
   ├────────────────────────────────►│                            │
   │                                 │                            │
   │  (AuthProvider mounts)          │                            │
   │  GET /.auth/me  ────────────────►│                            │
   │◄──── { clientPrincipal: null } ─┤                            │
   │                                 │                            │
   │  [Show "Sign in with Microsoft"]│                            │
   │  Click → GET /.auth/login/aad   │                            │
   ├────────────────────────────────►│                            │
   │                (Entra redirect, consent, callback handled    │
   │                 entirely by SWA — we write no code for this) │
   │◄─── redirect back to /  ────────┤                            │
   │                                 │                            │
   │  GET /.auth/me  ────────────────►│                            │
   │◄────  { clientPrincipal: {      │                            │
   │         userDetails, userRoles, │                            │
   │         claims } } ─────────────┤                            │
   │                                 │                            │
   │  GET /api/dj-mapping            │                            │
   ├─────────────────────────────────┼──── x-ms-client-principal ►│
   │                                 │     (SWA injects header)   │
   │                                 │                            │
   │                                 │       requireDispatch(req) │
   │                                 │       ├─ decode principal  │
   │                                 │       ├─ resolveRole()     │
   │                                 │       └─ req.user = {...}  │
   │◄────────────────────────────────┴─── 200 { data } ───────────┤
```

Role mapping (`api/lib/client-principal.js`):

1. If the authenticated email appears in `AUTH_ADMIN_EMAILS` → `admin`.
2. Else if in `AUTH_DISPATCH_EMAILS` → `dispatch`.
3. Else if the principal's `userRoles` array contains `admin` → `admin`.
4. Else if it contains `dispatch` → `dispatch`.
5. Else → no role, user sees "Access Pending" page and cannot hit any protected route.

## 3. What's already in the code

Everything below is already committed on `main`:

| File | Purpose |
|---|---|
| `api/lib/client-principal.js` | Decodes `x-ms-client-principal`, resolves internal role |
| `api/lib/auth.js` | `requireDispatch` / `requireAdmin` branch on `AUTH_MODE=entra` |
| `api/auth/me.js` | Returns the user identity in whichever mode is active |
| `api/config.js` | Public GET response includes `authMode` (lets the frontend pick the login UI) |
| `src/lib/entraAuth.js` | Client helper: fetch `/.auth/me`, sign in, sign out |
| `src/components/AuthProvider.jsx` | States: `checking`, `login`, `entra-signin`, `entra-no-role`, `change-password`, `authenticated` |
| `src/pages/UsersPage.jsx` | Shows read-only Entra banner in Entra mode |
| `staticwebapp.config.entra.example.json` | Drop-in replacement for `staticwebapp.config.json` |
| `api/lib/client-principal.test.js` | Unit tests for role resolution |

The password-based flow is untouched. With `AUTH_MODE` unset, the app behaves exactly as before.

## 4. Prerequisites

- Tenant admin (or delegated app registration admin) rights in AFL's Entra tenant
- Deployed Azure Static Web App in your tenant (standard SKU recommended; Free tier supports custom auth but has cold-start limits)
- Write access to the repo

## 5. Entra app registration

Do this in the Entra admin centre at `https://entra.microsoft.com` → **Applications** → **App registrations** → **New registration**.

1. **Name:** `AFL Cable Docs` (or whatever matches your naming convention).
2. **Supported account types:** *Accounts in this organizational directory only* (Single tenant).
3. **Redirect URI:**
   - Platform: **Web**
   - URI: `https://<your-swa-hostname>.azurestaticapps.net/.auth/login/aad/callback`
4. Click **Register**. Note down:
   - **Application (client) ID** → you'll set this as `AAD_CLIENT_ID`
   - **Directory (tenant) ID** → goes into `staticwebapp.config.json`
5. **Authentication** blade → scroll to **Front-channel logout URL** → set to:
   - `https://<your-swa-hostname>.azurestaticapps.net/.auth/logout/aad/callback`
6. **Certificates & secrets** → **Client secrets** → **New client secret**:
   - Description: `SWA runtime`
   - Expiry: 24 months (max). Calendar this — when it expires, sign-in breaks.
   - Copy the **Value** (not the ID) immediately — it's only shown once. This is `AAD_CLIENT_SECRET`.
7. **App roles** → **Create app role** — do this twice:

   | Display name | Allowed member types | Value | Description |
   |---|---|---|---|
   | Dispatch | Users/Groups | `dispatch` | Can generate QR stickers, upload certificates, view DJ mappings |
   | Admin | Users/Groups | `admin` | Full administrative access — user management, doc-map, coverage audits |

   The `Value` field is critical — it must match exactly `dispatch` and `admin` (lowercase). This is what the app code checks against.

8. **API permissions** → the default `Microsoft Graph / User.Read` is fine. No extra permissions needed.

## 6. Assign users to roles

Entra admin centre → **Enterprise applications** → find *AFL Cable Docs* → **Users and groups** → **Add user/group**.

- Pick a user (or security group)
- Pick the role — **Dispatch** or **Admin**
- **Assign**

**Recommendation:** create two Entra security groups (`afl-cable-docs-dispatch`, `afl-cable-docs-admin`) and assign them to the app roles. Then manage membership via the groups. Easier to audit and bulk-manage.

## 7. Static Web App configuration

### 7a. `staticwebapp.config.json`

Copy `staticwebapp.config.entra.example.json` (already in the repo root) over `staticwebapp.config.json`. Replace `<TENANT_ID>` with your Directory (tenant) ID.

```bash
cp staticwebapp.config.entra.example.json staticwebapp.config.json
# Then edit staticwebapp.config.json and replace <TENANT_ID>
git add staticwebapp.config.json
git commit -m "enable Entra auth in staticwebapp config"
```

### 7b. Environment variables

Azure Portal → your Static Web App → **Configuration** → **Application settings** → **+ Add**. Add these:

| Name | Value | Notes |
|---|---|---|
| `AUTH_MODE` | `entra` | **The feature flag.** Required. |
| `AAD_CLIENT_ID` | Application (client) ID from step 5.4 | Referenced by `staticwebapp.config.json` |
| `AAD_CLIENT_SECRET` | Client secret value from step 5.6 | Never commit this |
| `AUTH_ADMIN_EMAILS` | `you@afl.com` | Optional, comma-separated. Bootstrap fallback — lets you sign in as admin before AAD app roles are wired up. Remove once groups are assigned. |
| `AUTH_DISPATCH_EMAILS` | (optional) | Same pattern for dispatch users |

Save. SWA will restart the Functions runtime (~30s).

Old vars (`JWT_SECRET`) are ignored in Entra mode but safe to leave set. Remove once you're confident Entra is stable (see §11).

## 8. Test

### First sign-in

1. Open `https://<your-swa-hostname>.azurestaticapps.net` in an incognito window.
2. You should see the **Sign in with Microsoft** button (if you see the email/password form instead, `AUTH_MODE` isn't set or SWA hasn't restarted yet).
3. Click → redirected to `login.microsoftonline.com` → approve consent (first time only).
4. Redirected back to `/`. You're in.
5. If your email is in `AUTH_ADMIN_EMAILS` → admin cards visible. If you were assigned the `admin` app role but no email fallback → also admin. If neither → "Access Pending" screen.

### Per-role smoke tests

**Admin:** click through `/admin`, `/admin/config`, `/users`, `/audit`, `/coverage`. All should load. The `/users` page shows a blue banner saying users are managed in Entra.

**Dispatch:** assign a second Entra user only the `dispatch` role. Sign in as them. `/generate` and `/upload` should work; `/admin` etc. should show "Access Restricted".

**Anonymous (customer QR scan):** sign out, visit `/dj/SOME-DJ-NUMBER` and `/SOME-PRODUCT-CODE`. Should load without a sign-in prompt. (This only works because SWA does *not* enforce auth on those routes — the `auth` block in `staticwebapp.config.json` provides identity without requiring it.)

### API test

With an admin session, open browser devtools → Network → click around. Every API request should have `Cookie: StaticWebAppsAuthCookie=...` set automatically by SWA. The API receives `x-ms-client-principal` (you can inspect the decoded value by calling `/.auth/me`).

## 9. Local dev with Entra

SWA CLI supports authentication emulation.

```bash
# In one terminal
npm run dev

# In another
npm install -g @azure/static-web-apps-cli
swa start http://localhost:5173 --api-location api
```

Then set the env vars in `api/local.settings.json`:

```json
{
  "Values": {
    "AUTH_MODE": "entra",
    "AUTH_ADMIN_EMAILS": "you@afl.com"
  }
}
```

The SWA CLI injects a fake principal when you visit `http://localhost:4280/.auth/login/aad` — it prompts for a username and roles in a mock page. Useful for frontend development without standing up real Entra app registrations.

## 10. Rollback

If something breaks after flipping `AUTH_MODE=entra`:

1. Azure Portal → your SWA → Configuration → set `AUTH_MODE` to `password` (or delete the var).
2. Save. Functions runtime restarts in ~30s.
3. You're back to email/password immediately. No redeploy.

To revert the `staticwebapp.config.json` change too (not strictly required — the Entra auth config is a no-op when `AUTH_MODE` is unset), `git revert` the commit that copied it.

## 11. Retiring the password system

Once you've run on Entra for a few weeks and are confident, you can delete the password path. Recommended order:

1. **Verify no one's actively using password accounts.** Check the audit log (`data/audit-log.jsonl`) — look for `action: config.update` and auth-related entries.
2. **Remove `/api/auth/login`, `/api/auth/password`, `/api/auth/users`** — delete the files and their Azure Functions registrations (`api/src/functions/auth-*.js`).
3. **Delete `data/users.json`** from blob storage.
4. **Simplify `AuthProvider.jsx`** — drop the `login` and `change-password` states, drop the email/password form, the `fetchAppConfig`-based mode detection (assume Entra always).
5. **Remove the JWT helpers** from `api/lib/auth.js` (`verifyToken`, `verifyPasswordToken`, `signToken`, `signRestrictedToken`) and the `isDev()` fallback. Keep only the Entra branch.
6. **Remove `JWT_SECRET`** from the SWA Configuration.
7. **Remove the `jsonwebtoken` and `bcryptjs` dependencies** from `api/package.json`.

This is a satisfying PR. The auth system becomes ~50 lines instead of ~200.

## 12. Troubleshooting

**"Sign in with Microsoft" button not showing.**
- Check `/api/config` in browser devtools — does the response include `authMode: "entra"`? If not, `AUTH_MODE` isn't set or SWA hasn't restarted.
- Hard refresh (browsers cache the old JS bundle).

**Sign-in redirects loop.**
- Usually a misconfigured redirect URI in Entra. Must be exactly `https://<your-swa>/.auth/login/aad/callback`.
- Check the SWA hostname matches (no trailing slash, `https`, correct subdomain).

**Signed in but land on "Access Pending".**
- No role resolved. Either:
  - You're not in `AUTH_ADMIN_EMAILS` / `AUTH_DISPATCH_EMAILS` and
  - Your principal's `userRoles` array doesn't contain `admin` or `dispatch`.
- Check by hitting `/.auth/me` in the browser while signed in. Look at `userRoles`. If empty → assign the user a role in Enterprise Applications → your app → Users and groups.
- Note: role changes in Entra sometimes take a minute or two to propagate. Sign out and back in if you just assigned one.

**Customer QR page (`/dj/...` or `/SOMECODE`) now asks for sign-in.**
- Should not happen by default — SWA's Entra provider only *provides* identity, doesn't require it. If it's happening, something in `staticwebapp.config.json` has been changed to enforce `allowedRoles` on those routes. Revert that.

**`x-ms-client-principal` header missing on API requests.**
- The SWA runtime only injects this when the request comes in via SWA's managed frontend. If you're hitting the Functions URL directly (`<function-app>.azurewebsites.net/api/...`), the header won't be there.
- Always call `/api/...` via the SWA URL.

**Client secret expired.**
- Sign-in breaks. Go to App registration → Certificates & secrets → generate a new client secret → update `AAD_CLIENT_SECRET` in SWA Configuration → save (no redeploy needed).
- Calendar this 30 days before expiry.

**Local `swa start` doesn't inject a principal.**
- Check you're visiting `http://localhost:4280` (the SWA CLI port), not `http://localhost:5173` (the Vite dev server). Only the SWA CLI emulates auth.

## 13. FAQ

**Can we support both password and Entra at the same time?**
No — the flag is deployment-wide. If you need to migrate gradually, run two SWAs (one each mode) temporarily, then consolidate.

**What about dispatch users who don't have Entra accounts?**
Create guest Entra accounts for them (`https://entra.microsoft.com` → External Identities → Guest users) and assign the dispatch role. Guest accounts are free and manageable via the directory.

**Does this support MFA?**
Yes — MFA is enforced by Entra conditional access policies set by your tenant admin. The app doesn't see anything about it.

**Where do I see who logged in recently?**
Azure AD sign-in logs in the Entra admin centre. The app also writes `data/audit-log.jsonl` entries for any config/doc-map changes with the authenticated user's email.

**How do I add a custom login UI?**
SWA's built-in auth uses Microsoft's default login page. You can customise this via Entra branding (Entra → Company branding) but not from this repo.
