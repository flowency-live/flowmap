# FlowMap Azure Migration Plan

## Overview

This document outlines the migration strategy for FlowMap from AWS Amplify Gen 2 to Microsoft Azure, including integration with Microsoft 365 SSO via Azure Entra ID (formerly Azure AD).

---

## Current AWS Architecture

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| Frontend Hosting | Amplify Hosting | React SPA deployment |
| Database | DynamoDB | Initiative, Team, Theme, Dependency storage |
| API | AppSync (GraphQL) | Data queries, mutations, subscriptions |
| Real-time | AppSync Subscriptions | Live updates across clients |
| Auth | Magic Link (Lambda) | Token validation via Lambda function URL |
| Serverless | Lambda | validate-token function |
| Infrastructure | CDK (via Amplify) | IaC through Amplify Gen 2 |

---

## Phase 1: Microsoft 365 SSO Integration

### 1.1 Azure Entra ID Setup

**Prerequisites:**
- Admin access to your organisation's Microsoft 365 tenant
- Azure subscription linked to the same tenant

**Steps:**

1. **Register Application in Azure Entra ID**
   ```
   Azure Portal > Azure Active Directory > App registrations > New registration
   ```
   - Name: "FlowMap"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `https://your-domain.com/auth/callback` (SPA type)

2. **Configure Authentication**
   - Enable "Access tokens" and "ID tokens" under Implicit grant
   - Add SPA redirect URIs for local dev: `http://localhost:5173/auth/callback`

3. **API Permissions**
   - Microsoft Graph > User.Read (delegated) - for basic profile
   - Microsoft Graph > email (delegated) - for email address
   - Microsoft Graph > openid (delegated) - for OIDC
   - Microsoft Graph > profile (delegated) - for display name

4. **Note Required Values**
   - Application (client) ID
   - Directory (tenant) ID

### 1.2 Frontend Integration with MSAL

**Install dependencies:**
```bash
npm install @azure/msal-browser @azure/msal-react
```

**Configuration (`src/lib/authConfig.ts`):**
```typescript
import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin + '/auth/callback',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

export const msalInstance = new PublicClientApplication(msalConfig);
```

**Wrap App with MsalProvider:**
```typescript
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/authConfig';

<MsalProvider instance={msalInstance}>
  <App />
</MsalProvider>
```

### 1.3 Auth Components

**Login Button:**
```typescript
import { useMsal } from '@azure/msal-react';
import { loginRequest } from './authConfig';

function LoginButton() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return <button onClick={handleLogin}>Sign in with Microsoft</button>;
}
```

**Protected Routes:**
```typescript
import { useIsAuthenticated, useMsal } from '@azure/msal-react';

function ProtectedRoute({ children }) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return children;
}
```

### 1.4 Migration from Magic Link

| Current (Magic Link) | New (Microsoft SSO) |
|---------------------|---------------------|
| Lambda validate-token | Azure Entra ID token validation |
| Custom JWT | Microsoft ID tokens |
| Email-based auth | Microsoft 365 account |
| SSM parameter storage | Azure Entra ID handles secrets |

**Decommission:**
- Remove `amplify/functions/validate-token/`
- Remove magic link email sending
- Remove token validation Lambda

---

## Phase 2: Azure Infrastructure Setup

### 2.1 Service Mapping

| AWS Service | Azure Equivalent | Notes |
|-------------|------------------|-------|
| Amplify Hosting | Azure Static Web Apps | Built-in CI/CD, staging environments |
| DynamoDB | Azure Cosmos DB (NoSQL) | Same data model, different SDK |
| AppSync GraphQL | Azure API Management + Azure Functions | Or self-hosted Apollo Server |
| AppSync Subscriptions | Azure SignalR Service | WebSocket-based real-time |
| Lambda | Azure Functions | Same serverless model |
| SSM Parameters | Azure Key Vault | Secrets management |
| CloudFormation/CDK | Bicep or ARM templates | IaC |

### 2.2 Azure Resource Group Structure

```
flowmap-rg/
├── flowmap-static-web-app      # Frontend hosting
├── flowmap-cosmos-db           # Database (NoSQL API)
├── flowmap-functions           # Serverless functions
├── flowmap-signalr             # Real-time messaging
├── flowmap-apim                # API Management (optional)
└── flowmap-keyvault            # Secrets
```

### 2.3 Azure Cosmos DB Migration

**Database Design:**
```
Database: flowmap
├── Container: initiatives (partition key: /id)
├── Container: teams (partition key: /id)
├── Container: themes (partition key: /id)
└── Container: dependencies (partition key: /id)
```

**Data Migration Strategy:**
1. Export DynamoDB data using AWS Data Pipeline or custom script
2. Transform to Cosmos DB format (minimal changes needed)
3. Import using Azure Data Factory or Cosmos DB Data Migration Tool

**SDK Change:**
```typescript
// Before (AWS)
import { generateClient } from 'aws-amplify/data';
const client = generateClient<Schema>();
const { data } = await client.models.Initiative.list();

// After (Azure Cosmos DB)
import { CosmosClient } from '@azure/cosmos';
const client = new CosmosClient({ endpoint, key });
const { resources } = await client
  .database('flowmap')
  .container('initiatives')
  .items.query('SELECT * FROM c')
  .fetchAll();
```

### 2.4 Azure Functions for API

**Project Structure:**
```
azure-functions/
├── host.json
├── local.settings.json
├── package.json
├── src/
│   ├── functions/
│   │   ├── graphql.ts          # GraphQL endpoint
│   │   ├── negotiate.ts        # SignalR negotiation
│   │   └── broadcast.ts        # Real-time broadcasts
│   └── lib/
│       ├── cosmos.ts           # Cosmos DB client
│       ├── resolvers.ts        # GraphQL resolvers
│       └── schema.ts           # GraphQL schema
```

**GraphQL Function:**
```typescript
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateHandler } from '@as-integrations/azure-functions';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

export default app.http('graphql', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: startServerAndCreateHandler(server),
});
```

### 2.5 Azure SignalR for Real-time

**Replace AppSync Subscriptions:**

```typescript
// SignalR client setup
import * as signalR from '@microsoft/signalr';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('/api/negotiate')
  .withAutomaticReconnect()
  .build();

connection.on('initiativeUpdated', (initiative) => {
  // Handle real-time update
  portfolioStore.getState()._applyInitiativeUpdate(initiative);
});

connection.on('initiativeCreated', (initiative) => {
  portfolioStore.getState()._applyInitiativeCreate(initiative);
});

await connection.start();
```

**Azure Function for broadcasting:**
```typescript
import { app, output } from '@azure/functions';

const signalROutput = output.generic({
  type: 'signalR',
  name: 'signalRMessages',
  hubName: 'flowmap',
  connectionStringSetting: 'AzureSignalRConnectionString',
});

app.cosmosDB('broadcastChanges', {
  connectionStringSetting: 'CosmosDBConnection',
  databaseName: 'flowmap',
  containerName: 'initiatives',
  createLeaseContainerIfNotExists: true,
  return: signalROutput,
  handler: (documents, context) => {
    return documents.map(doc => ({
      target: 'initiativeUpdated',
      arguments: [doc],
    }));
  },
});
```

### 2.6 Azure Static Web Apps Configuration

**staticwebapp.config.json:**
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "*.{css,js,png,svg,ico}"]
  },
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

---

## Phase 3: Migration Execution

### 3.1 Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Microsoft SSO | 1-2 weeks | Azure Entra ID admin access |
| Phase 2.1: Infrastructure setup | 1 week | Azure subscription |
| Phase 2.2: Cosmos DB migration | 1 week | Data export from DynamoDB |
| Phase 2.3: Azure Functions API | 2-3 weeks | GraphQL schema port |
| Phase 2.4: SignalR real-time | 1-2 weeks | API completion |
| Phase 2.5: Frontend refactor | 1-2 weeks | All backend services |
| Testing & QA | 1-2 weeks | All components |
| **Total** | **8-12 weeks** | |

### 3.2 Migration Sequence

```
Week 1-2:   [Phase 1] Microsoft SSO (can run parallel with AWS)
Week 3:     [Phase 2.1] Azure infrastructure provisioning
Week 4:     [Phase 2.2] Cosmos DB setup + data migration
Week 5-7:   [Phase 2.3] Azure Functions GraphQL API
Week 8-9:   [Phase 2.4] SignalR real-time integration
Week 10-11: [Phase 2.5] Frontend SDK migration
Week 12:    [Testing] E2E testing, performance validation
Week 13:    [Cutover] DNS switch, AWS decommission
```

### 3.3 Parallel Running Strategy

1. **Add Microsoft SSO to existing AWS deployment** (Phase 1)
   - Users can sign in with Microsoft while still on AWS
   - Validates SSO flow before full migration

2. **Build Azure environment in parallel**
   - Staging URL for Azure Static Web App
   - Test with subset of data

3. **Feature flag for backend switch**
   ```typescript
   const USE_AZURE = import.meta.env.VITE_USE_AZURE === 'true';

   export const dataClient = USE_AZURE
     ? createAzureClient()
     : createAmplifyClient();
   ```

4. **DNS cutover when ready**
   - Point domain to Azure Static Web App
   - Keep AWS running for 1 week as fallback

---

## Phase 4: Code Changes Summary

### 4.1 Files to Remove

```
amplify/                        # Entire Amplify backend
├── auth/
├── data/
├── functions/
└── backend.ts

src/lib/auth.ts                 # Magic link auth
src/components/AuthGate.tsx     # Magic link gate (replace with MSAL)
```

### 4.2 Files to Add

```
azure/                          # Azure Functions
├── host.json
├── package.json
└── src/
    └── functions/

src/lib/
├── authConfig.ts              # MSAL configuration
├── cosmosClient.ts            # Cosmos DB client
└── signalr.ts                 # SignalR connection

staticwebapp.config.json       # Azure Static Web Apps config
.github/workflows/azure.yml    # Azure deployment workflow
```

### 4.3 Files to Modify

```
src/main.tsx                   # Add MsalProvider
src/App.tsx                    # Remove Amplify subscriptions, add SignalR
src/stores/portfolioStore.ts   # Replace Amplify client with Cosmos DB
package.json                   # Swap AWS SDKs for Azure SDKs
```

### 4.4 Package Changes

**Remove:**
```json
{
  "aws-amplify": "^6.x",
  "@aws-amplify/ui-react": "^6.x"
}
```

**Add:**
```json
{
  "@azure/msal-browser": "^3.x",
  "@azure/msal-react": "^2.x",
  "@azure/cosmos": "^4.x",
  "@microsoft/signalr": "^8.x"
}
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Real-time feature parity | High | Thorough testing of SignalR vs AppSync |
| Data migration errors | High | Validate row counts, checksums post-migration |
| Cosmos DB cost model | Medium | Configure autoscale, monitor RU consumption |
| SSO permission issues | Medium | Test with multiple user roles early |
| Downtime during cutover | Low | Use blue-green deployment, DNS TTL |

---

## Cost Comparison (Estimate)

| Service | AWS (Current) | Azure (Projected) |
|---------|---------------|-------------------|
| Hosting | Amplify ~$5/mo | Static Web Apps Free tier |
| Database | DynamoDB ~$10/mo | Cosmos DB ~$25/mo (serverless) |
| Functions | Lambda ~$1/mo | Functions ~$1/mo |
| Real-time | AppSync ~$5/mo | SignalR ~$50/mo (1 unit) |
| **Total** | ~$21/mo | ~$76/mo |

**Note:** SignalR pricing is higher but includes guaranteed capacity. Consider Azure Web PubSub (~$1/mo for small scale) as alternative.

---

## Decision Points Required

1. **SignalR vs Web PubSub** - Cost vs feature trade-off
2. **Cosmos DB vs Azure SQL** - NoSQL continuation vs relational migration
3. **Self-hosted GraphQL vs REST** - Keep GraphQL or simplify to REST
4. **Static Web Apps vs App Service** - Simpler hosting vs more control
5. **Timeline priority** - SSO first (quick win) vs full migration (clean break)

---

## Next Steps

1. [ ] Obtain Azure Entra ID admin access
2. [ ] Register FlowMap application in Azure Entra ID
3. [ ] Prototype MSAL integration locally
4. [ ] Create Azure resource group and provision Cosmos DB
5. [ ] Export DynamoDB data for migration testing
6. [ ] Spike: Azure Functions + Apollo Server setup
7. [ ] Spike: SignalR real-time subscription replacement

---

*Document created: 20th April 2026*
*Last updated: 20th April 2026*
