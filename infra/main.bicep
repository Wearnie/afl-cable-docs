// AFL Cable Docs — Azure infrastructure as code
// ----------------------------------------------
// Provisions: Storage account + blob container, Azure Static Web App,
// all App Settings wired through, and (optionally) Application Insights.
//
// Usage:
//   az group create --name rg-afl-cable-docs --location eastus2
//   az deployment group create \
//     --resource-group rg-afl-cable-docs \
//     --template-file infra/main.bicep \
//     --parameters repoUrl=https://github.com/<your-org>/afl-cable-docs \
//                  jwtSecret=$(openssl rand -hex 32)
//
// What you still do by hand in the Portal after this runs:
//   1. Add the GitHub Actions deploy token to your repo (see DEPLOY.md §3)
//   2. Bind a custom domain + SSL to the SWA (DEPLOY.md §8)
//   3. Configure the 301 redirect from the old URL (DEPLOY.md §9)

// ---- Parameters --------------------------------------------------------------

@description('Azure region for all resources. Default: East US 2.')
param location string = 'eastus2'

@description('Prefix used for resource names. Storage account gets a unique suffix appended because storage names are globally unique.')
@minLength(3)
@maxLength(18)
param namePrefix string = 'aflcabledocs'

@description('GitHub repository URL for the Static Web App to deploy from.')
param repoUrl string

@description('Branch the Static Web App deploys from. Default: main.')
param repoBranch string = 'main'

@description('Blob container name for all app data + PDFs. Default: afl-cable-docs.')
param blobContainerName string = 'afl-cable-docs'

@description('JWT signing secret. Generate with: openssl rand -hex 32')
@secure()
@minLength(32)
param jwtSecret string

@description('Set AZURE_FUNCTIONS_ENVIRONMENT to Production so errors are sanitised to the client.')
@allowed([
  'Production'
  'Development'
])
param functionsEnvironment string = 'Production'

@description('Enable Application Insights for the SWA + Functions. Default: false.')
param enableMonitoring bool = false

// ---- Derived names -----------------------------------------------------------

var uniqueSuffix = uniqueString(resourceGroup().id)
var storageAccountName = toLower(replace('${namePrefix}${uniqueSuffix}', '-', ''))
var swaName = '${namePrefix}-swa'
var appInsightsName = '${namePrefix}-ai'

// ---- Storage account + blob container ---------------------------------------

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true // needed because PDFs are served directly from blob to the browser
    accessTier: 'Hot'
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: blobContainerName
  properties: {
    publicAccess: 'Blob' // blob-level read, no container listing
  }
}

// ---- Application Insights (optional) ----------------------------------------

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableMonitoring) {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ---- Static Web App ---------------------------------------------------------

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: repoUrl
    branch: repoBranch
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}

// ---- SWA Application Settings (Functions env vars) --------------------------

var storageKey = storage.listKeys().keys[0].value
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storageKey};EndpointSuffix=${environment().suffixes.storage}'

var baseAppSettings = {
  JWT_SECRET: jwtSecret
  AZURE_STORAGE_CONNECTION_STRING: storageConnectionString
  AZURE_STORAGE_CONTAINER: blobContainerName
  AZURE_FUNCTIONS_ENVIRONMENT: functionsEnvironment
}

var appInsightsSettings = enableMonitoring ? {
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
} : {}

resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: swa
  name: 'appsettings'
  properties: union(baseAppSettings, appInsightsSettings)
}

// ---- Outputs -----------------------------------------------------------------

output storageAccountName string = storage.name
output blobContainerName string = blobContainerName
@secure()
output storageConnectionString string = storageConnectionString
output swaName string = swa.name
output swaDefaultHostname string = swa.properties.defaultHostname
output blobBaseUrl string = '${storage.properties.primaryEndpoints.blob}${blobContainerName}/docs'
output appInsightsConnectionString string = enableMonitoring ? appInsights.properties.ConnectionString : ''
