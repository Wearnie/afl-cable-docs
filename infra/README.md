# Infrastructure

Declarative Azure resources for AFL Cable Docs. Deploy the whole backend with one command.

## Prerequisites
- Azure CLI ≥ 2.50 (`az --version`)
- An Azure subscription where you have Contributor on (a new or existing) resource group
- `openssl` for generating the JWT secret (any POSIX shell)

## What this creates

| Resource | Purpose |
|---|---|
| Storage account (`<prefix><suffix>`) | Holds `data/*.json` and `docs/**/*.pdf` |
| Blob container (`afl-cable-docs`) | Single container for all app data |
| Static Web App (`<prefix>-swa`) | Hosts the React frontend + Functions API |
| SWA App Settings | Wires every env var the app reads at runtime |
| Application Insights (optional) | Off by default — set `enableMonitoring=true` to provision |

## Deploy

```bash
# 1. Create a resource group (once)
az group create --name rg-afl-cable-docs --location eastus2

# 2. Deploy
az deployment group create \
  --resource-group rg-afl-cable-docs \
  --template-file infra/main.bicep \
  --parameters \
      repoUrl=https://github.com/<your-org>/afl-cable-docs \
      jwtSecret=$(openssl rand -hex 32)
```

### Common parameter overrides

```bash
  --parameters \
      repoUrl=https://github.com/<your-org>/afl-cable-docs \
      repoBranch=main \
      namePrefix=aflcabledocs \
      location=eastus2 \
      jwtSecret=$(openssl rand -hex 32) \
      enableMonitoring=true
```

## What this does NOT create

Portal operations you still need to do once:

- **GitHub Actions deploy token.** After `az deployment` succeeds, read the deploy token from the SWA and add it as a repo secret. See `DEPLOY.md` §3.
- **Custom domain + SSL.** Bind via SWA Portal → Custom domains. See `DEPLOY.md` §8.
- **301 redirect from the old Melbourne URL.** If you're re-hosting, preserve sticker URLs. See `DEPLOY.md` §9.

## Validate without deploying

```bash
az bicep lint --file infra/main.bicep
az deployment group what-if \
  --resource-group rg-afl-cable-docs \
  --template-file infra/main.bicep \
  --parameters repoUrl=https://github.com/<your-org>/afl-cable-docs \
               jwtSecret=$(openssl rand -hex 32)
```

`what-if` prints the resource graph that would be created without creating anything. Use it before the real deploy.

## Teardown

```bash
az group delete --name rg-afl-cable-docs --yes --no-wait
```

Wipes everything — storage, SWA, app insights. Irreversible. Only run against an environment you're certain you don't need.
