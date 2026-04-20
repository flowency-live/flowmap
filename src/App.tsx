import { useEffect } from 'react';
import { Router, Route, Switch } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from '@/components/Toaster';
import { Heatmap } from '@/pages/Heatmap';
import { ConstraintLens } from '@/pages/ConstraintLens';
import { Simulator } from '@/pages/Simulator';
import { Timeline } from '@/pages/Timeline';
import { TeamKanban } from '@/pages/TeamKanban';
import { Config } from '@/pages/Config';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useThemeStore } from '@/stores/themeStore';
import { client } from '@/lib/amplifyClient';
import type { Theme, Team, Initiative, FlowState, Effort, TeamCapacity, Dependency } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SubscriptionData = any;

function App() {
  const loadPortfolio = usePortfolioStore((s) => s.loadPortfolio);
  const isLoading = usePortfolioStore((s) => s.isLoading);
  const error = usePortfolioStore((s) => s.error);
  const _applyInitiativeUpdate = usePortfolioStore((s) => s._applyInitiativeUpdate);
  const _applyInitiativeDelete = usePortfolioStore((s) => s._applyInitiativeDelete);
  const _applyTeamUpdate = usePortfolioStore((s) => s._applyTeamUpdate);
  const _applyTeamDelete = usePortfolioStore((s) => s._applyTeamDelete);
  const _applyThemeUpdate = usePortfolioStore((s) => s._applyThemeUpdate);
  const _applyThemeDelete = usePortfolioStore((s) => s._applyThemeDelete);
  const _applyDependencyUpdate = usePortfolioStore((s) => s._applyDependencyUpdate);
  const _applyDependencyDelete = usePortfolioStore((s) => s._applyDependencyDelete);

  // Theme management
  const theme = useThemeStore((s) => s.theme);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load data and set up subscriptions on mount
  useEffect(() => {
    loadPortfolio();

    // Set up real-time subscriptions
    const subscriptions: { unsubscribe: () => void }[] = [];

    // Initiative subscriptions
    const initCreateSub = client.models.Initiative.onCreate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          let teamStates: Record<string, FlowState> = {};
          if (data.teamStates) {
            try {
              teamStates = typeof data.teamStates === 'string'
                ? JSON.parse(data.teamStates)
                : data.teamStates as Record<string, FlowState>;
            } catch {
              teamStates = {};
            }
          }
          let teamEfforts: Record<string, Effort> = {};
          if ((data as { teamEfforts?: unknown }).teamEfforts) {
            try {
              const effortsData = (data as { teamEfforts?: unknown }).teamEfforts;
              teamEfforts = typeof effortsData === 'string'
                ? JSON.parse(effortsData)
                : effortsData as Record<string, Effort>;
            } catch {
              teamEfforts = {};
            }
          }
          let teamNotes: Record<string, string> = {};
          if ((data as { teamNotes?: unknown }).teamNotes) {
            try {
              const notesData = (data as { teamNotes?: unknown }).teamNotes;
              teamNotes = typeof notesData === 'string'
                ? JSON.parse(notesData)
                : notesData as Record<string, string>;
            } catch {
              teamNotes = {};
            }
          }
          let teamStartDates: Record<string, string> = {};
          if ((data as { teamStartDates?: unknown }).teamStartDates) {
            try {
              const startDatesData = (data as { teamStartDates?: unknown }).teamStartDates;
              teamStartDates = typeof startDatesData === 'string'
                ? JSON.parse(startDatesData)
                : startDatesData as Record<string, string>;
            } catch {
              teamStartDates = {};
            }
          }
          const initiative: Initiative = {
            id: data.id,
            name: data.name,
            themeId: data.themeId,
            parentId: data.parentId ?? null,
            order: (data as { order?: number }).order ?? 0,
            liveDate: data.liveDate ?? undefined,
            dueDate: data.dueDate ?? undefined,
            notes: data.notes ?? '',
            sequencingNotes: data.sequencingNotes ?? '',
            teamStates,
            teamEfforts,
            teamNotes,
            teamStartDates,
          };
          _applyInitiativeUpdate(initiative);
        }
      },
    });
    subscriptions.push(initCreateSub);

    const initUpdateSub = client.models.Initiative.onUpdate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          let teamStates: Record<string, FlowState> = {};
          if (data.teamStates) {
            try {
              teamStates = typeof data.teamStates === 'string'
                ? JSON.parse(data.teamStates)
                : data.teamStates as Record<string, FlowState>;
            } catch {
              teamStates = {};
            }
          }
          let teamEfforts: Record<string, Effort> = {};
          if ((data as { teamEfforts?: unknown }).teamEfforts) {
            try {
              const effortsData = (data as { teamEfforts?: unknown }).teamEfforts;
              teamEfforts = typeof effortsData === 'string'
                ? JSON.parse(effortsData)
                : effortsData as Record<string, Effort>;
            } catch {
              teamEfforts = {};
            }
          }
          let teamNotes: Record<string, string> = {};
          if ((data as { teamNotes?: unknown }).teamNotes) {
            try {
              const notesData = (data as { teamNotes?: unknown }).teamNotes;
              teamNotes = typeof notesData === 'string'
                ? JSON.parse(notesData)
                : notesData as Record<string, string>;
            } catch {
              teamNotes = {};
            }
          }
          let teamStartDates: Record<string, string> = {};
          if ((data as { teamStartDates?: unknown }).teamStartDates) {
            try {
              const startDatesData = (data as { teamStartDates?: unknown }).teamStartDates;
              teamStartDates = typeof startDatesData === 'string'
                ? JSON.parse(startDatesData)
                : startDatesData as Record<string, string>;
            } catch {
              teamStartDates = {};
            }
          }
          const initiative: Initiative = {
            id: data.id,
            name: data.name,
            themeId: data.themeId,
            parentId: data.parentId ?? null,
            order: (data as { order?: number }).order ?? 0,
            liveDate: data.liveDate ?? undefined,
            dueDate: data.dueDate ?? undefined,
            notes: data.notes ?? '',
            sequencingNotes: data.sequencingNotes ?? '',
            teamStates,
            teamEfforts,
            teamNotes,
            teamStartDates,
          };
          _applyInitiativeUpdate(initiative);
        }
      },
    });
    subscriptions.push(initUpdateSub);

    const initDeleteSub = client.models.Initiative.onDelete().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          _applyInitiativeDelete(data.id);
        }
      },
    });
    subscriptions.push(initDeleteSub);

    // Team subscriptions
    const teamCreateSub = client.models.Team.onCreate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const team: Team = {
            id: data.id,
            name: data.name,
            isPrimaryConstraint: data.isPrimaryConstraint ?? false,
          };
          if (data.capacityConfig) {
            try {
              team.capacityConfig = typeof data.capacityConfig === 'string'
                ? JSON.parse(data.capacityConfig)
                : data.capacityConfig as TeamCapacity;
            } catch {
              // Ignore invalid JSON
            }
          }
          _applyTeamUpdate(team);
        }
      },
    });
    subscriptions.push(teamCreateSub);

    const teamUpdateSub = client.models.Team.onUpdate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const team: Team = {
            id: data.id,
            name: data.name,
            isPrimaryConstraint: data.isPrimaryConstraint ?? false,
          };
          if (data.capacityConfig) {
            try {
              team.capacityConfig = typeof data.capacityConfig === 'string'
                ? JSON.parse(data.capacityConfig)
                : data.capacityConfig as TeamCapacity;
            } catch {
              // Ignore invalid JSON
            }
          }
          _applyTeamUpdate(team);
        }
      },
    });
    subscriptions.push(teamUpdateSub);

    const teamDeleteSub = client.models.Team.onDelete().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          _applyTeamDelete(data.id);
        }
      },
    });
    subscriptions.push(teamDeleteSub);

    // Theme subscriptions
    const themeCreateSub = client.models.Theme.onCreate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const theme: Theme = {
            id: data.id,
            name: data.name,
            faviconUrl: data.faviconUrl ?? undefined,
          };
          _applyThemeUpdate(theme);
        }
      },
    });
    subscriptions.push(themeCreateSub);

    const themeUpdateSub = client.models.Theme.onUpdate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const theme: Theme = {
            id: data.id,
            name: data.name,
            faviconUrl: data.faviconUrl ?? undefined,
          };
          _applyThemeUpdate(theme);
        }
      },
    });
    subscriptions.push(themeUpdateSub);

    const themeDeleteSub = client.models.Theme.onDelete().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          _applyThemeDelete(data.id);
        }
      },
    });
    subscriptions.push(themeDeleteSub);

    // Dependency subscriptions
    const depCreateSub = client.models.Dependency.onCreate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const dependency: Dependency = {
            id: data.id,
            fromInitiativeId: data.fromInitiativeId,
            toInitiativeId: data.toInitiativeId,
            notes: data.notes ?? undefined,
          };
          _applyDependencyUpdate(dependency);
        }
      },
    });
    subscriptions.push(depCreateSub);

    const depUpdateSub = client.models.Dependency.onUpdate().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          const dependency: Dependency = {
            id: data.id,
            fromInitiativeId: data.fromInitiativeId,
            toInitiativeId: data.toInitiativeId,
            notes: data.notes ?? undefined,
          };
          _applyDependencyUpdate(dependency);
        }
      },
    });
    subscriptions.push(depUpdateSub);

    const depDeleteSub = client.models.Dependency.onDelete().subscribe({
      next: (data: SubscriptionData) => {
        if (data) {
          _applyDependencyDelete(data.id);
        }
      },
    });
    subscriptions.push(depDeleteSub);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [
    loadPortfolio,
    _applyInitiativeUpdate,
    _applyInitiativeDelete,
    _applyTeamUpdate,
    _applyTeamDelete,
    _applyThemeUpdate,
    _applyThemeDelete,
    _applyDependencyUpdate,
    _applyDependencyDelete,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load data</p>
          <button
            onClick={() => loadPortfolio()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-64 flex-1 h-screen overflow-hidden">
          <Router>
            <Switch>
              <Route path="/" component={Heatmap} />
              <Route path="/constraint" component={ConstraintLens} />
              <Route path="/simulator" component={Simulator} />
              <Route path="/timeline" component={Timeline} />
              <Route path="/config" component={Config} />
              <Route path="/team/:teamId" component={TeamKanban} />
              <Route>
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Page Not Found</h1>
                </div>
              </Route>
            </Switch>
          </Router>
        </main>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
