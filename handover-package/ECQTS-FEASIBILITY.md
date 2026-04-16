# ECQTS API Discovery

Date: 16 April 2026
Investigated by: Claude Cowork

## Verdict

**AUTOMATABLE-WITH-IT-HELP** — ECQTS exposes a fully introspectable GraphQL API at a publicly-resolvable domain (`afl-prod-api.ecqts.aflglobal.com`). The API uses JWT Bearer auth with username/password login (not SSO-only). Schema introspection is enabled, revealing 121 queries and 541 mutations. Job details, product codes, and report generation are all accessible via GraphQL. Automation requires AFL IT to provision a service account (technical user) and confirm the API is callable from Azure Functions.

## Endpoint

- URL: **https://afl-prod-api.ecqts.aflglobal.com/api/graphql**
- HTTP method: POST
- Content-Type: application/json
- Auth mechanism: **Bearer JWT** (HS256, 15-minute expiry) via `Authorization` header
- Token storage: `accessToken` + `refreshToken` in localStorage (both JWTs)
- Token refresh: Short-lived access tokens (15 min) with a separate refresh token — server-to-server automation will need to handle token refresh
- Login: Username/password based (not Entra SSO-only). The `rememberMeCreds` localStorage key and JWT-based flow confirm standard credential auth is supported alongside any SSO option.

## Schema introspection

- Available: **Yes**
- Total types: 2,010
- Total queries: 121
- Total mutations: 541
- Subscriptions: Yes (real-time capable)

### Relevant queries (cert/report/job related)

```
eCQTSJobDetailDoc(query)          → ECQTSJobDetailDoc        # Job details incl. product code
eCQTSJobDetailDocs(query,limit)   → [ECQTSJobDetailDoc]      # List jobs
eCQTSJobCutListingDoc(query)      → ECQTSJobCutListingDoc    # Cut-level data
eCQTSJobCutListingDocs(query,limit) → [ECQTSJobCutListingDoc]
eCQTSFiberResultDoc(query)        → ECQTSFiberResultDoc      # Fiber test results
eCQTSFiberResultDocs(query,limit) → [ECQTSFiberResultDoc]
eCQTSMasterDataCOCMessagesDoc     → COC message templates
getDownloadPresignedURL(query!)   → String                   # S3 presigned URL for PDF download
getJobStatus(query)               → Job status info
jobsDoc / jobsDocs                → Job listing
cableDoc / cableDocs              → Cable data
```

### Key custom mutations (non-CRUD)

```
approveCopReport         # Certificate of Performance approval
updateDownloadHistory    # Track downloads
createCompanyUser        # User provisioning
resetUserPassword        # Password management
```

## Cert-fetch query (sanitised — no real values)

### 1. Get job detail (includes product code)

```graphql
query GetJobDetail($query: ECQTSJobDetailDocQueryInput) {
  eCQTSJobDetailDoc(query: $query) {
    JOB_NUM
    ITEM_ID
    ITEM_DESC          # Contains product code, e.g. "ADSS,AFL STD-M,144,SM,AE1449O621BF1"
    STATUS
    ORG_CD
    SALESORDERS { ... } # Nested object with sales order details
  }
}
# Variables: { "query": { "JOB_NUM": "<job-number>" } }
```

**Confirmed working** — tested with job 51141590, returned:
- JOB_NUM: "51141590"
- ITEM_ID: 1731424
- ITEM_DESC: "ADSS,AFL STD-M,144,SM,AE1449O621BF1"
- STATUS: "OK"

### 2. Download report PDF via presigned URL

```graphql
query GetPresignedURL($query: getDownloadPresignedURLInput!) {
  getDownloadPresignedURL(query: $query)
}
# Variables: { "query": { "fileName": "<s3-key>", "bucket": "<bucket-name>" } }
# Returns: presigned S3 URL string
```

**Partially tested** — the query executes without auth errors but returned null for all bucket names tried. The correct bucket name needs to be captured from the Angular app's source or DevTools when a download actually occurs.

### Report file naming convention (observed)

```
AFLGLOBAL/ECQTS/reports/ECQTS_{jobNumber}_{cutNumber}_COCReport_{YYYYMMDD}_{HHMMSStt}.pdf
AFLGLOBAL/ECQTS/reports/ECQTS_{jobNumber}_{cutNumber}RT_OpticalTestReport_{YYYYMMDD}_{HHMMSStt}.pdf
```

## JWT token structure

```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "sub": "<user-id-hash>",
    "iss": "<issuer-string>",
    "user_data": {
      "userName": "<username>",
      "innerUserName": "<username>"
    },
    "iat": "<issued-at-timestamp>",
    "exp": "<expiry-timestamp>",    // 15 minutes after iat
    "aud": "<audience-string>"
  }
}
```

## User object shape (from localStorage)

Key fields: `_id`, `userName`, `email`, `firstName`, `lastName`, `companyDetails`, `companyIdList`, `siteIdList`, `nodeIdList`, `AccessgroupDetails`, `status`, `isApproved`, `mfaEnabled`.

This is a MongoDB-backed user model with company/site/node multi-tenancy.

## Scriptability test

- Worked from curl outside browser: **Could not fully test** — sandbox proxy blocks the domain. However, the proxy attempted the CONNECT (meaning DNS resolves publicly), and the API domain `afl-prod-api.ecqts.aflglobal.com` is separate from the internal-only frontend domain.
- The API backend appears to be cloud-hosted (AWS, given S3 presigned URLs) rather than on AFL's corporate network.
- What would confirm it: A curl from any machine with unrestricted internet access using a valid Bearer token. The API should be callable server-to-server since it uses stateless JWT auth (not session cookies or CSRF tokens).

## Integration recommendation

Picked: **A (Azure Functions cron) — viable with high confidence**

Why: The ECQTS GraphQL API is fully introspectable with 121 queries available. Job details (including product codes) are queryable by job number. The auth mechanism is stateless JWT with refresh tokens — ideal for server-to-server automation. The API backend is at a publicly-resolvable domain separate from the internal frontend, suggesting it's cloud-hosted and likely reachable from Azure Functions without VPN. The integration path is: (1) authenticate with service account credentials, (2) poll `eCQTSJobDetailDocs` for jobs with status changes, (3) generate or fetch COC reports via the report generation flow, (4) POST the PDF to Cable Docs' `/api/upload-cert`.

If `getDownloadPresignedURL` can be made to work (correct bucket name needed), the flow simplifies to: query for new certs → get presigned URL → download PDF → POST to Cable Docs.

## Effort estimate

- **IT coordination to provision service account**: 0.5 dev-days — create a technical user in ECQTS with read-only access to job/report data
- **Capture missing details (bucket name, report generation mutation)**: 0.5 dev-days — someone on the AFL network needs to capture the exact download flow from DevTools
- **Build Azure Function poller**: 2 dev-days — timer trigger, JWT auth with refresh, query for new certs, download PDFs, POST to Cable Docs
- **Testing and deployment**: 1 dev-day
- **Total realistic estimate**: 3-4 dev-days including IT coordination

## What the US team would build (once service account is provisioned)

1. **New Azure Function `cert-poll/index.js`** — Timer trigger (every 5 minutes):
   - Authenticates to ECQTS GraphQL API using service account credentials
   - Manages JWT refresh (15-min access token expiry)
   - Queries `eCQTSJobDetailDocs` for jobs updated since last poll timestamp, filtered by status
   - For each new/updated job: fetches the COC report PDF via `getDownloadPresignedURL`
   - POSTs each PDF to Cable Docs `/api/upload-cert` with dispatch-role JWT
   - Stores last-poll timestamp in Azure Table Storage

2. **New env vars in App Settings**:
   - `ECQTS_GRAPHQL_URL` = `https://afl-prod-api.ecqts.aflglobal.com/api/graphql`
   - `ECQTS_SERVICE_USER` / `ECQTS_SERVICE_PASSWORD` (service account credentials)
   - `ECQTS_REPORT_BUCKET` (S3 bucket name for presigned URLs — needs to be captured)
   - `CERT_POLL_STATE_TABLE` (Azure Table Storage connection for poll state)

3. **Service account in ECQTS** — provisioned by AFL IT with:
   - Read-only access to job details and report data
   - Ability to generate/download COC reports
   - No MFA requirement (for automated login)

4. **No VPN/VNet integration likely needed** — the API backend (`afl-prod-api.ecqts.aflglobal.com`) appears to be cloud-hosted and publicly resolvable, unlike the frontend (`www.ecqts.aflglobal.com` which is also publicly resolvable but may have network restrictions)

## Risks / unknowns

1. **Presigned URL bucket name unknown** — `getDownloadPresignedURL` returned null for all bucket names tested. Someone needs to capture the correct bucket name and fileName format from the Angular app's network tab during an actual download.

2. **Report generation may require a mutation, not just a query** — the COC report generation triggered from the UI produced a PDF immediately, but the underlying mutation/query that generates the report (as opposed to just downloading an existing one) was not captured by our interceptors. The Angular HttpClient bypassed XHR patches. This needs to be captured from DevTools.

3. **Service account provisioning** — ECQTS needs a technical user that can authenticate non-interactively. If MFA is enforced for all users, IT will need to create an exemption or provide API key auth.

4. **Token refresh automation** — Access tokens expire in 15 minutes. The poller needs to implement refresh token flow. The refresh endpoint/mutation needs to be identified (likely a dedicated REST endpoint or GraphQL mutation not yet discovered).

5. **Rate limiting unknown** — No rate limiting was observed, but automated polling every 5 minutes should be well within any reasonable limits.

6. **Schema stability** — With introspection enabled and 2,010 types, the API appears to be auto-generated (likely MongoDB Realm / Atlas App Services). Schema changes could break the integration if fields are renamed or removed.

7. **Authorization scope** — The current user (Tom Wearne) has broad access. A service account may have more restricted permissions. Need to verify the service account can access the same queries.

## Recommended next steps

1. **AFL IT**: Provision a service account (technical user) in ECQTS with read-only access to job details and report generation. Disable MFA for this account.

2. **Developer on AFL network**: Open DevTools Network tab, click "Download Report" on a COC report, and capture:
   - The exact `bucket` parameter value used in `getDownloadPresignedURL`
   - The request body of the report-generation call (the mutation or query that triggers PDF creation)
   - The refresh token endpoint/flow (how the app gets a new access token when the 15-min one expires)

3. **US team**: Once the above two items are provided, build the Azure Function poller as described above. Estimated 2 dev-days from receipt of the missing details.

## Appendix: Full query/mutation list

<details>
<summary>All 121 queries</summary>

The full list was retrieved via introspection. Key categories:
- **Job/Cut data**: eCQTSJobDetailDoc(s), eCQTSJobCutListingDoc(s)
- **Fiber results**: eCQTSFiberResultDoc(s), eCQTSFiberResultExtraDoc(s), eCQTSFiberProfileDoc(s)
- **Master data**: eCQTSMasterDataCOCMessagesDoc(s), eCQTSMasterDataCutNumberInfoDoc(s), eCQTSMasterQELabsTestNameDoc(s)
- **Downloads**: getDownloadPresignedURL
- **Cable data**: cableDoc(s)
- **Jobs**: jobsDoc(s), getJobStatus
- **QE Labs**: eCQTSQELabsJobInstrumentMappingDoc(s)
</details>
