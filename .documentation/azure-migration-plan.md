# FlowMap Azure Migration Plan

## Overview

This document outlines the migration strategy for FlowMap from AWS Amplify Gen 2 to Microsoft Azure, including integration with Microsoft 365 SSO via Azure Entra ID (formerly Azure AD).

---

## Current AWS Architecture

| Component | AWS Service | Purpose |
|-----------|-------------|---------|
| Frontend Hosting | Amplify Hosting | React SPA deployment |
| Database | DynamoDB | Initiative, Team, Theme, Dependency storage |
| Database | DynamoDB (Invitations) | Invitation codes with GSI for code lookup |
| API | AppSync (GraphQL) | Data queries, mutations, subscriptions |
| Real-time | AppSync Subscriptions | Live updates across clients |
| Auth | Cognito User Pool | Email-based signup with invitation validation |
| Auth Trigger | Lambda (pre-signup) | Validates invitation code before allowing signup |
| Invitation API | Lambda + Function URL | CRUD operations for invitation management |
| Infrastructure | CDK (via Amplify) | IaC through Amplify Gen 2 |

### Current Auth Flow (Invitation-Based)

```
1. Admin creates invitation → POST /invitations → DynamoDB (status: pending)
2. User receives invite link with code
3. User signs up with email + invitation code
4. Pre-signup Lambda validates:
   - Code exists in DynamoDB
   - Email matches invitation
   - Status is 'pending' (not used/revoked)
5. If valid → Cognito creates user, auto-confirms email
6. Invitation marked as 'accepted'
```

**Key Point:** Users cannot self-register. Access is controlled via invitation codes.

---

## Phase 1: Microsoft 365 SSO Integration

### DECISION REQUIRED: Invitation System

The current system uses **invitation-based access control** - users cannot self-register. They must have a valid invitation code.

With Microsoft 365 SSO, you have three options:

| Option | Access Control | Complexity | Recommendation |
|--------|---------------|------------|----------------|
| **A: Org-wide access** | Anyone in the O365 tenant can access | Simple | Best if all org members should have access |
| **B: Keep invitation system** | Invitation required + must be in O365 | Medium | Best for controlled rollout |
| **C: Azure Entra ID Groups** | Only members of specific AD group | Simple | Best for department/team-based access |

#### Option A: Org-Wide Access (Simplest)

- Any user in the client's Microsoft 365 can sign in
- No invitation system needed
- **Remove:** Invitation table, invitation API, pre-signup trigger
- **Pros:** Simple, no invitation management overhead
- **Cons:** No granular access control

#### Option B: Keep Invitation System (Current Behaviour)

- User must have both: valid invitation AND be in O365 org
- Migrate invitation table to Azure (Cosmos DB or Azure SQL)
- Migrate invitation API to Azure Functions
- **Pros:** Fine-grained control, familiar workflow
- **Cons:** More migration work, two systems to maintain

#### Option C: Azure Entra ID Groups (Recommended)

- Create a security group in Azure AD (e.g., "FlowMap Users")
- Only group members can access the app
- Client adds/removes users via Azure AD group membership
- **Pros:** Native Azure access control, no custom code needed
- **Cons:** Client manages access in Azure AD instead of FlowMap UI

**Instructions for each option are provided below. Choose before proceeding.**

---

### If Option A (Org-Wide Access)

Skip the invitation system entirely. Follow sections 1.1-1.8 as written.

### If Option B (Keep Invitation System)

Follow sections 1.1-1.8, then also complete **Section 1.9: Invitation System Migration**.

### If Option C (Azure AD Groups)

Follow sections 1.1-1.8, then also complete **Section 1.10: Azure AD Group-Based Access**.

---

### Responsibility Matrix

| Task | Owner | Requires |
|------|-------|----------|
| Register app in Azure Entra ID | **CLIENT** | Global Admin or Application Admin role |
| Configure redirect URIs | **CLIENT** | App registration access |
| Grant API permissions | **CLIENT** | Admin consent for org |
| Provide Client ID & Tenant ID | **CLIENT** | Copy from Azure Portal |
| Integrate MSAL into codebase | **YOU** | Client ID & Tenant ID |
| Build login UI components | **YOU** | MSAL integration complete |
| Deploy updated app | **YOU** | AWS Amplify access |
| Test SSO flow | **BOTH** | Deployed app + test user |

---

### 1.1 CLIENT TASKS (O365 Owner)

> **Send this section to your client** - they need to complete these steps in their Azure Portal.

#### Step 1: Access Azure Portal

1. Go to https://portal.azure.com
2. Sign in with a Global Administrator or Application Administrator account
3. Navigate to: **Azure Active Directory** > **App registrations**

#### Step 2: Register the FlowMap Application

1. Click **"+ New registration"**
2. Fill in the form:
   - **Name:** `FlowMap`
   - **Supported account types:** Select **"Accounts in this organizational directory only"**
   - **Redirect URI:**
     - Platform: **Single-page application (SPA)**
     - URI: `https://main.d1i0owfa4h2yjw.amplifyapp.com/auth/callback`
3. Click **Register**

#### Step 3: Add Additional Redirect URIs

1. In the newly created app, go to **Authentication**
2. Under "Single-page application" Redirect URIs, click **"Add URI"**
3. Add these URIs:
   ```
   https://main.d1i0owfa4h2yjw.amplifyapp.com/auth/callback
   http://localhost:5173/auth/callback
   http://localhost:3000/auth/callback
   ```
4. Scroll down to **"Implicit grant and hybrid flows"**
5. Check BOTH boxes:
   - [x] Access tokens
   - [x] ID tokens
6. Click **Save**

#### Step 4: Configure API Permissions

1. Go to **API permissions** in the left sidebar
2. Click **"+ Add a permission"**
3. Select **Microsoft Graph** > **Delegated permissions**
4. Search and add these permissions:
   - `email`
   - `openid`
   - `profile`
   - `User.Read`
5. Click **"Grant admin consent for [Your Org]"** (blue button)
6. Confirm by clicking **Yes**

#### Step 5: Send Values to Developer

Go to **Overview** and copy these two values:

| Field | Example Value | Send to Developer |
|-------|---------------|-------------------|
| **Application (client) ID** | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Yes |
| **Directory (tenant) ID** | `12345678-abcd-ef12-3456-7890abcdef12` | Yes |

**Email template to send:**
```
Subject: FlowMap Azure SSO Configuration Complete

Hi,

I've registered FlowMap in our Azure Entra ID. Here are the values you need:

Application (client) ID: [paste here]
Directory (tenant) ID: [paste here]

Admin consent has been granted for the required permissions.

Thanks
```

---

### 1.2 YOUR TASKS (Developer)

> **Complete these after receiving Client ID and Tenant ID from client**

#### Step 1: Install MSAL Dependencies

```bash
npm install @azure/msal-browser @azure/msal-react
```

#### Step 2: Create Auth Configuration

Create `src/lib/msalConfig.ts`:

```typescript
import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
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

#### Step 3: Add Environment Variables

Add to `.env.local` (for local dev):
```
VITE_AZURE_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
VITE_AZURE_TENANT_ID=12345678-abcd-ef12-3456-7890abcdef12
```

Add to AWS Amplify Environment Variables:
1. Go to AWS Amplify Console > FlowMap > Environment variables
2. Add:
   - `VITE_AZURE_CLIENT_ID` = [client ID from client]
   - `VITE_AZURE_TENANT_ID` = [tenant ID from client]

#### Step 4: Wrap App with MsalProvider

Update `src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './lib/msalConfig';
import App from './App';
import './index.css';

// Initialize MSAL before rendering
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  );
});
```

#### Step 5: Create Auth Gate Component

Create `src/components/MicrosoftAuthGate.tsx`:

```typescript
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from '@/lib/msalConfig';

interface MicrosoftAuthGateProps {
  children: React.ReactNode;
}

export function MicrosoftAuthGate({ children }: MicrosoftAuthGateProps) {
  const isAuthenticated = useIsAuthenticated();
  const { instance, inProgress } = useMsal();

  // Show loading while MSAL is working
  if (inProgress !== InteractionStatus.None) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Signing in...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 p-8">
          <h1 className="text-3xl font-bold">FlowMap</h1>
          <p className="text-muted-foreground">
            Sign in with your organisation account to continue
          </p>
          <button
            onClick={() => instance.loginRedirect(loginRequest)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0078d4] text-white rounded-md hover:bg-[#106ebe] transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
              <path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z"/>
            </svg>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

#### Step 6: Update App.tsx

Replace the existing AuthGate with MicrosoftAuthGate:

```typescript
import { MicrosoftAuthGate } from '@/components/MicrosoftAuthGate';

function App() {
  return (
    <MicrosoftAuthGate>
      {/* existing app content */}
    </MicrosoftAuthGate>
  );
}
```

#### Step 7: Add Auth Callback Route

Update your router to handle the callback (the redirect URI):

```typescript
// In your router configuration
{
  path: '/auth/callback',
  element: <AuthCallback />,
}

// AuthCallback component (simple redirect after login)
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // MSAL handles the token extraction automatically
    // Just redirect to home after a brief delay
    navigate('/', { replace: true });
  }, [navigate]);

  return <div>Completing sign in...</div>;
}
```

#### Step 8: Get User Info

To display the logged-in user:

```typescript
import { useMsal } from '@azure/msal-react';

function UserProfile() {
  const { accounts } = useMsal();
  const account = accounts[0];

  if (!account) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{account.name}</span>
      <span className="text-xs text-muted-foreground">{account.username}</span>
    </div>
  );
}
```

#### Step 9: Add Logout

```typescript
import { useMsal } from '@azure/msal-react';

function LogoutButton() {
  const { instance } = useMsal();

  return (
    <button onClick={() => instance.logoutRedirect()}>
      Sign out
    </button>
  );
}
```

#### Step 10: Deploy and Test

1. Commit and push changes
2. Amplify will auto-deploy
3. Test the SSO flow:
   - Visit the app
   - Click "Sign in with Microsoft"
   - Authenticate with an account from the client's O365
   - Verify redirect back to app with user logged in

---

### 1.3 JOINT TESTING CHECKLIST

| Test | Expected Result | Pass? |
|------|-----------------|-------|
| Click "Sign in with Microsoft" | Redirects to Microsoft login | [ ] |
| Enter valid org credentials | Authenticates successfully | [ ] |
| After login | Redirects back to FlowMap | [ ] |
| User name displayed | Shows correct Microsoft account name | [ ] |
| Refresh page | Stays logged in (session persists) | [ ] |
| Click Sign out | Logs out and shows login screen | [ ] |
| Try personal Microsoft account | Should be rejected (org-only) | [ ] |

---

### 1.4 Migration from Magic Link

Once Microsoft SSO is working:

**Remove (YOUR TASK):**
- [ ] Delete `amplify/functions/validate-token/` directory
- [ ] Remove magic link Lambda from `amplify/backend.ts`
- [ ] Delete `src/lib/auth.ts` (magic link functions)
- [ ] Delete `src/components/AuthGate.tsx` (old auth gate)
- [ ] Remove SSM parameter `/flowmap/auth/jwt-secret`

**Keep:**
- AWS Amplify hosting (until Phase 2 Azure migration)
- DynamoDB and AppSync (until Phase 2)

---

### 1.5 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "AADSTS50011: Reply URL mismatch" | Redirect URI not registered | Client needs to add exact URI to app registration |
| "AADSTS700016: Application not found" | Wrong Client ID | Verify VITE_AZURE_CLIENT_ID matches app registration |
| "AADSTS90002: Tenant not found" | Wrong Tenant ID | Verify VITE_AZURE_TENANT_ID matches directory |
| "Consent required" error | Admin consent not granted | Client needs to click "Grant admin consent" |
| Login works but no user info | Missing API permissions | Client needs to add User.Read permission |
| Can log in with personal account | Wrong account type setting | Client needs to set "Accounts in this organizational directory only" |

---

### 1.6 Timeline Summary

| Day | Task | Owner |
|-----|------|-------|
| Day 1 | Send client instructions (section 1.1) | You |
| Day 1-2 | Client registers app, sends back IDs | Client |
| Day 2-3 | Implement MSAL integration (section 1.2) | You |
| Day 3 | Deploy to Amplify | You |
| Day 3-4 | Joint testing | Both |
| Day 4 | Remove magic link code | You |

**Total: ~4 working days**

---

### 1.7 What You're Waiting For

Before you can start coding, you need from the client:

```
[ ] Application (client) ID
[ ] Directory (tenant) ID
[ ] Confirmation that admin consent was granted
```

**Send the client section 1.1 now** and start on section 1.2 as soon as you receive the IDs.

---

### 1.8 DEPRECATED: Previous Auth Components

The following were part of the generic instructions and are now replaced by the specific implementation above:

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

### 1.9 INVITATION SYSTEM MIGRATION (Option B Only)

> Only complete this section if you chose **Option B: Keep Invitation System**

#### Current AWS Components to Migrate

| AWS Component | Azure Equivalent |
|---------------|------------------|
| DynamoDB (Invitations table) | Azure Cosmos DB or Azure Table Storage |
| Lambda (invitation-api) | Azure Functions |
| Lambda (pre-signup trigger) | Custom middleware in app |
| Function URL | Azure Functions HTTP trigger |

#### Step 1: Create Invitation Table in Cosmos DB

```javascript
// Database: flowmap
// Container: invitations
// Partition key: /id

// Document structure (same as DynamoDB):
{
  "id": "uuid",
  "email": "user@example.com",
  "code": "uuid",
  "status": "pending" | "accepted" | "revoked",
  "invitedBy": "admin",
  "invitedAt": "2026-04-20T12:00:00Z",
  "acceptedAt": "2026-04-21T09:00:00Z"
}

// Add unique index on 'code' field for lookups
```

#### Step 2: Create Azure Function for Invitation API

Create `azure-functions/src/functions/invitations.ts`:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING!);
const container = cosmosClient.database('flowmap').container('invitations');

// GET /api/invitations - List all
app.http('listInvitations', {
  methods: ['GET'],
  route: 'invitations',
  handler: async (request: HttpRequest, context: InvocationContext) => {
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    return { jsonBody: resources };
  },
});

// POST /api/invitations - Create
app.http('createInvitation', {
  methods: ['POST'],
  route: 'invitations',
  handler: async (request: HttpRequest, context: InvocationContext) => {
    const body = await request.json() as { email: string; invitedBy?: string };

    const invitation = {
      id: crypto.randomUUID(),
      email: body.email,
      code: crypto.randomUUID(),
      status: 'pending',
      invitedBy: body.invitedBy || 'admin',
      invitedAt: new Date().toISOString(),
    };

    await container.items.create(invitation);
    return { status: 201, jsonBody: invitation };
  },
});

// GET /api/invitations/by-code?code=xxx - Validate code
app.http('getInvitationByCode', {
  methods: ['GET'],
  route: 'invitations/by-code',
  handler: async (request: HttpRequest, context: InvocationContext) => {
    const code = request.query.get('code');
    if (!code) {
      return { status: 400, jsonBody: { error: 'Missing code parameter' } };
    }

    const { resources } = await container.items
      .query({ query: 'SELECT * FROM c WHERE c.code = @code', parameters: [{ name: '@code', value: code }] })
      .fetchAll();

    if (resources.length === 0) {
      return { status: 404, jsonBody: { error: 'Invitation not found' } };
    }

    return { jsonBody: resources[0] };
  },
});
```

#### Step 3: Validate Invitation After Microsoft Login

Since Azure Entra ID doesn't have pre-signup triggers like Cognito, validate the invitation **after** the user logs in:

```typescript
// In MicrosoftAuthGate.tsx - add invitation validation

import { useMsal } from '@azure/msal-react';
import { useState, useEffect } from 'react';

export function MicrosoftAuthGate({ children }: { children: React.ReactNode }) {
  const { accounts } = useMsal();
  const isAuthenticated = accounts.length > 0;
  const [hasValidInvitation, setHasValidInvitation] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated && accounts[0]) {
      // Check if user has a valid (accepted) invitation
      validateUserInvitation(accounts[0].username)
        .then(setHasValidInvitation);
    }
  }, [isAuthenticated, accounts]);

  if (isAuthenticated && hasValidInvitation === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have an invitation to FlowMap.
            <br />
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // ... rest of auth gate
}

async function validateUserInvitation(email: string): Promise<boolean> {
  const response = await fetch(`/api/invitations/by-email?email=${encodeURIComponent(email)}`);
  if (!response.ok) return false;

  const invitation = await response.json();
  return invitation.status === 'accepted' || invitation.status === 'pending';
}
```

#### Step 4: Auto-Accept Invitation on First Login

```typescript
// After successful Microsoft login, mark invitation as accepted
async function acceptInvitationOnFirstLogin(email: string) {
  const response = await fetch(`/api/invitations/by-email?email=${encodeURIComponent(email)}`);
  if (!response.ok) return;

  const invitation = await response.json();
  if (invitation.status === 'pending') {
    await fetch(`/api/invitations/${invitation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
  }
}
```

#### Invitation Flow Comparison

| Step | AWS (Current) | Azure (Migrated) |
|------|---------------|------------------|
| 1. Create invitation | POST to Lambda Function URL | POST to Azure Function |
| 2. User clicks invite link | Goes to signup page | Goes to Microsoft login |
| 3. Validate invitation | Cognito pre-signup trigger | After-login check in React |
| 4. Create user | Cognito creates user | Azure Entra ID (already exists) |
| 5. Mark as accepted | Pre-signup trigger updates DynamoDB | React calls Azure Function |

---

### 1.10 AZURE AD GROUP-BASED ACCESS (Option C Only)

> Only complete this section if you chose **Option C: Azure Entra ID Groups**

#### CLIENT TASKS

**Step 1: Create Security Group**

1. Go to Azure Portal > Azure Active Directory > Groups
2. Click **"+ New group"**
3. Fill in:
   - Group type: **Security**
   - Group name: `FlowMap Users`
   - Group description: "Users with access to FlowMap application"
   - Membership type: **Assigned**
4. Click **Create**
5. Note the **Object ID** of the group

**Step 2: Assign Group to App**

1. Go to Azure Portal > Enterprise applications > FlowMap
2. Click **Users and groups** in the left sidebar
3. Click **"+ Add user/group"**
4. Select the "FlowMap Users" group
5. Click **Assign**

**Step 3: Enable Group Claims**

1. Go to Azure Portal > App registrations > FlowMap
2. Click **Token configuration**
3. Click **"+ Add groups claim"**
4. Select **Security groups**
5. Under "ID" token, check **Group ID**
6. Click **Add**

**Step 4: Send Group ID to Developer**

Send the developer:
- Group Object ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### YOUR TASKS (Developer)

**Step 1: Add Group Validation**

Update `src/components/MicrosoftAuthGate.tsx`:

```typescript
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';

const ALLOWED_GROUP_ID = import.meta.env.VITE_AZURE_ALLOWED_GROUP_ID;

export function MicrosoftAuthGate({ children }: { children: React.ReactNode }) {
  const { accounts, instance, inProgress } = useMsal();
  const account = accounts[0];

  // Get the ID token claims which include group memberships
  const groups = account?.idTokenClaims?.groups as string[] | undefined;
  const hasAccess = groups?.includes(ALLOWED_GROUP_ID) ?? false;

  if (inProgress !== InteractionStatus.None) {
    return <LoadingSpinner />;
  }

  if (!account) {
    return <LoginScreen />;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You are not a member of the FlowMap Users group.
            <br />
            Please contact your administrator to request access.
          </p>
          <button
            onClick={() => instance.logoutRedirect()}
            className="text-sm text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

**Step 2: Add Environment Variable**

Add to `.env.local` and Amplify environment variables:
```
VITE_AZURE_ALLOWED_GROUP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Step 3: Handle Large Group Memberships (>200 groups)**

If users might be in more than 200 groups, the groups won't be in the token. You'll need to call Microsoft Graph:

```typescript
import { useMsal } from '@azure/msal-react';

async function checkGroupMembership(groupId: string): Promise<boolean> {
  const { instance, accounts } = useMsal();

  const response = await instance.acquireTokenSilent({
    scopes: ['GroupMember.Read.All'],
    account: accounts[0],
  });

  const graphResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/memberOf/${groupId}`,
    {
      headers: { Authorization: `Bearer ${response.accessToken}` },
    }
  );

  return graphResponse.ok;
}
```

**Note:** This requires additional API permission: `GroupMember.Read.All` (delegated). The client must grant admin consent.

---

### 1.11 Migration Summary: What to Remove

Once Microsoft SSO is working:

**Option A (Org-Wide) - Remove everything:**
- [ ] `amplify/auth/` - Cognito auth
- [ ] `amplify/functions/invitation-api/` - Invitation management
- [ ] DynamoDB Invitations table
- [ ] All invitation-related frontend code

**Option B (Keep Invitations) - Remove Cognito only:**
- [ ] `amplify/auth/` - Cognito auth (replaced by Azure Entra ID)
- [ ] Keep invitation logic, migrate to Azure Functions + Cosmos DB

**Option C (AD Groups) - Remove everything:**
- [ ] `amplify/auth/` - Cognito auth
- [ ] `amplify/functions/invitation-api/` - Invitation management
- [ ] DynamoDB Invitations table
- [ ] All invitation-related frontend code
- [ ] Client manages access via Azure AD group membership

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
