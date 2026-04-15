# Workstream 1: Frontend (UI + Real-time Client)

## Overview

Recreate the FlowMap UI from the Replit reference with real-time WebSocket integration.

**Reference Codebase:** `C:\VSProjects\_Websites\FlowMap\Constraint-Lens\artifacts\flowmap\`

**Independence:** This workstream can proceed with mock data and a mock WebSocket until backend is ready.

---

## Phase 1.1: Project Setup

### Tasks

```bash
# Initialize project
cd C:\VSProjects\_Websites\FlowMap
mkdir -p packages/frontend
cd packages/frontend

# Create Vite project
pnpm create vite@latest . --template react-ts

# Install dependencies
pnpm add react@19 react-dom@19
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-toast @radix-ui/react-tooltip
pnpm add tailwindcss@4 @tailwindcss/vite
pnpm add wouter zustand socket.io-client
pnpm add framer-motion lucide-react
pnpm add zod
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
pnpm add -D typescript @types/react @types/react-dom
```

### Configuration Files

**vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

**tsconfig.json** - Enable strict mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### Acceptance Criteria
- [ ] `pnpm dev` starts Vite dev server
- [ ] `pnpm test` runs Vitest
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS working with sample component

---

## Phase 1.2: Core UI Components (TDD)

### Component: StateBadge

**Reference:** `Constraint-Lens/artifacts/flowmap/src/components/StateBadge.tsx`

**Test First:** `src/__tests__/components/StateBadge.test.tsx`
```typescript
import { render, screen } from '@testing-library/react';
import { StateBadge } from '@/components/StateBadge';

describe('StateBadge', () => {
  it('renders NOT_STARTED with gray background', () => {
    render(<StateBadge state="NOT_STARTED" />);
    const badge = screen.getByText('Not Started');
    expect(badge).toHaveClass('bg-gray-200');
  });

  it('renders IN_FLIGHT with blue background', () => {
    render(<StateBadge state="IN_FLIGHT" />);
    const badge = screen.getByText('In Flight');
    expect(badge).toHaveClass('bg-blue-500');
  });

  it('renders DONE with green background', () => {
    render(<StateBadge state="DONE" />);
    const badge = screen.getByText('Done');
    expect(badge).toHaveClass('bg-green-500');
  });

  // Test all 7 states...
});
```

**Implementation:** `src/components/StateBadge.tsx`
```typescript
import { FlowState } from '@flowmap/shared';
import { cn } from '@/lib/utils';

const stateConfig: Record<FlowState, { label: string; className: string }> = {
  NOT_STARTED: { label: 'Not Started', className: 'bg-gray-200 text-gray-700' },
  IN_DISCOVERY: { label: 'Discovery', className: 'bg-purple-500 text-white' },
  READY: { label: 'Ready', className: 'bg-yellow-500 text-black' },
  IN_FLIGHT: { label: 'In Flight', className: 'bg-blue-500 text-white' },
  UAT: { label: 'UAT', className: 'bg-orange-500 text-white' },
  DONE: { label: 'Done', className: 'bg-green-500 text-white' },
  NA: { label: 'N/A', className: 'bg-gray-100 text-gray-400' },
};

export function StateBadge({ state }: { state: FlowState }) {
  const config = stateConfig[state];
  return (
    <span className={cn('px-2 py-1 rounded text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
```

### Component: StatePicker

**Test First:** `src/__tests__/components/StatePicker.test.tsx`
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { StatePicker } from '@/components/StatePicker';
import { vi } from 'vitest';

describe('StatePicker', () => {
  it('displays current state', () => {
    render(<StatePicker value="READY" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Ready');
  });

  it('calls onChange when state selected', async () => {
    const onChange = vi.fn();
    render(<StatePicker value="NOT_STARTED" onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('In Flight'));

    expect(onChange).toHaveBeenCalledWith('IN_FLIGHT');
  });

  it('shows all 7 state options', () => {
    render(<StatePicker value="NOT_STARTED" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('In Flight')).toBeInTheDocument();
    expect(screen.getByText('UAT')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
```

### Component: KpiCard

**Test First:** `src/__tests__/components/KpiCard.test.tsx`
```typescript
describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Total Initiatives" value={42} />);
    expect(screen.getByText('Total Initiatives')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with optional subtitle', () => {
    render(<KpiCard title="Blocked" value={5} subtitle="By UPJ team" />);
    expect(screen.getByText('By UPJ team')).toBeInTheDocument();
  });
});
```

### Component: InitiativeRow

**Test First:** `src/__tests__/components/InitiativeRow.test.tsx`
```typescript
describe('InitiativeRow', () => {
  const mockInitiative = {
    id: '1',
    name: 'Test Initiative',
    themeId: 'theme-1',
    parentId: null,
    notes: '',
    sequencingNotes: '',
    teamStates: {
      'team-1': 'READY',
      'team-2': 'IN_FLIGHT',
    },
  };
  const mockTeams = [
    { id: 'team-1', name: 'UPJ' },
    { id: 'team-2', name: 'UPC' },
  ];

  it('renders initiative name', () => {
    render(<InitiativeRow initiative={mockInitiative} teams={mockTeams} />);
    expect(screen.getByText('Test Initiative')).toBeInTheDocument();
  });

  it('renders state picker for each team', () => {
    render(<InitiativeRow initiative={mockInitiative} teams={mockTeams} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  it('calls onStateChange when state picker changed', () => {
    const onStateChange = vi.fn();
    render(
      <InitiativeRow
        initiative={mockInitiative}
        teams={mockTeams}
        onStateChange={onStateChange}
      />
    );

    // Change first team's state
    fireEvent.click(screen.getAllByRole('combobox')[0]);
    fireEvent.click(screen.getByText('Done'));

    expect(onStateChange).toHaveBeenCalledWith('1', 'team-1', 'DONE');
  });
});
```

---

## Phase 1.3: Layout Components

### Sidebar

**Reference:** `Constraint-Lens/artifacts/flowmap/src/components/Sidebar.tsx`

```typescript
// Test: highlights active route
// Test: navigates on click
// Implementation using wouter for routing
```

### ThemeGroup

**Reference:** Collapsible sections in heatmap.tsx

```typescript
// Test: toggles collapse state on header click
// Test: renders child initiatives when expanded
// Test: hides children when collapsed
```

### InitiativeDetail

**Reference:** `Constraint-Lens/artifacts/flowmap/src/components/InitiativeDetail.tsx`

```typescript
// Test: displays initiative name, notes, sequencing notes
// Test: allows editing notes (controlled input)
// Test: calls onSave when save button clicked
// Test: closes when backdrop clicked
```

---

## Phase 1.4: Heatmap Page

**Reference:** `Constraint-Lens/artifacts/flowmap/src/pages/heatmap.tsx` (673 lines)

### Layout Structure
```
┌─────────────────────────────────────────────────────┐
│  KPI Cards Row                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Total   │ │ Blocked │ │ Ready   │ │ Const.  │   │
│  │ 12      │ │ 3       │ │ 5       │ │ 45%     │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├─────────────────────────────────────────────────────┤
│  Filter: [Theme Dropdown] [+ Add Theme] [+ Add Team]│
├─────────────────────────────────────────────────────┤
│  │ Initiative    │ UPJ │ UPC │ Ember │ Logan │ ... │
│  ├───────────────┼─────┼─────┼───────┼───────┼─────┤
│  │ ▼ Theme: NatWest                                 │
│  │   Initiative 1 │ ● R │ ● F │  ● D  │  ● -  │     │
│  │   Initiative 2 │ ● - │ ● R │  ● F  │  ● D  │     │
│  │   [+ Add Initiative]                             │
│  │ ▼ Theme: M&S                                     │
│  │   ...                                            │
└─────────────────────────────────────────────────────┘
```

### Key Features to Implement
1. **KPI Row** - 4 cards showing key metrics
2. **Team Headers** - Column headers with team names
3. **Theme Groups** - Collapsible sections
4. **Initiative Rows** - Name + state picker per team
5. **Inline Add** - Add initiative within theme
6. **Parent/Child** - Nested initiatives (indented)

### Test Cases
```typescript
describe('HeatmapPage', () => {
  it('renders KPI cards with calculated metrics', () => {});
  it('groups initiatives by theme', () => {});
  it('collapses theme section on header click', () => {});
  it('shows add initiative form when + clicked', () => {});
  it('calls store action when state changed', () => {});
  it('opens detail panel when initiative name clicked', () => {});
});
```

---

## Phase 1.5: Constraint Lens Page

**Reference:** `Constraint-Lens/artifacts/flowmap/src/pages/constraint.tsx`

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Constraint Focus: [Team Dropdown: UPJ ▼]           │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Directly Blocked │  │ Downstream Wait │          │
│  │       5          │  │       3         │          │
│  └─────────────────┘  └─────────────────┘          │
├─────────────────────────────────────────────────────┤
│  Blocked Queue (sorted by startability)             │
│  ┌─────────────────────────────────────────────┐   │
│  │ 1. Initiative A  │ 80% ready │ Details →    │   │
│  │ 2. Initiative B  │ 60% ready │ Details →    │   │
│  │ 3. Initiative C  │ 40% ready │ Details →    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1.6: Simulator Page

**Reference:** `Constraint-Lens/artifacts/flowmap/src/pages/simulator.tsx`

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Scenario: [Add Pod ▼]  Target: [UPJ ▼]  [Simulate] │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────┐   │
│  │      BEFORE         │ │       AFTER         │   │
│  │ Blocked: 5          │ │ Blocked: 2          │   │
│  │ Avg Startability:   │ │ Avg Startability:   │   │
│  │ 45%                 │ │ 72%                 │   │
│  └─────────────────────┘ └─────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  Impact: Adding capacity to UPJ would unblock 3    │
│  initiatives and improve overall startability by   │
│  27 percentage points.                             │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1.7: Real-time Integration (Amplify + AppSync)

### Amplify Client Setup

**src/lib/amplify.ts**
```typescript
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

Amplify.configure(outputs);

export { generateClient } from 'aws-amplify/data';
```

**src/main.tsx**
```typescript
import './lib/amplify'; // Initialize Amplify first
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Zustand Store with Amplify Subscriptions

**src/stores/portfolioStore.ts**
```typescript
import { create } from 'zustand';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

type FlowState = 'NOT_STARTED' | 'IN_DISCOVERY' | 'READY' | 'IN_FLIGHT' | 'UAT' | 'DONE' | 'NA';

interface Initiative {
  id: string;
  name: string;
  themeId: string;
  parentId: string | null;
  notes: string;
  sequencingNotes: string;
  teamStates: Record<string, FlowState>;
}

interface PortfolioStore {
  themes: Schema['Theme']['type'][];
  teams: Schema['Team']['type'][];
  initiatives: Initiative[];
  isLoading: boolean;
  error: string | null;

  loadData: () => Promise<void>;
  subscribeToUpdates: () => () => void;
  updateFlowState: (initiativeId: string, teamId: string, state: FlowState) => Promise<void>;
  createInitiative: (data: Omit<Initiative, 'id' | 'teamStates'>) => Promise<void>;
  // ... other actions
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  themes: [],
  teams: [],
  initiatives: [],
  isLoading: false,
  error: null,

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [themesRes, teamsRes, initiativesRes] = await Promise.all([
        client.models.Theme.list(),
        client.models.Team.list(),
        client.models.Initiative.list(),
      ]);

      const initiatives = (initiativesRes.data ?? []).map((i) => ({
        ...i,
        teamStates: i.teamStates ? JSON.parse(i.teamStates as string) : {},
      }));

      set({
        themes: themesRes.data ?? [],
        teams: teamsRes.data ?? [],
        initiatives,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  subscribeToUpdates: () => {
    // Subscribe to initiative updates
    const sub = client.models.Initiative.onUpdate().subscribe({
      next: (data) => {
        set((state) => ({
          initiatives: state.initiatives.map((i) =>
            i.id === data.id
              ? { ...i, ...data, teamStates: data.teamStates ? JSON.parse(data.teamStates as string) : i.teamStates }
              : i
          ),
        }));
      },
      error: (error) => console.error('Subscription error:', error),
    });

    // Subscribe to creates
    const createSub = client.models.Initiative.onCreate().subscribe({
      next: (data) => {
        set((state) => ({
          initiatives: [...state.initiatives, {
            ...data,
            teamStates: data.teamStates ? JSON.parse(data.teamStates as string) : {},
          }],
        }));
      },
    });

    // Subscribe to deletes
    const deleteSub = client.models.Initiative.onDelete().subscribe({
      next: (data) => {
        set((state) => ({
          initiatives: state.initiatives.filter((i) => i.id !== data.id),
        }));
      },
    });

    // Return cleanup function
    return () => {
      sub.unsubscribe();
      createSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  },

  updateFlowState: async (initiativeId, teamId, state) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    // Optimistic update
    const newTeamStates = { ...initiative.teamStates, [teamId]: state };
    set((s) => ({
      initiatives: s.initiatives.map((i) =>
        i.id === initiativeId ? { ...i, teamStates: newTeamStates } : i
      ),
    }));

    // Persist to AppSync
    try {
      await client.models.Initiative.update({
        id: initiativeId,
        teamStates: JSON.stringify(newTeamStates),
      });
    } catch (error) {
      // Rollback on error
      set((s) => ({
        initiatives: s.initiatives.map((i) =>
          i.id === initiativeId ? initiative : i
        ),
      }));
      console.error('Failed to update flow state:', error);
    }
  },

  createInitiative: async (data) => {
    const teams = get().teams;
    const defaultStates = Object.fromEntries(
      teams.map((t) => [t.id, 'NOT_STARTED' as FlowState])
    );

    await client.models.Initiative.create({
      name: data.name,
      themeId: data.themeId,
      parentId: data.parentId,
      notes: data.notes ?? '',
      sequencingNotes: data.sequencingNotes ?? '',
      teamStates: JSON.stringify(defaultStates),
    });
    // Subscription will handle adding to store
  },
}));
```

### Subscription Hook

**src/hooks/useSubscriptions.ts**
```typescript
import { useEffect } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';

export function useSubscriptions() {
  const subscribeToUpdates = usePortfolioStore((s) => s.subscribeToUpdates);
  const loadData = usePortfolioStore((s) => s.loadData);

  useEffect(() => {
    // Load initial data
    loadData();

    // Set up real-time subscriptions
    const unsubscribe = subscribeToUpdates();

    // Cleanup on unmount
    return unsubscribe;
  }, [loadData, subscribeToUpdates]);
}
```

### Use in App

**src/App.tsx**
```typescript
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePortfolioStore } from '@/stores/portfolioStore';

function App() {
  useSubscriptions(); // Initialize data + subscriptions

  const isLoading = usePortfolioStore((s) => s.isLoading);
  const error = usePortfolioStore((s) => s.error);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Your app content */}
    </div>
  );
}
```

---

## Phase 1.8: Polish & Animation

### Framer Motion Page Transitions

```typescript
// src/components/PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### State Change Animation

```typescript
// Animate badge color changes
<motion.span
  animate={{ backgroundColor: getStateColor(state) }}
  transition={{ duration: 0.3 }}
>
  {stateLabel}
</motion.span>
```

---

## Mock Data for Development

Until backend is ready, use this mock:

**src/lib/mockData.ts**
```typescript
export const mockPortfolio: PortfolioState = {
  themes: [
    { id: 'theme-1', name: 'NatWest' },
    { id: 'theme-2', name: 'M&S' },
  ],
  teams: [
    { id: 'team-1', name: 'UPJ', isPrimaryConstraint: true },
    { id: 'team-2', name: 'UPC', isPrimaryConstraint: false },
    { id: 'team-3', name: 'Ember', isPrimaryConstraint: false },
  ],
  initiatives: [
    {
      id: 'init-1',
      name: 'Customer Portal Redesign',
      themeId: 'theme-1',
      parentId: null,
      notes: 'High priority for Q2',
      sequencingNotes: 'Depends on API team',
      teamStates: {
        'team-1': 'READY',
        'team-2': 'IN_FLIGHT',
        'team-3': 'NOT_STARTED',
      },
    },
    // ... more initiatives
  ],
};
```

---

## Acceptance Criteria (Phase Complete)

- [ ] All components have passing tests
- [ ] UI matches Replit reference visually
- [ ] Real-time updates work (with mock WebSocket or real backend)
- [ ] State changes animate smoothly
- [ ] Connection status shows correctly
- [ ] No TypeScript errors
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
