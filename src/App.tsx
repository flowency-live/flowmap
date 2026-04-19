import { useEffect } from 'react';
import { Router, Route, Switch } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/Sidebar';
import { Heatmap } from '@/pages/Heatmap';
import { ConstraintLens } from '@/pages/ConstraintLens';
import { Simulator } from '@/pages/Simulator';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { client } from '@/lib/amplifyClient';
import type { Theme, Team, Initiative, FlowState, Effort } from '@/types';

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

  // Load data and set up subscriptions on mount
  useEffect(() => {
    loadPortfolio();

    // Set up real-time subscriptions
    const subscriptions: { unsubscribe: () => void }[] = [];

    // Initiative subscriptions
    const initCreateSub = client.models.Initiative.onCreate().subscribe({
      next: (data) => {
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
          };
          _applyInitiativeUpdate(initiative);
        }
      },
    });
    subscriptions.push(initCreateSub);

    const initUpdateSub = client.models.Initiative.onUpdate().subscribe({
      next: (data) => {
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
          };
          _applyInitiativeUpdate(initiative);
        }
      },
    });
    subscriptions.push(initUpdateSub);

    const initDeleteSub = client.models.Initiative.onDelete().subscribe({
      next: (data) => {
        if (data) {
          _applyInitiativeDelete(data.id);
        }
      },
    });
    subscriptions.push(initDeleteSub);

    // Team subscriptions
    const teamCreateSub = client.models.Team.onCreate().subscribe({
      next: (data) => {
        if (data) {
          const team: Team = {
            id: data.id,
            name: data.name,
            isPrimaryConstraint: data.isPrimaryConstraint ?? false,
          };
          _applyTeamUpdate(team);
        }
      },
    });
    subscriptions.push(teamCreateSub);

    const teamUpdateSub = client.models.Team.onUpdate().subscribe({
      next: (data) => {
        if (data) {
          const team: Team = {
            id: data.id,
            name: data.name,
            isPrimaryConstraint: data.isPrimaryConstraint ?? false,
          };
          _applyTeamUpdate(team);
        }
      },
    });
    subscriptions.push(teamUpdateSub);

    const teamDeleteSub = client.models.Team.onDelete().subscribe({
      next: (data) => {
        if (data) {
          _applyTeamDelete(data.id);
        }
      },
    });
    subscriptions.push(teamDeleteSub);

    // Theme subscriptions
    const themeCreateSub = client.models.Theme.onCreate().subscribe({
      next: (data) => {
        if (data) {
          const theme: Theme = {
            id: data.id,
            name: data.name,
          };
          _applyThemeUpdate(theme);
        }
      },
    });
    subscriptions.push(themeCreateSub);

    const themeUpdateSub = client.models.Theme.onUpdate().subscribe({
      next: (data) => {
        if (data) {
          const theme: Theme = {
            id: data.id,
            name: data.name,
          };
          _applyThemeUpdate(theme);
        }
      },
    });
    subscriptions.push(themeUpdateSub);

    const themeDeleteSub = client.models.Theme.onDelete().subscribe({
      next: (data) => {
        if (data) {
          _applyThemeDelete(data.id);
        }
      },
    });
    subscriptions.push(themeDeleteSub);

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
              <Route>
                <div className="p-8">
                  <h1 className="text-2xl font-bold">Page Not Found</h1>
                </div>
              </Route>
            </Switch>
          </Router>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default App;
