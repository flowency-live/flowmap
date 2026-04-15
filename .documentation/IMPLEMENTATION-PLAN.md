# FlowMap Constraint-Lens: Full Implementation Plan

## Executive Summary

**Product:** Portfolio Flow Intelligence System for tracking software delivery initiatives across teams, visualizing constraints, and running scenario simulations.

**Core Goal:** Real-time collaborative scenario mapping - UI updates dynamically as changes occur across all connected clients.

**Architecture:** React SPA on Amplify + AppSync GraphQL + DynamoDB (~$0-5/month)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Amplify Hosting                        │
│                 (React SPA + Custom Domain + HTTPS)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AWS AppSync                              │
│              (GraphQL API + Real-time Subscriptions)            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DynamoDB                                │
│                    (Single Table Design)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Real-Time Flow (AppSync Subscriptions)

```
User A runs mutation   ──►  AppSync  ──►  DynamoDB (save)
                               │
                               ▼
                        Subscription triggered
                               │
                               ▼
User B, C, D receive   ◄──  GraphQL subscription pushes update
```

**Key Benefit:** No backend code for real-time - AppSync handles subscriptions automatically.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + Vite + TypeScript | Modern, fast, matches Replit reference |
| Styling | Tailwind CSS 4 + Radix UI | Match existing UI exactly |
| State | Zustand + AWS Amplify Client | Simple state + auto-generated GraphQL hooks |
| API | AWS AppSync (GraphQL) | Managed API with built-in subscriptions |
| Real-time | AppSync Subscriptions | Zero backend code for real-time |
| Database | DynamoDB | Serverless, pay-per-request, scales to zero |
| Hosting | AWS Amplify Hosting | CI/CD built-in, custom domain, HTTPS |
| IaC | CDK or Amplify CLI | Automated deployment |
| Testing | Vitest + Testing Library + Playwright | TDD workflow |

### Why This Stack?
- **No backend code:** AppSync + DynamoDB = fully managed
- **Real-time built-in:** Subscriptions work automatically on mutations
- **Pay-per-request:** $0 when not used, scales automatically
- **AWS-native:** Fits your existing infrastructure

---

## Data Model

### DynamoDB Single Table Design

| PK | SK | Type | Attributes |
|----|-----|------|------------|
| `THEME#<id>` | `METADATA` | Theme | name, createdAt |
| `TEAM#<id>` | `METADATA` | Team | name, isPrimaryConstraint, createdAt |
| `INIT#<id>` | `METADATA` | Initiative | name, themeId, parentId, notes, sequencingNotes, createdAt |
| `INIT#<id>` | `STATE#<teamId>` | FlowState | state, updatedAt |

**GSI1 (Query by Theme):**
| GSI1PK | GSI1SK | Use |
|--------|--------|-----|
| `THEME#<themeId>` | `INIT#<id>` | Get all initiatives for a theme |

**GSI2 (Query by Team):**
| GSI2PK | GSI2SK | Use |
|--------|--------|-----|
| `TEAM#<teamId>` | `INIT#<id>` | Get all initiatives with states for a team |

### GraphQL Schema (AppSync)

```graphql
type Theme @model {
  id: ID!
  name: String!
  initiatives: [Initiative] @hasMany
}

type Team @model {
  id: ID!
  name: String!
  isPrimaryConstraint: Boolean!
}

type Initiative @model {
  id: ID!
  name: String!
  themeId: ID!
  theme: Theme @belongsTo
  parentId: ID
  notes: String
  sequencingNotes: String
  teamStates: [FlowStateEntry!]!
}

type FlowStateEntry {
  teamId: ID!
  state: FlowState!
  updatedAt: AWSDateTime!
}

enum FlowState {
  NOT_STARTED
  IN_DISCOVERY
  READY
  IN_FLIGHT
  UAT
  DONE
  NA
}

type Mutation {
  updateFlowState(initiativeId: ID!, teamId: ID!, state: FlowState!): Initiative
  createInitiative(input: CreateInitiativeInput!): Initiative
  updateInitiative(input: UpdateInitiativeInput!): Initiative
  deleteInitiative(id: ID!): Initiative
  createTheme(name: String!): Theme
  deleteTheme(id: ID!): Theme
  createTeam(name: String!, isPrimaryConstraint: Boolean): Team
  deleteTeam(id: ID!): Team
}

type Subscription {
  onUpdateFlowState: Initiative @aws_subscribe(mutations: ["updateFlowState"])
  onCreateInitiative: Initiative @aws_subscribe(mutations: ["createInitiative"])
  onUpdateInitiative: Initiative @aws_subscribe(mutations: ["updateInitiative"])
  onDeleteInitiative: Initiative @aws_subscribe(mutations: ["deleteInitiative"])
  onCreateTheme: Theme @aws_subscribe(mutations: ["createTheme"])
  onDeleteTheme: Theme @aws_subscribe(mutations: ["deleteTheme"])
  onCreateTeam: Team @aws_subscribe(mutations: ["createTeam"])
  onDeleteTeam: Team @aws_subscribe(mutations: ["deleteTeam"])
}
```

**Real-time works automatically:** When any mutation runs, subscribed clients receive updates.

### TypeScript Types (Shared)

```typescript
// packages/shared/src/types.ts

export type FlowState =
  | 'NOT_STARTED'
  | 'IN_DISCOVERY'
  | 'READY'
  | 'IN_FLIGHT'
  | 'UAT'
  | 'DONE'
  | 'NA';

export interface Theme {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  isPrimaryConstraint: boolean;
}

export interface Initiative {
  id: string;
  name: string;
  themeId: string;
  parentId: string | null;
  notes: string;
  sequencingNotes: string;
  teamStates: Record<string, FlowState>; // teamId -> state
}

export interface PortfolioState {
  themes: Theme[];
  teams: Team[];
  initiatives: Initiative[];
}

// WebSocket Events
export type ServerEvent =
  | { type: 'PORTFOLIO_SYNC'; payload: PortfolioState }
  | { type: 'INITIATIVE_UPDATED'; payload: Initiative }
  | { type: 'INITIATIVE_CREATED'; payload: Initiative }
  | { type: 'INITIATIVE_DELETED'; payload: { id: string } }
  | { type: 'FLOW_STATE_CHANGED'; payload: { initiativeId: string; teamId: string; state: FlowState } }
  | { type: 'THEME_UPDATED'; payload: Theme }
  | { type: 'TEAM_UPDATED'; payload: Team };

export type ClientEvent =
  | { type: 'UPDATE_FLOW_STATE'; payload: { initiativeId: string; teamId: string; state: FlowState } }
  | { type: 'CREATE_INITIATIVE'; payload: Omit<Initiative, 'id' | 'teamStates'> }
  | { type: 'UPDATE_INITIATIVE'; payload: Partial<Initiative> & { id: string } }
  | { type: 'DELETE_INITIATIVE'; payload: { id: string } }
  | { type: 'CREATE_THEME'; payload: { name: string } }
  | { type: 'DELETE_THEME'; payload: { id: string } }
  | { type: 'CREATE_TEAM'; payload: { name: string } }
  | { type: 'DELETE_TEAM'; payload: { id: string } };
```

---

## Project Structure

```
flowmap/
├── src/                               # WORKSTREAM 1: Frontend
│   ├── components/
│   │   ├── ui/                        # Radix primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Popover.tsx
│   │   │   └── Toast.tsx
│   │   ├── StateBadge.tsx             # Color-coded state indicator
│   │   ├── StatePicker.tsx            # Dropdown state selector
│   │   ├── InitiativeRow.tsx          # Heatmap row component
│   │   ├── InitiativeDetail.tsx       # Side sheet
│   │   ├── KpiCard.tsx                # Metric display card
│   │   ├── ThemeGroup.tsx             # Collapsible theme section
│   │   └── Sidebar.tsx                # Navigation
│   ├── pages/
│   │   ├── Heatmap.tsx                # Main portfolio view
│   │   ├── ConstraintLens.tsx         # Bottleneck analysis
│   │   └── Simulator.tsx              # What-if scenarios
│   ├── stores/
│   │   └── portfolioStore.ts          # Zustand store with subscriptions
│   ├── hooks/
│   │   ├── useSubscriptions.ts        # AppSync subscription setup
│   │   └── useMetrics.ts              # Calculated metrics
│   ├── graphql/                       # Generated + custom queries
│   │   ├── queries.ts                 # Auto-generated by Amplify
│   │   ├── mutations.ts
│   │   └── subscriptions.ts
│   ├── lib/
│   │   ├── metrics.ts                 # Business logic calculations
│   │   ├── amplify.ts                 # Amplify client config
│   │   └── utils.ts                   # Helpers
│   ├── App.tsx
│   └── main.tsx
│
├── amplify/                           # WORKSTREAM 2: Backend (AppSync + DynamoDB)
│   ├── data/
│   │   └── resource.ts                # GraphQL schema + resolvers
│   ├── backend.ts                     # Amplify backend definition
│   └── tsconfig.json
│
├── __tests__/                         # Tests
│   ├── components/
│   ├── pages/
│   └── lib/
│
├── amplify.yml                        # Amplify CI/CD config
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .documentation/
    └── IMPLEMENTATION-PLAN.md
```

**Simplified:** No separate backend folder - AppSync is configured declaratively in `amplify/`.

---

## Workstream Definitions

### WORKSTREAM 1: Frontend (UI + Real-time Client)

**Owner:** Agent 1
**Dependencies:** GraphQL types from Amplify codegen
**Can start:** Immediately with mock data

#### Phase 1.1: Project Setup
- [ ] Initialize Vite + React 19 + TypeScript
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind CSS 4 with custom theme variables
- [ ] Install and configure Radix UI primitives
- [ ] Configure Vitest + Testing Library
- [ ] Install Amplify client libraries (`aws-amplify`, `@aws-amplify/ui-react`)
- [ ] Set up Zustand store with mock data

#### Phase 1.2: Core UI Components (TDD)
- [ ] **StateBadge** - Color-coded flow state indicator
  - Test: renders correct color for each state
  - Test: displays correct label
- [ ] **StatePicker** - Dropdown for state changes
  - Test: opens dropdown on click
  - Test: calls onChange with selected state
  - Test: shows current state as selected
- [ ] **KpiCard** - Metric display card
  - Test: renders title and value
  - Test: shows trend indicator if provided
- [ ] **InitiativeRow** - Table row for heatmap
  - Test: renders initiative name
  - Test: renders state badge for each team
  - Test: handles inline edit mode

#### Phase 1.3: Layout Components
- [ ] **Sidebar** - Fixed navigation with 3 routes
  - Test: highlights active route
  - Test: navigates on click
- [ ] **ThemeGroup** - Collapsible theme section
  - Test: toggles collapse state
  - Test: renders child initiatives
- [ ] **InitiativeDetail** - Side sheet panel
  - Test: displays initiative details
  - Test: allows editing notes
  - Test: closes on backdrop click

#### Phase 1.4: Heatmap Page (Most Complex)
Reference: `Constraint-Lens/artifacts/flowmap/src/pages/heatmap.tsx`

- [ ] **Layout** - KPI cards row + filter bar + matrix table
- [ ] **Matrix Header** - Team names as columns
- [ ] **Theme Sections** - Grouped by theme, collapsible
- [ ] **Initiative Rows** - With inline CRUD
- [ ] **Add Initiative** - Inline form at bottom of theme
- [ ] **Add Theme** - Button to create new theme
- [ ] **Add Team** - Button to add column

#### Phase 1.5: Constraint Lens Page
Reference: `Constraint-Lens/artifacts/flowmap/src/pages/constraint.tsx`

- [ ] **Team Selector** - Focus on specific constraint team
- [ ] **Blocked Count** - Initiatives blocked by selected team
- [ ] **Queue View** - Ranked list by startability score
- [ ] **Downstream Impact** - Teams waiting in READY state

#### Phase 1.6: Simulator Page
Reference: `Constraint-Lens/artifacts/flowmap/src/pages/simulator.tsx`

- [ ] **Scenario Type Selector** - Add Pod / Outsource / Reallocate
- [ ] **Target Team Selector**
- [ ] **Before/After Comparison** - Side by side metrics
- [ ] **Impact Narrative** - Text explanation of changes

#### Phase 1.7: Real-time Integration
- [ ] **Amplify Client Setup** - Configure with Amplify outputs
- [ ] **Subscriptions** - Subscribe to mutations (onUpdateFlowState, etc.)
- [ ] **Zustand Integration** - Update store on subscription events
- [ ] **Optimistic Updates** - Update UI immediately, rollback on error
- [ ] **Connection Status** - Show connected/disconnected indicator

#### Phase 1.8: Polish & Animation
- [ ] **Framer Motion** - Page transitions
- [ ] **State Change Animation** - Badge color transitions
- [ ] **Toast Notifications** - Success/error feedback
- [ ] **Loading States** - Skeleton loaders

---

### WORKSTREAM 2: Backend (AppSync + DynamoDB + Amplify)

**Owner:** Agent 2
**Dependencies:** None
**Can start:** Immediately

#### Phase 2.1: Amplify Setup
- [ ] Initialize Amplify Gen 2 project (`npm create amplify@latest`)
- [ ] Configure AWS credentials
- [ ] Set up sandbox environment for development

#### Phase 2.2: GraphQL Schema & Data Model
- [ ] Define data models in `amplify/data/resource.ts`:
  - Theme model
  - Team model
  - Initiative model with nested teamStates
- [ ] Configure authorization rules (public for MVP)
- [ ] Run `npx ampx sandbox` to deploy dev backend

#### Phase 2.3: Custom Resolvers (if needed)
- [ ] **updateFlowState** - Custom resolver to update nested teamStates
- [ ] Test mutations via AppSync console

#### Phase 2.4: Subscriptions Configuration
- [ ] Verify subscriptions auto-generated for all mutations
- [ ] Test subscriptions in AppSync console (open 2 tabs, mutate in one)

#### Phase 2.5: Amplify Hosting Setup
- [ ] Configure `amplify.yml` for Vite build
- [ ] Connect to Git repository
- [ ] Set up custom domain (if ready)
- [ ] Configure environment variables

#### Phase 2.6: Seed Data
- [ ] Create seed script using Amplify client
- [ ] Seed themes: NatWest, M&S, LBG, Aviva
- [ ] Seed teams: UPJ, UPC, Ember, Logan, DataAn, DataEn
- [ ] Seed sample initiatives with flow states

#### Phase 2.7: Production Deployment
- [ ] Deploy to production branch
- [ ] Verify custom domain + HTTPS working
- [ ] Test real-time across multiple clients

---

## Shared Package (Both Workstreams)

Created first, used by both:

```typescript
// packages/shared/src/types.ts - Full type definitions
// packages/shared/src/events.ts - WebSocket event types
// packages/shared/src/validation.ts - Zod schemas for runtime validation
```

---

## Integration Points

### Contract: WebSocket Events

Both workstreams implement against this contract:

```typescript
// Client -> Server
socket.emit('event', { type: 'UPDATE_FLOW_STATE', payload: {...} });

// Server -> All Clients
socket.broadcast.emit('event', { type: 'FLOW_STATE_CHANGED', payload: {...} });
```

### Contract: Initial Data Load

```typescript
// GET /api/portfolio
Response: PortfolioState
```

### Integration Testing (After Both Complete)

- [ ] Frontend connects to real backend
- [ ] State changes propagate to all clients
- [ ] Reconnection restores state
- [ ] Concurrent edits handled correctly

---

## Implementation Order

### Week 1: Foundation (Parallel)

| Day | Workstream 1 (Frontend) | Workstream 2 (Backend) |
|-----|------------------------|------------------------|
| 1 | Project setup, Tailwind, Radix | Amplify init, sandbox |
| 2 | Shared types, Zustand with mock | Database schema, migrations |
| 3 | StateBadge, StatePicker (TDD) | Domain entities (TDD) |
| 4 | KpiCard, InitiativeRow (TDD) | Repositories (TDD) |
| 5 | Sidebar, ThemeGroup (TDD) | Use cases (TDD) |

### Week 2: Core Features (Parallel)

| Day | Workstream 1 (Frontend) | Workstream 2 (Backend) |
|-----|------------------------|------------------------|
| 6 | Heatmap page layout | WebSocket handlers |
| 7 | Heatmap inline CRUD | Event broadcasting |
| 8 | Constraint Lens page | CDK infrastructure |
| 9 | Simulator page | Seed data |
| 10 | Socket client integration | Integration testing |

### Week 3: Integration & Polish

| Day | Both Workstreams |
|-----|------------------|
| 11 | Connect frontend to backend |
| 12 | Real-time testing with multiple clients |
| 13 | E2E tests with Playwright |
| 14 | Bug fixes, polish, animation |
| 15 | Production deployment |

---

## Verification Plan

### Unit Tests (Per Workstream)
```bash
# Frontend
cd packages/frontend && pnpm test

# Backend
cd packages/backend && pnpm test
```

### Integration Tests
```bash
# Start backend
cd packages/backend && pnpm start

# Run integration tests
cd packages/frontend && pnpm test:integration
```

### E2E Tests
```bash
# Start both services
pnpm dev

# Run Playwright
pnpm test:e2e
```

### Manual Testing Checklist
- [ ] Open app in 2 browsers side by side
- [ ] Change flow state in browser A
- [ ] Verify change appears instantly in browser B
- [ ] Add initiative in browser A
- [ ] Verify it appears in browser B
- [ ] Disconnect browser A's network
- [ ] Reconnect and verify state syncs
- [ ] Compare UI with Replit reference side-by-side

---

## Estimated Costs (Monthly)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| Amplify Hosting | 1000 build mins, 15GB served | ~$0.01/min, $0.15/GB |
| AppSync | 250K queries/month | $4/million queries |
| DynamoDB | 25GB storage, 25 WCU/RCU | Pay per request |
| Route 53 | - | $0.50/hosted zone |
| **Estimated Total** | **$0-1/month** | **$2-5/month** |

**For small team (5-20 users):** Likely stays within free tier = **$0/month**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| WebSocket connection drops | AppSync auto-reconnect + re-subscribe on reconnect |
| Concurrent edit conflicts | Last-write-wins with timestamp + toast notification |
| AppSync quota exceeded | Generous free tier; set up billing alerts |
| Data corruption | DynamoDB point-in-time recovery enabled |

---

## Future Enhancements (Post-MVP)

1. **Dependency Mapping** - Visual graph of initiative dependencies
2. **Timeline View** - Gantt-style date visualization
3. **Authentication** - Cognito integration when team grows
4. **Audit Log** - Track who changed what and when
5. **Export** - CSV/PDF export of portfolio data
6. **Multiple Portfolios** - Separate workspaces for different programs
