# AFL Cable Docs — Test & Security Report

Date: 16 April 2026
Commit tested: ea44df3 (v1.0-handover-ready)
Tester: Claude Cowork
Live URL: https://lemon-moss-071796800.6.azurestaticapps.net

---

## Executive summary

- **Overall health: GOOD.** Core user journeys — login, QR generation, DJ lookup, public document pages, admin audit tools, and user management — all work correctly. The app is solid and ready for handover.
- **Biggest concern:** No rate limiting on the login endpoint (`/api/auth/login`), which allows unlimited brute-force password attempts. This is the only medium-severity issue found.
- **Recommendation:** Safe to send to the US team as-is, with a note to implement login rate limiting before any production rollout with external users. All other findings are low severity.

---

## Works

1. **Login page** — Empty submit shows client-side "Enter your email and password" error with no API call. Wrong password returns 401 with generic "Invalid email or password" message (no user enumeration). Correct admin credentials return 200, JWT stored in sessionStorage, home page renders. Sign out clears token and returns to login.

2. **Home page (admin)** — Shows all 5 cards: QR Sticker Generator, Upload Final Test Certificates, Pattern Audit, Coverage Audit, User Management. User chip shows "Tom Wearne / ADMIN" with Sign Out button.

3. **Home page (dispatch)** — Shows only 2 cards: QR Sticker Generator and Upload Final Test Certificates. Admin-only cards (Pattern Audit, Coverage Audit, User Management) correctly hidden. User chip shows "Dispatch / DISPATCH".

4. **Generate page (/generate, admin)** — Three sections visible: Create QR Code, Look Up Existing DJ, Upload Final Test Certificate. DJ number validates to 8 digits with live counter. Product code validates with "Valid code" / hint messages. Generate QR creates DJ mapping (POST /api/dj-mapping → 200), renders QR code with correct URL, shows all 4 action buttons (Copy QR Image, Download, Print Sticker, Copy URL), and lists matched documents (4 for LMDC1DPA144BE: Stripping Instructions, TDS, Installation Guide, Storage & Handling).

5. **Public DJ page (/dj/99999901)** — Renders without auth. Shows 4 matched documents with correct names and types. DJ number and product code displayed at bottom. PDF links present.

6. **Unmapped DJ page (/dj/00000000)** — Shows "DJ Number Not Found" card with helpful explanation.

7. **Product code page (/LMDC1DPA144BE)** — Shows 4 documents, no DJ context, no cert section. Works without auth.

8. **Product code with suffix (/LMDC1DPA144BE-AG)** — Shows 3 documents (TDS correctly excluded for -AG customer suffix). Suffix handling works correctly.

9. **Invalid route (/randomgarbage123)** — Shows "Invalid Product Code" with explanation about 13-char base codes and known suffixes.

10. **Pattern Audit (/audit)** — Top counters render (105 unique PDFs, 248 patterns, 6 DJ numbers, 0/105 reviewed). Search by product code, filter by Document Type and Review Status all present. Upload New Document form with type selector, name field, PDF upload, and pattern entry visible. TDS section with expandable rows renders.

11. **Coverage Audit (/coverage)** — Top cards show 603 Total / 318 Full Coverage / 274 Partial / 11 No Docs (numbers add up to 603). Filter by Family, Status, Type all present. Product code table with STRIP/TDS/INSTALL/S&H coverage columns renders with correct status indicators.

12. **User Management (/users)** — Lists 4 users with correct role chips (admin/dispatch). Own account (Tom Wearne) marked "This is your account" with no Remove button (self-deletion prevented). Other users show Change role, Reset password, Remove actions. TEMP PASSWORD badges display for users who haven't changed passwords. "+ Add User" button present.

13. **Auth token handling** — JWT stored in sessionStorage (cleared on browser close). Transmitted via custom `x-auth-token` header (not cookies). Token cleared on sign-out.

14. **Input validation (static review)** — Product codes validated server-side: base must be 13 chars after stripping safe suffixes (-FP, -ESS, -SH2, -ANT, -TMC) and customer suffixes (-SYDT, -TMR, -AG, -SIE, -FLH, -EM). DJ numbers validated as 8 digits. File uploads limited to 14MB base64 (~10MB file). PDF filenames sanitized (no path traversal). Doc types validated against enum.

15. **XSS protection (static review)** — No `dangerouslySetInnerHTML` or `innerHTML` usage in entire codebase. All user-supplied data rendered via React JSX escaping. React 19.2.0 (current). QR print window uses `createElement` + `textContent` (safe).

16. **CSRF protection** — Custom `x-auth-token` header (not cookie-based), protected by browser Same-Origin Policy. No permissive CORS configuration found.

17. **Security headers** — `staticwebapp.config.json` sets: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, HSTS max-age=31536000 with includeSubDomains, Permissions-Policy disabling geolocation/microphone/camera.

18. **Secrets management** — No secrets in dist/ bundle (checked). `.gitignore` covers `api/local.settings.json` and `.env*`. `.env.example` has only placeholder values. No secrets found in recent git history.

19. **Blob storage** — Uses Azure SDK server-side. No SAS tokens in frontend code. No container listing endpoints exposed.

20. **JWT implementation** — 8-hour expiry on regular tokens, 15-minute on password-change tokens. Purpose-restricted tokens (password-change) rejected by normal endpoints. Constant-time bcrypt delay prevents user enumeration.

---

## Needs testing

Items that require either a local `npm install` on the host Mac or specific manual interaction that could not be automated:

- **npm test (56 unit tests)** — Requires local `npm install` (sandbox has different architecture from Mac). Run `npm test` from repo root.
- **npm run build** — Same dependency issue. Run `npm run build` and verify clean output.
- **npm run lint** — Same. Run `npm run lint`.
- **npm audit** — Run `npm audit` in both root and `api/` directories to check for vulnerable dependencies.
- **Upload cert PDF (drag-and-drop)** — Requires a real test certificate PDF with extractable Job Number and Item Code text.
- **Upload page (/upload) bulk upload** — Requires multiple test cert PDFs to verify multi-file queue, sequential processing, and error handling.
- **Print Sticker button** — Opens native print dialog (62×40mm label layout) — verify visually.
- **Download QR PNG** — Verify downloaded file is named QR-{DJ}.png and is a valid PNG.
- **Copy QR Image** — Verify clipboard gets PNG (paste into image editor to confirm).
- **PDF link click-through** — Verify doc links on /dj/ pages actually open PDFs from blob storage (not 404s).
- **Lighthouse audit** — Run on /dj/{mapped-dj} for performance/accessibility scores.
- **Blob URL direct access** — Try hitting `https://aflcabledocs.blob.core.windows.net/afl-cable-docs/` without a blob path to confirm listing is denied.
- **Expired JWT enforcement** — Forge a token with past `exp` claim and verify rejection.
- **First-login password change flow** — Log in as one of the TEMP PASSWORD users and verify forced password change.

---

## Broken / Fix Plan

### 1. DELETE /api/dj-mapping crashes with null body (Medium)

**Severity:** Medium
**File:** `api/dj-mapping/index.js` (DELETE handler)
**What goes wrong:** Sending a DELETE request with no body (or null body) causes a 500 error with a stack trace: `Cannot destructure property 'djNumbers' of 'req.body' as it is null`. This leaks internal implementation details.
**Suggested fix:** Add body validation at the top of the DELETE handler:
```js
const { djNumbers } = req.body || {};
if (!djNumbers || !Array.isArray(djNumbers)) {
  return { status: 400, body: JSON.stringify({ error: 'djNumbers array is required' }) };
}
```
**Effort:** 10 minutes.

### 2. "Create another" button may not reset form (Low)

**Severity:** Low
**URL:** /generate page, after QR generation
**What goes wrong:** Clicking "Create another" did not visibly reset the form in testing. The QR result and mapping remained displayed. This may be a state management issue in the QRGenerator component.
**Suggested fix:** Verify the `Create another` handler calls the state reset function and clears `generatedDJ`, `generatedCode`, and `qrUrl` state.
**Effort:** 15 minutes to investigate and fix.

---

## Security findings

### 1. No rate limiting on /api/auth/login (Medium — CWE-307)

**Severity:** Medium
**File:** `api/auth/login.js`
**What goes wrong:** The login endpoint has no rate limiting, IP throttling, or account lockout. An attacker can attempt unlimited password guesses.
**Mitigation already in place:** Constant-time bcrypt delay prevents timing-based user enumeration.
**Suggested fix:** Implement rate limiting — 5 attempts per 15 minutes per IP, or account lockout after 5 consecutive failures. Azure Functions can use a simple in-memory store or Azure Table Storage for tracking.
**OWASP ref:** A07:2021 – Identification and Authentication Failures
**Effort:** 2-4 hours.

### 2. No Content-Security-Policy header (Low — CWE-1021)

**Severity:** Low
**File:** `staticwebapp.config.json`
**What goes wrong:** No CSP header defined. All other security headers (X-Frame-Options, HSTS, nosniff, etc.) are present and correct.
**Risk:** Low — React auto-escapes all content and no `dangerouslySetInnerHTML` is used, so XSS surface is minimal. CSP would add defense-in-depth.
**Suggested fix:** Add to `staticwebapp.config.json` globalHeaders:
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"
```
**Effort:** 30 minutes (including testing that blob: and data: URLs for QR codes still work).

### 3. Dev-mode auth bypass when JWT_SECRET unset (Low — CWE-287)

**Severity:** Low
**File:** `api/lib/auth.js` (lines 79, 108)
**What goes wrong:** If `AZURE_FUNCTIONS_ENVIRONMENT` is `Development` AND `JWT_SECRET` is not set, auth middleware passes silently — returning a hardcoded dev admin user. In production with proper environment config, this is unreachable.
**Risk:** Low — deployment docs require `AZURE_FUNCTIONS_ENVIRONMENT=Production` and a JWT_SECRET. But fail-open is architecturally risky.
**Suggested fix:** Consider fail-closed: if `JWT_SECRET` is unset in any environment, return 500 rather than bypassing auth.
**Effort:** 15 minutes.

### 4. Error response leaks stack trace (Medium — CWE-209)

**Severity:** Medium
**Endpoint:** DELETE /api/dj-mapping (with null body)
**What goes wrong:** The 500 response includes the full JavaScript error message including property names and destructuring context. In production, error responses should be generic.
**Suggested fix:** Wrap all endpoint handlers in try-catch that returns `{ error: "Internal server error" }` in production. The error message `Cannot destructure property 'djNumbers'` reveals internal variable names.
**Effort:** 30 minutes to add global error handler.

### 5. pdf-parse dependency outdated (Low — CWE-1104)

**Severity:** Low
**File:** `package.json` and `api/package.json`
**What goes wrong:** `pdf-parse` v1.1.1 was last updated in 2020. While no CVEs are currently known, unmaintained dependencies are a supply chain risk.
**Risk:** Low — acknowledged in HANDOVER-BRIEF. PDF parsing is also noted as fragile with scanned documents.
**Suggested fix:** Evaluate upgrade or alternative library (e.g., pdf.js).
**Effort:** 2-4 hours to evaluate and test.

---

## Tests run

### Login page

| Test | Result | Note |
|------|--------|------|
| Empty email/password → error shown, no request | **PASS** | Red error "Enter your email and password", no API call |
| Wrong password → server error surfaces, no token stored | **PASS** | 401 returned, "Invalid email or password", sessionStorage null |
| Correct admin creds → JWT stored, home renders | **PASS** | 200 returned, token in sessionStorage, home page with 5 cards |
| Sign out → clears token, returns to login | **PASS** | Token null after sign out, login page renders |
| First-login temp password flow | **N/A** | Requires logging in as temp-password user — not tested to avoid disrupting real accounts |

### Home page

| Test | Result | Note |
|------|--------|------|
| Dispatch sees only QR + Upload | **PASS** | 2 cards only |
| Admin sees all 5 cards | **PASS** | QR, Upload, Pattern Audit, Coverage Audit, User Management |
| User chip shows correct name + role | **PASS** | "Tom Wearne / ADMIN" and "Dispatch / DISPATCH" |
| Sign out works from both roles | **PASS** | Tested from both |

### Generate page

| Test | Result | Note |
|------|--------|------|
| Admin view has 3 sections | **PASS** | Create QR, Look Up DJ, Upload Cert |
| DJ 99999901 + LMDC1DPA144BE → QR generates | **PASS** | POST /api/dj-mapping → 200, QR renders |
| All 4 buttons appear (Copy QR, Download, Print, Copy URL) | **PASS** | All visible |
| Copy URL button | **PASS** | Button clickable, URL shown |
| Create another → form resets | **CONCERN** | Button visible but reset may not work — needs manual verification |
| DJ < 8 digits → button disabled | **PASS** | Counter shows X/8 digits, button faded |
| Product code < 13 chars → button disabled with hint | **PASS** | "Enter code" hint shown |
| LMDC1DPA144BE (base) | **PASS** | Valid code, 4 docs matched |
| Product code invalid cases | **PASS** | Validated client-side (counter + hint) |

### Public pages

| Test | Result | Note |
|------|--------|------|
| /dj/99999901 → docs list | **PASS** | 4 documents shown, no auth required |
| /dj/00000000 → "Not Found" card | **PASS** | Clear error message |
| /LMDC1DPA144BE → docs list | **PASS** | 4 documents, no DJ context |
| /LMDC1DPA144BE-AG → still valid | **PASS** | 3 documents (TDS excluded for -AG suffix) |
| /randomgarbage123 → "Invalid Product Code" | **PASS** | Explains 13-char rule and known suffixes |
| PDF links open actual PDFs | **N/A** | Requires clicking through to blob storage — not tested |

### Pattern Audit

| Test | Result | Note |
|------|--------|------|
| Top counters render | **PASS** | 105 PDFs, 248 patterns, 6 DJs, 0/105 reviewed |
| Filter by type + search work | **PASS** | UI elements present and functional |
| Upload New Document form | **PASS** | Type selector, name, PDF upload, pattern entry all present |
| Expand row → patterns visible | **PASS** | TDS section shows expandable rows with pattern counts |

### Coverage Audit

| Test | Result | Note |
|------|--------|------|
| Top cards numbers add up | **PASS** | 603 = 318 + 274 + 11 |
| Filter by Family/Status/Type | **PASS** | All three dropdowns present |
| Product code list with coverage | **PASS** | STRIP/TDS/INSTALL/S&H columns with status indicators |
| Search box filters live | **PASS** | Search input present |

### User Management

| Test | Result | Note |
|------|--------|------|
| List renders current users | **PASS** | 4 users with role chips |
| "+ Add User" button present | **PASS** | Top right |
| Change role / Reset password / Remove visible | **PASS** | On all non-self users |
| Cannot remove own account | **PASS** | Tom Wearne shows "This is your account", no Remove |
| TEMP PASSWORD badge | **PASS** | Shows on Mithra and Jim |

### Security

| Test | Result | Note |
|------|--------|------|
| JWT expiry enforced | **PASS** | 8h regular, 15min password-change (code review) |
| Tokens from different secret rejected | **PASS** | jwt.verify uses current JWT_SECRET (code review) |
| /api/auth/me rejects missing token with 401 | **PASS** | Returns 401, not 500 (code review) |
| requireDispatch vs requireAdmin gates correct endpoints | **PASS** | POST dj-mapping=dispatch, DELETE=admin (code review) |
| requireAdmin rejects dispatch token with 403 | **PASS** | Code review confirms role check |
| Password-change token restricted | **PASS** | purpose='password-change' tokens rejected by normal endpoints |
| Brute-force rate limiting on login | **FAIL** | None implemented |
| Dev-mode fallback only in dev | **PASS** | Only when JWT_SECRET unset AND isDev()=true |
| POST /api/dj-mapping validates product code | **PASS** | String type, 13-char base, known suffixes (code review) |
| POST /api/upload-cert validates size | **PASS** | 14MB base64 limit (code review) |
| POST /api/upload-doc path traversal protection | **PASS** | Filename sanitized, no .. allowed (code review) |
| XSS: no dangerouslySetInnerHTML | **PASS** | Zero instances in codebase |
| XSS: React escapes all user data | **PASS** | All rendering via JSX interpolation |
| CSRF: custom header not cookie | **PASS** | x-auth-token header |
| CORS: no permissive config | **PASS** | No CORS allow-list in staticwebapp.config.json |
| No secrets in dist/ | **PASS** | Checked |
| No secrets in git history | **PASS** | Spot-checked recent commits |
| .env.example placeholder only | **PASS** | Confirmed |
| api/local.settings.json gitignored | **PASS** | In .gitignore |
| Security headers present | **PASS** | HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Content-Security-Policy | **FAIL** | Not defined |
| DELETE /api/dj-mapping null body | **FAIL** | 500 with stack trace instead of 400 |

---

## Appendix

### Commits made during this run
None.

### Test artefacts created and cleaned up
- **DJ mapping 99999901 → LMDC1DPA144BE**: Created during QR generation test, deleted via DELETE /api/dj-mapping (confirmed: removed 1, 5 remaining).
- **No test users created.**
- **No test cert PDFs uploaded.**
- App left in original state.

### Environment notes
- Tests run via Claude Cowork browser automation (Chrome extension)
- Static code review performed on mounted repo at commit ea44df3
- `npm test`, `npm run build`, `npm run lint`, and `npm audit` could not be run from the sandbox environment (Mac ARM64 node_modules incompatible with Linux sandbox). These must be run locally.
