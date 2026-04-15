# Workstream 2: Backend (AppSync + DynamoDB + Amplify)

## Overview

Set up AWS Amplify Gen 2 with AppSync GraphQL API and DynamoDB for data storage with real-time subscriptions.

**Independence:** This workstream can proceed independently and be tested via AppSync console.

---

## Phase 2.1: Amplify Setup

### Initialize Project

```bash
cd C:\VSProjects\_Websites\FlowMap
npm create amplify@latest

# Follow prompts:
# - Select "Blank" template
# - Choose TypeScript
```

### Install Dependencies

```bash
pnpm add aws-amplify @aws-amplify/ui-react
```

### Project Structure After Init

```
flowmap/
├── amplify/
│   ├── data/
│   │   └── resource.ts      # Data model definition
│   ├── backend.ts           # Backend configuration
│   └── tsconfig.json
├── amplify_outputs.json     # Generated config (gitignored)
└── package.json
```

### Start Sandbox

```bash
npx ampx sandbox
```

This deploys a personal dev backend to AWS.

### Acceptance Criteria
- [ ] `npx ampx sandbox` runs without errors
- [ ] `amplify_outputs.json` generated
- [ ] AppSync console accessible in AWS

---

## Phase 2.2: GraphQL Schema & Data Model

### Define Data Models

**amplify/data/resource.ts**
```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Theme - portfolio grouping
  Theme: a.model({
    name: a.string().required(),
    initiatives: a.hasMany('Initiative', 'themeId'),
  }).authorization((allow) => [allow.publicApiKey()]),

  // Team - delivery team
  Team: a.model({
    name: a.string().required(),
    isPrimaryConstraint: a.boolean().default(false),
  }).authorization((allow) => [allow.publicApiKey()]),

  // Initiative - work item
  Initiative: a.model({
    name: a.string().required(),
    themeId: a.id().required(),
    theme: a.belongsTo('Theme', 'themeId'),
    parentId: a.id(),
    notes: a.string().default(''),
    sequencingNotes: a.string().default(''),
    // Store team states as JSON for simplicity
    teamStates: a.json(),
  }).authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
```

### Alternative: Separate FlowState Model (More Normalized)

```typescript
// If you prefer normalized data:
FlowState: a.model({
  initiativeId: a.id().required(),
  initiative: a.belongsTo('Initiative', 'initiativeId'),
  teamId: a.id().required(),
  state: a.enum(['NOT_STARTED', 'IN_DISCOVERY', 'READY', 'IN_FLIGHT', 'UAT', 'DONE', 'NA']),
}).authorization((allow) => [allow.publicApiKey()])
  .secondaryIndexes((index) => [
    index('initiativeId'),
    index('teamId'),
  ]),
```

### Register Data in Backend

**amplify/backend.ts**
```typescript
import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';

defineBackend({
  data,
});
```

### Deploy and Test

```bash
# Redeploy sandbox with new schema
npx ampx sandbox

# Open AppSync console
# AWS Console → AppSync → flowmap-sandbox → Queries
```

### Test Queries in AppSync Console

```graphql
# Create a theme
mutation CreateTheme {
  createTheme(input: { name: "NatWest" }) {
    id
    name
  }
}

# Create a team
mutation CreateTeam {
  createTeam(input: { name: "UPJ", isPrimaryConstraint: true }) {
    id
    name
    isPrimaryConstraint
  }
}

# Create an initiative
mutation CreateInitiative {
  createInitiative(input: {
    name: "Customer Portal Redesign"
    themeId: "THEME_ID_HERE"
    teamStates: "{\"team-1\": \"NOT_STARTED\", \"team-2\": \"READY\"}"
  }) {
    id
    name
    teamStates
  }
}

# Query all initiatives
query ListInitiatives {
  listInitiatives {
    items {
      id
      name
      themeId
      teamStates
    }
  }
}
```

### Acceptance Criteria
- [ ] All models created in DynamoDB
- [ ] CRUD operations work in AppSync console
- [ ] No authorization errors

---

## Phase 2.3: Custom Mutation for Flow State Update

AppSync auto-generates basic CRUD, but we may want a cleaner mutation for updating just the flow state.

### Option A: Use Standard updateInitiative

```graphql
mutation UpdateFlowState {
  updateInitiative(input: {
    id: "INITIATIVE_ID"
    teamStates: "{\"team-1\": \"IN_FLIGHT\", \"team-2\": \"READY\"}"
  }) {
    id
    teamStates
  }
}
```

This works but requires client to manage the full JSON.

### Option B: Custom Resolver (Advanced)

If you need atomic updates to single team states, add a custom resolver:

**amplify/data/resource.ts** (add custom mutation)
```typescript
const schema = a.schema({
  // ... existing models ...

  // Custom mutation for atomic flow state update
  updateFlowState: a.mutation()
    .arguments({
      initiativeId: a.id().required(),
      teamId: a.string().required(),
      state: a.enum(['NOT_STARTED', 'IN_DISCOVERY', 'READY', 'IN_FLIGHT', 'UAT', 'DONE', 'NA']),
    })
    .returns(a.ref('Initiative'))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.custom({
      dataSource: 'InitiativeTable',
      entry: './updateFlowState.js',
    })),
});
```

**For MVP:** Option A is simpler. Update full teamStates JSON from client.

---

## Phase 2.4: Subscriptions Configuration

### Verify Auto-Generated Subscriptions

Amplify automatically creates subscriptions for all mutations:
- `onCreateTheme`
- `onUpdateTheme`
- `onDeleteTheme`
- `onCreateTeam`
- `onUpdateTeam`
- `onDeleteTeam`
- `onCreateInitiative`
- `onUpdateInitiative`
- `onDeleteInitiative`

### Test Subscriptions

1. Open AppSync console in **two browser tabs**
2. In Tab 1, start subscription:
```graphql
subscription OnUpdateInitiative {
  onUpdateInitiative {
    id
    name
    teamStates
  }
}
```
3. In Tab 2, run mutation:
```graphql
mutation {
  updateInitiative(input: {
    id: "INITIATIVE_ID"
    teamStates: "{\"team-1\": \"DONE\"}"
  }) {
    id
    teamStates
  }
}
```
4. Tab 1 should receive the update automatically

### Acceptance Criteria
- [ ] Subscriptions receive real-time updates
- [ ] Multiple tabs stay in sync

---

## Phase 2.5: Amplify Hosting Setup

### Create amplify.yml

**amplify.yml** (in project root)
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Connect to Git

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Select branch (e.g., `main`)
5. Amplify auto-detects `amplify.yml`

### Configure Custom Domain (Optional)

1. In Amplify Console → Domain management
2. Add domain
3. Follow DNS verification steps
4. SSL certificate auto-provisioned

### Environment Variables

Set in Amplify Console → App settings → Environment variables:
- None needed for MVP (API key is in `amplify_outputs.json`)

### Acceptance Criteria
- [ ] App deploys on Git push
- [ ] Custom domain working (if configured)
- [ ] HTTPS enabled

---

## Phase 2.6: Seed Data

### Create Seed Script

**scripts/seed.ts**
```typescript
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);
const client = generateClient<Schema>();

async function seed() {
  console.log('Seeding database...');

  // Create themes
  const themes = await Promise.all([
    client.models.Theme.create({ name: 'NatWest' }),
    client.models.Theme.create({ name: 'M&S' }),
    client.models.Theme.create({ name: 'LBG' }),
    client.models.Theme.create({ name: 'Aviva' }),
  ]);
  console.log('Created themes:', themes.map(t => t.data?.name));

  // Create teams
  const teams = await Promise.all([
    client.models.Team.create({ name: 'UPJ', isPrimaryConstraint: true }),
    client.models.Team.create({ name: 'UPC', isPrimaryConstraint: false }),
    client.models.Team.create({ name: 'Ember', isPrimaryConstraint: false }),
    client.models.Team.create({ name: 'Logan', isPrimaryConstraint: false }),
    client.models.Team.create({ name: 'DataAn', isPrimaryConstraint: false }),
    client.models.Team.create({ name: 'DataEn', isPrimaryConstraint: false }),
  ]);
  console.log('Created teams:', teams.map(t => t.data?.name));

  // Get team IDs for flow states
  const teamIds = teams.map(t => t.data!.id);
  const defaultStates = Object.fromEntries(
    teamIds.map(id => [id, 'NOT_STARTED'])
  );

  // Create sample initiatives
  const natwestId = themes[0].data!.id;
  await Promise.all([
    client.models.Initiative.create({
      name: 'Customer Portal Redesign',
      themeId: natwestId,
      notes: 'High priority for Q2',
      teamStates: JSON.stringify({
        ...defaultStates,
        [teamIds[0]]: 'READY',
        [teamIds[1]]: 'IN_FLIGHT',
      }),
    }),
    client.models.Initiative.create({
      name: 'API Modernization',
      themeId: natwestId,
      notes: 'Backend team dependency',
      teamStates: JSON.stringify(defaultStates),
    }),
  ]);

  console.log('Seed complete!');
}

seed().catch(console.error);
```

### Run Seed

```bash
npx tsx scripts/seed.ts
```

### Acceptance Criteria
- [ ] Themes, teams, and initiatives created
- [ ] Data visible in AppSync console queries
- [ ] Data visible in DynamoDB console

---

## Phase 2.7: Production Deployment

### Deploy to Production

```bash
# Deploy production backend
npx ampx pipeline-deploy --branch main
```

Or let Amplify Hosting auto-deploy on push to `main`.

### Verify Production

1. Open production URL
2. Open in two browser windows
3. Make changes in one window
4. Verify real-time sync to other window

### Acceptance Criteria
- [ ] Production deployment successful
- [ ] Real-time subscriptions working in production
- [ ] Custom domain + HTTPS working
- [ ] No console errors

---

## TypeScript Types for Frontend

Amplify generates types automatically. Frontend uses them like this:

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

// Query
const { data: initiatives } = await client.models.Initiative.list();

// Mutation
await client.models.Initiative.update({
  id: 'xxx',
  teamStates: JSON.stringify(newStates),
});

// Subscription
client.models.Initiative.onUpdate().subscribe({
  next: (data) => {
    console.log('Initiative updated:', data);
    // Update Zustand store here
  },
});
```

---

## Troubleshooting

### "Unauthorized" errors
- Check `authorizationModes` in schema
- Verify API key not expired
- Check `amplify_outputs.json` is up to date

### Subscriptions not receiving updates
- Verify subscription is active (no errors in console)
- Check mutation is using same authorization mode
- Try refreshing and resubscribing

### Sandbox issues
- Run `npx ampx sandbox delete` then `npx ampx sandbox` to reset
- Check AWS credentials are configured correctly

---

## Cost Monitoring

Set up AWS Budget alert:
1. AWS Console → Billing → Budgets
2. Create budget: $5/month threshold
3. Set email alert at 80%

For small team usage, expect $0-2/month.
