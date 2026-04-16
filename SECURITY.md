# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in AFL Cable Docs, please report it
**privately** by email — do not open a public GitHub issue.

**Primary contact (post-handover):**
Mithra BaluBavitha — mithra.balubavitha@aflglobal.com

**During handover window (~30 days from go-live):**
Tom Wearne — tom.wearne@aflglobal.com

We aim to:

- Acknowledge receipt within **2 business days**
- Provide an initial assessment within **5 business days**
- Disclose any required mitigation to affected parties within **90 days**
  (or sooner if a working exploit exists in the wild)

## Scope

In scope:

- The deployed web application
- The Azure Functions API
- The data store (Azure Blob Storage)
- The CI/CD pipeline (GitHub Actions)
- The Bicep infrastructure templates

Out of scope:

- Vulnerabilities in upstream dependencies (please report to the dependency author; we'll absorb the fix once published)
- Social engineering attacks against AFL staff
- DoS attacks
- Issues requiring physical access to AFL premises

## Guidance for reporters

Please include, where possible:

- A concise description of the issue and its impact
- Steps to reproduce, or a proof-of-concept
- Affected URL(s) or endpoint(s)
- Your environment (browser, OS, etc.)

## Recognition

We do not currently run a bug bounty programme. Reports of valid issues will
be acknowledged in this file (with the reporter's permission) once the issue
is resolved.

## Known limitations

The following are documented operational realities, not vulnerabilities:

- No rate limiting on `/api/auth/login` — internal app, planned hardening
- No multi-factor authentication — planned via Entra SSO migration
- The data store uses public-blob-level read access for PDFs (required for
  direct browser → blob streaming); the container is enumeration-resistant
  but the URLs themselves are unguessable rather than secret
