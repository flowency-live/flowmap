# FlowMap Product Requirements Document

> **Version**: 0.1.0
> **Last Updated**: 2026-04-19
> **Status**: Retrospective PRD (documenting current implementation)

---

## Executive Summary

FlowMap is a **portfolio flow intelligence system** for tracking cross-team delivery initiatives and identifying system bottlenecks. It provides real-time visibility into work flowing across multiple teams using 8 distinct flow states, enables constraint analysis to identify bottlenecks, and supports "what-if" simulation for capacity planning.

**Core Value Proposition**: See at a glance where work is blocked, which team is the constraint, and what happens if you add capacity.

---

## Table of Contents

1. [Architecture & Tech Stack](#1-architecture--tech-stack)
2. [Data Model](#2-data-model)
3. [Flow States](#3-flow-states)
4. [Pages & Features](#4-pages--features)
5. [Real-Time Collaboration](#5-real-time-collaboration)
6. [Metrics & Business Logic](#6-metrics--business-logic)
7. [User Workflows](#7-user-workflows)
8. [Incomplete Features & Known Gaps](#8-incomplete-features--known-gaps)
9. [Future Roadmap](#9-future-roadmap)

---

## 1. Architecture & Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI Framework |
| TypeScript | 5.6 | Type Safety (strict mode) |
| Vite | 6 | Build Tool |
| Tailwind CSS | 4 | Styling |
| Radix UI | - | Accessible Primitives |
| Zustand | 5 | State Management |
| Wouter | 3 | Routing |
| Framer Motion | 11 | Animations |
| Lucide React | 0.400 | Icons |
| date-fns | 4 | Date Handling (GB locale) |

### Backend (AWS Amplify Gen 2)
| Service | Purpose |
|---------|---------|
| AppSync GraphQL | API Layer (auto-generated from schema) |
| DynamoDB | Database (on-demand pricing) |
| WebSocket Subscriptions | Real-time Sync |
| CloudFront + S3 | Static Hosting |
| AWS CDK | Infrastructure as Code |
| Amplify Hosting | CI/CD Pipeline |

### Data Persistence Strategy
- **Optimistic UI**: Local state updates immediately on user action
- **Server Reconciliation**: Revert on mutation error
- **Real-time Sync**: WebSocket subscriptions for multi-user collaboration
- **JSON Fields**: Team states stored as JSON maps (no join tables)

---

## 2. Data Model

### 2.1 Theme
```typescript
interface Theme {
  id: string;
  name: string;
  faviconUrl?: string;
}
```
**Purpose**: Top-level portfolio grouping (currently single "Portfolio" theme in use)

### 2.2 Team
```typescript
interface Team {
  id: string;
  name: string;
  isPrimaryConstraint: boolean;
}
```
**Purpose**: Delivery teams that work on initiatives
**Examples**: UPJ, UIE, UNC, Logan, DataE, DataS

### 2.3 Initiative (Parent/Child Hierarchy)
```typescript
interface Initiative {
  id: string;
  name: string;
  themeId: string;
  parentId: string | null;           // null = parent, UUID = child
  order: number;                     // Sort order (lower = higher)
  faviconUrl?: string;               // Brand logo for parent initiatives
  liveDate?: string;                 // Go-live date (parent): "LIVE 29th June"
  dueDate?: string;                  // UAT date (child): "15th May"
  notes: string;                     // General notes
  sequencingNotes: string;           // Dependencies, blockers, timing
  teamStates: Record<string, FlowState>;   // Per-team flow state
  teamEfforts: Record<string, Effort>;     // Per-team effort estimate
  teamNotes: Record<string, string>;       // Per-team notes
}
```

**Hierarchy Rules**:
- Parent initiatives (`parentId = null`) represent high-level work streams
- Child initiatives (`parentId = UUID`) are decomposed work items
- Parent status **rolls up** from children using "worst-status-wins" logic
- Parents display aggregated state badges (read-only)
- Children are editable at the team level

### 2.4 Effort Estimates
```typescript
type Effort = '1d' | '3d' | '1w' | '2w' | '3w' | '4w' | '5w' | '6w' | '7w' | '8w' | '9w' | '10w';
```

> **Note**: Effort estimates are currently stored locally only and **not persisted to AppSync**. See [Known Gaps](#8-incomplete-features--known-gaps).

---

## 3. Flow States

FlowMap uses 8 distinct states to track work progress across teams:

| State | Display | Color | Meaning | Priority |
|-------|---------|-------|---------|----------|
| **Blocked** | BLOCKED | Red (#FECACA) | Cannot progress; external blocker | 1 (highest) |
| **Doing** | DOING | Blue (#DBEAFE) | Actively in progress | 2 |
| **Constrained** | CONSTRAINED | Purple (#E9D5FF) | Ready but team lacks capacity | 3 |
| **Ready** | READY | Lime (#ECFCCB) | Sized and waiting to start | 4 |
| **Discovery** | DISCOVERY | Yellow (#FEF3C7) | Exploratory; not yet sized | 5 |
| **Not Started** | NOT STARTED | Orange (#FFEDD5) | Known work; not started | 6 |
| **Done** | DONE | Green (#BBF7D0) | Complete | 7 |
| **N/A** | N/A | Grey (#F0F0F0) | Team has no work on this | 8 (lowest) |

### Rollup Algorithm
For parent initiatives, status per team = most urgent child state for that team.

```
Priority order: Blocked → Doing → Constrained → Ready → Discovery → N/S → Done → N/A
Return first state found in any child
```

---

## 4. Pages & Features

### 4.1 Portfolio Heatmap (`/`) — PRIMARY INTERFACE

**Status**: ✅ WORKING (Feature Complete)

**Purpose**: Cross-team visibility matrix showing all initiatives and their per-team states.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Portfolio Heatmap                              [Theme Filter ▼]         │
├─────────────────────────────────────────────────────────────────────────┤
│ [In Progress: 5] [Blocked: 2] [Waiting: 8] [Bottleneck: DataE (3)]     │
├─────────────────────────────────────────────────────────────────────────┤
│ LEGEND: [N/S] [DISCOVERY] [READY] [CONSTRAINED] [DOING] [DONE] [BLOCK] │
├────────────────────────────────────────────────────────┬────────────────┤
│ INITIATIVE          │ DATE      │ UPJ │ UIE │ DataE │+│ Initiative     │
├─────────────────────┼───────────┼─────┼─────┼───────┼─│ Detail Panel   │
│ > M&S Onboarding (6)│ LIVE 29 Ju│CONST│DOING│ READY │ │                │
│   └ API Integration │ 15th May  │DOING│DONE │ N/S   │ │ [Selected      │
│   └ Data Migration  │ 22nd May  │READY│DOING│CONST  │ │  Initiative    │
│ > NatWest (7)       │ LIVE 14 Ju│CONST│READY│ N/A   │ │  Details]      │
│ + Add initiative    │           │     │     │       │ │                │
└────────────────────────────────────────────────────────┴────────────────┘
```

**Key Features**:
- **KPI Cards**: In Progress, Blocked, Waiting, Bottleneck Team
- **Theme Filter**: Filter by portfolio theme
- **Expand/Collapse**: Show/hide child initiatives
- **Inline Add**: Add initiatives or child items
- **Inline Rename**: Edit names in-place
- **Date Picker**: Calendar for live/due dates
- **StatePicker**: Click cell to change state, effort, notes
- **Side Panel**: Detailed view of selected initiative
- **Brand Favicons**: Logo display next to parent initiatives

**Interactions**:
| Action | Trigger | Result |
|--------|---------|--------|
| Filter by theme | Theme dropdown | Table filters to theme |
| Add initiative | + row button | Inline input appears |
| Add child | + icon on parent row | Inline input indented |
| Rename | Pencil icon | Inline edit field |
| Delete | Trash icon | Confirm dialog |
| Change state | Click state cell | StatePicker popover |
| View details | Click row | Side panel updates |
| Edit date | Click date cell | Calendar popover |

---

### 4.2 Constraint Lens (`/constraint`) — BOTTLENECK ANALYSIS

**Status**: ⚠️ WORKING (Needs Enhancement)

**Purpose**: Identify which team is blocking the most work and prioritize unblocking.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Constraint Lens                           [Team: DataE ▼]               │
├─────────────────────────────────────────────────────────────────────────┤
│ [Directly Blocked: 3]              [Downstream Effect: 12 team-slices] │
├─────────────────────────────────────────────────────────────────────────┤
│ Queue at the Constraint (ranked by startability)                        │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ #1 Customer Dashboard                              [N/S] 72%  ████│  │
│ │ #2 API Gateway                                     [N/S] 65%  ███ │  │
│ │ #3 Data Pipeline                                   [CONST] 45%  ██│  │
│ └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Metrics**:
- **Directly Blocked**: Initiatives where selected team is N/S/Constrained while others are engaged
- **Downstream Effect**: Count of "Ready" states waiting because constraint is blocking
- **Startability Score**: % of required teams that are engaged (higher = closer to start)

**Current Limitations**:
- Queue ranking logic could be more sophisticated
- No historical trend analysis
- No capacity modeling

---

### 4.3 Unlock Simulator (`/simulator`) — WHAT-IF ANALYSIS

**Status**: ⚠️ WORKING (Basic Scenarios Only)

**Purpose**: Model impact of adding capacity to constraint team.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Unlock Simulator                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Scenario Parameters                                                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐│
│ │ Action: Add Pod │ │ Team: DataE     │ │ Initiative: Customer Dash  ││
│ └─────────────────┘ └─────────────────┘ └─────────────────────────────┘│
│                                         [Run Simulation]                │
├─────────────────────────────────────────────────────────────────────────┤
│ Results                                                                 │
│ ┌───────────────────────────┐  ┌───────────────────────────┐           │
│ │ BEFORE                    │  │ AFTER                     │           │
│ │ Blocked: 8                │  │ Blocked: 7                │           │
│ │ Startability: 72%         │  │ Startability: 100%        │           │
│ └───────────────────────────┘  └───────────────────────────┘           │
│ Improvement: +28 percentage points                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Current Limitations**:
- Action type (Add Pod/Outsource/Reallocate) is cosmetic only
- Only simulates single initiative at a time
- No effort/duration modeling
- No cost analysis
- No timeline projection

---

### 4.4 Team Kanban (`/team/:teamId`) — TEAM WORKLOAD VIEW

**Status**: ✅ WORKING (Feature Complete)

**Purpose**: Workflow board showing one team's work across all states.

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Heatmap                    UPJ Workload (12 items)            │
├─────────────────────────────────────────────────────────────────────────┤
│ INITIATIVE     │ N/S │ DISC │ READY │ CONST │ DOING │ DONE │ BLOCKED   │
├────────────────┼─────┼──────┼───────┼───────┼───────┼──────┼───────────┤
│ > M&S Theme    │     │      │       │       │       │      │           │
│   > Onboarding │     │      │       │       │       │      │           │
│     └ API Int  │     │      │       │       │[DOING]│      │           │
│     └ Data Mig │     │      │[READY]│       │       │      │           │
│ > NatWest      │     │      │       │       │       │      │           │
│   └ Portal     │[N/S]│      │       │       │       │      │           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Features**:
- Shows only initiatives where team has non-N/A state
- Grouped by theme and parent/child hierarchy
- State badges appear in matching column
- Click state badge to change (moves to new column)
- Collapsible themes and parents

---

### 4.5 Configuration (`/config`) — BRANDING SETTINGS

**Status**: ✅ WORKING (Favicon Management Only)

**Purpose**: Manage initiative branding and settings.

**Current Features**:
- Edit favicon URLs for parent initiatives
- Preview favicon images
- Help text for finding favicon URLs

**Future Expansion**:
- Theme management
- Team settings
- Export/Import
- User preferences

---

## 5. Real-Time Collaboration

### WebSocket Subscriptions

FlowMap subscribes to all CRUD events on mount:

| Model | Events | Handler |
|-------|--------|---------|
| Initiative | onCreate, onUpdate, onDelete | `_applyInitiativeUpdate/Delete` |
| Team | onCreate, onUpdate, onDelete | `_applyTeamUpdate/Delete` |
| Theme | onCreate, onUpdate, onDelete | `_applyThemeUpdate/Delete` |

### Multi-User Scenarios

**User A changes state → User B sees update**:
1. User A clicks cell, selects "Doing"
2. Local state updates immediately (optimistic)
3. Mutation sent to AppSync
4. AppSync persists to DynamoDB
5. WebSocket broadcasts `Initiative.onUpdate`
6. User B's client receives subscription event
7. User B's local state updated
8. User B's UI re-renders with new state

### Cascade Behaviors

| Action | Cascade |
|--------|---------|
| Delete Parent Initiative | All children deleted |
| Delete Team | Team removed from all initiatives' teamStates |
| Add Team | All initiatives get new team with "N/S" state |
| Delete Theme | All initiatives in theme deleted |

---

## 6. Metrics & Business Logic

### KPI Calculations

| Metric | Formula | Purpose |
|--------|---------|---------|
| **In Progress** | Count where ANY team = "Doing" | Activity signal |
| **Blocked** | Count where ANY team = "Blocked" | Risk signal |
| **Waiting** | Count with Ready/Constrained AND NO Doing | Ready to start |
| **Bottleneck Team** | Team blocking most work | Primary constraint |

### Startability Score

```
Startability = (engaged_teams / required_teams) × 100

Where:
- required_teams = teams where state ≠ N/A
- engaged_teams = teams in [Discovery, Ready, Constrained, Doing, Done]
```

**Use Cases**:
- Constraint Lens queue ranking (higher = more ready)
- Simulator impact calculation

### Rollup State

For parent initiatives, compute aggregate state per team from children:

```
1. Iterate priority order: Blocked → Doing → Constrained → Ready → Discovery → N/S → Done → N/A
2. Return first state found in any child for that team
3. Fallback to N/A if all children are N/A
```

---

## 7. User Workflows

### Workflow 1: Daily Standup Review
1. Open Portfolio Heatmap
2. Review KPI cards for blocked items
3. Expand each parent to see child status
4. Click Bottleneck team → navigates to Team Kanban
5. Review team's workload distribution
6. Identify items ready to start

### Workflow 2: Unblock Analysis
1. Navigate to Constraint Lens
2. Select primary constraint team
3. Review queue ranked by startability
4. Click top item to view details
5. Read notes/sequencing notes for blockers
6. Coordinate with team to unblock

### Workflow 3: Capacity Planning
1. Navigate to Unlock Simulator
2. Select constraint team and blocked initiative
3. Run simulation
4. Review before/after impact
5. Present to leadership for resource decision

### Workflow 4: Adding New Work
1. On Heatmap, click "+ Add initiative"
2. Enter name and confirm
3. New parent appears with all teams at "N/S"
4. Click "+" on parent row to add children
5. Set dates using calendar picker
6. Update team states as work progresses

---

## 8. Incomplete Features & Known Gaps

### Critical Gaps

| Gap | Current State | Impact | Priority |
|-----|---------------|--------|----------|
| **Effort Persistence** | Local only, not saved to AppSync | Lost on refresh | HIGH |
| **Toast Notifications** | Errors logged to console only | Users don't see failures | HIGH |
| **Constraint Lens Intelligence** | Basic queue ranking | Limited insight | MEDIUM |
| **Simulator Depth** | Single initiative, no timeline | Basic scenarios only | MEDIUM |

### Missing Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Authentication** | Currently public API key (no user auth) | HIGH |
| **Audit Trail** | No change history or "who changed what" | MEDIUM |
| **Export/Import** | No CSV/JSON export capability | MEDIUM |
| **Search/Filter** | Theme filter only; no text search | MEDIUM |
| **Undo/Redo** | No action history | LOW |
| **Bulk Operations** | Edit one item at a time only | LOW |
| **Offline Support** | Requires live connection | LOW |

### Constraint Lens Enhancements Needed

1. **Better Queue Ranking**: Consider effort, dependencies, business value
2. **Trend Analysis**: Show if bottleneck is improving/worsening
3. **Capacity Modeling**: What % of team capacity is allocated
4. **Dependency Visualization**: Show which items depend on which teams

### Simulator Enhancements Needed

1. **Timeline Projection**: "If we unblock X, delivery moves from Y to Z"
2. **Effort Aggregation**: Sum effort across teams for total initiative cost
3. **Multiple Scenarios**: Compare adding pod vs outsourcing vs waiting
4. **Cost Analysis**: $/effort modeling for ROI calculation
5. **Portfolio Impact**: Show ripple effects across multiple initiatives

---

## 9. Future Roadmap

### Phase 2: Data Completeness
- [ ] Persist effort estimates to AppSync
- [ ] Add toast notifications for user feedback
- [ ] Implement audit trail (createdAt, updatedAt, createdBy)
- [ ] Add user authentication (Cognito)

### Phase 3: Enhanced Analytics
- [ ] Constraint Lens improvements (trends, capacity)
- [ ] Simulator enhancements (timeline, cost, multi-scenario)
- [ ] Export to CSV/PDF
- [ ] Search and advanced filtering

### Phase 4: Automation & Integration
- [ ] Workflow rules (auto-transition states)
- [ ] External integrations (JIRA, Azure DevOps)
- [ ] Slack/Teams notifications
- [ ] API for external tooling

---

## Appendix A: State Transition Rules (Proposed)

Currently any state can transition to any other state. Future implementation could enforce:

```
N/A → N/S (work identified)
N/S → Discovery (exploration started)
Discovery → Ready (sizing complete)
Ready → Constrained (capacity issue)
Ready → Doing (work started)
Constrained → Doing (capacity resolved)
Doing → Done (work complete)
Doing → Blocked (external dependency)
Blocked → Doing (unblocked)
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Initiative** | A work item tracked across teams |
| **Parent Initiative** | Top-level initiative that can contain children |
| **Child Initiative** | Decomposed work item under a parent |
| **Theme** | Portfolio grouping for initiatives |
| **Flow State** | Current status of work for a specific team |
| **Rollup** | Aggregated parent status from children |
| **Startability** | % of required teams engaged (ready to start) |
| **Constraint Team** | Team blocking the most work |
| **Optimistic Update** | UI updates before server confirms |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2026-04-19 | Generated | Initial retrospective PRD |

