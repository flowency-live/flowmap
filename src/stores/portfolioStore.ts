import { create } from 'zustand';
import type { Theme, Team, Initiative, FlowState, PortfolioState } from '@/types';
import { client } from '@/lib/amplifyClient';

interface PortfolioStore extends PortfolioState {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Data loading
  loadPortfolio: () => Promise<void>;

  // Initiative actions
  updateTeamState: (initiativeId: string, teamId: string, state: FlowState) => Promise<void>;
  addInitiative: (themeId: string, name: string, parentId?: string | null) => Promise<void>;
  removeInitiative: (id: string) => Promise<void>;
  renameInitiative: (id: string, name: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  updateSequencingNotes: (id: string, notes: string) => Promise<void>;

  // Team actions
  addTeam: (name: string) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;
  renameTeam: (id: string, name: string) => Promise<void>;

  // Theme actions
  addTheme: (name: string) => Promise<void>;
  removeTheme: (id: string) => Promise<void>;
  renameTheme: (id: string, name: string) => Promise<void>;

  // Internal: apply updates from subscriptions
  _applyInitiativeUpdate: (initiative: Initiative) => void;
  _applyInitiativeDelete: (id: string) => void;
  _applyTeamUpdate: (team: Team) => void;
  _applyTeamDelete: (id: string) => void;
  _applyThemeUpdate: (theme: Theme) => void;
  _applyThemeDelete: (id: string) => void;
}

// Convert AppSync Initiative to local type
function toLocalInitiative(amplifyInit: {
  id: string;
  name: string;
  themeId: string;
  parentId?: string | null;
  notes?: string | null;
  sequencingNotes?: string | null;
  teamStates?: unknown;
}): Initiative {
  let teamStates: Record<string, FlowState> = {};
  if (amplifyInit.teamStates) {
    try {
      teamStates = typeof amplifyInit.teamStates === 'string'
        ? JSON.parse(amplifyInit.teamStates)
        : amplifyInit.teamStates as Record<string, FlowState>;
    } catch {
      teamStates = {};
    }
  }
  return {
    id: amplifyInit.id,
    name: amplifyInit.name,
    themeId: amplifyInit.themeId,
    parentId: amplifyInit.parentId ?? null,
    notes: amplifyInit.notes ?? '',
    sequencingNotes: amplifyInit.sequencingNotes ?? '',
    teamStates,
  };
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  // Initial empty state
  themes: [],
  teams: [],
  initiatives: [],
  isLoading: true,
  error: null,

  // Load all data from AppSync
  loadPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const [themesResult, teamsResult, initiativesResult] = await Promise.all([
        client.models.Theme.list(),
        client.models.Team.list(),
        client.models.Initiative.list(),
      ]);

      const themes: Theme[] = (themesResult.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
      }));

      const teams: Team[] = (teamsResult.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        isPrimaryConstraint: t.isPrimaryConstraint ?? false,
      }));

      const initiatives: Initiative[] = (initiativesResult.data ?? []).map(toLocalInitiative);

      set({ themes, teams, initiatives, isLoading: false });
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      set({ error: 'Failed to load data', isLoading: false });
    }
  },

  // Initiative actions
  updateTeamState: async (initiativeId, teamId, state) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    const newTeamStates = { ...initiative.teamStates, [teamId]: state };

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, teamStates: newTeamStates } : init
      ),
    }));

    // Persist to AppSync
    try {
      await client.models.Initiative.update({
        id: initiativeId,
        teamStates: JSON.stringify(newTeamStates),
      });
    } catch (err) {
      console.error('Failed to update team state:', err);
      // Revert on error
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === initiativeId ? { ...init, teamStates: initiative.teamStates } : init
        ),
      }));
    }
  },

  addInitiative: async (themeId, name, parentId = null) => {
    const teams = get().teams;
    const defaultStates: Record<string, FlowState> = {};
    teams.forEach((team) => {
      defaultStates[team.id] = 'NOT_STARTED';
    });

    try {
      const result = await client.models.Initiative.create({
        name,
        themeId,
        parentId: parentId,
        notes: '',
        sequencingNotes: '',
        teamStates: JSON.stringify(defaultStates),
      });

      if (result.data) {
        const newInitiative = toLocalInitiative(result.data);
        set((s) => ({ initiatives: [...s.initiatives, newInitiative] }));
      }
    } catch (err) {
      console.error('Failed to add initiative:', err);
    }
  },

  removeInitiative: async (id) => {
    const initiative = get().initiatives.find((i) => i.id === id);
    if (!initiative) return;

    // Get children before removing
    const childIds = get().initiatives.filter((i) => i.parentId === id).map((i) => i.id);

    // Optimistic update - remove initiative and children
    set((s) => ({
      initiatives: s.initiatives.filter(
        (init) => init.id !== id && init.parentId !== id
      ),
    }));

    try {
      // Delete children first
      await Promise.all(childIds.map((childId) => client.models.Initiative.delete({ id: childId })));
      await client.models.Initiative.delete({ id });
    } catch (err) {
      console.error('Failed to delete initiative:', err);
      // Reload on error
      get().loadPortfolio();
    }
  },

  renameInitiative: async (id, name) => {
    const initiative = get().initiatives.find((i) => i.id === id);
    if (!initiative) return;

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, name } : init
      ),
    }));

    try {
      await client.models.Initiative.update({ id, name });
    } catch (err) {
      console.error('Failed to rename initiative:', err);
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === id ? { ...init, name: initiative.name } : init
        ),
      }));
    }
  },

  updateNotes: async (id, notes) => {
    const initiative = get().initiatives.find((i) => i.id === id);
    if (!initiative) return;

    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, notes } : init
      ),
    }));

    try {
      await client.models.Initiative.update({ id, notes });
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  },

  updateSequencingNotes: async (id, notes) => {
    const initiative = get().initiatives.find((i) => i.id === id);
    if (!initiative) return;

    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, sequencingNotes: notes } : init
      ),
    }));

    try {
      await client.models.Initiative.update({ id, sequencingNotes: notes });
    } catch (err) {
      console.error('Failed to update sequencing notes:', err);
    }
  },

  // Team actions
  addTeam: async (name) => {
    try {
      const result = await client.models.Team.create({
        name,
        isPrimaryConstraint: false,
      });

      if (result.data) {
        const newTeam: Team = {
          id: result.data.id,
          name: result.data.name,
          isPrimaryConstraint: result.data.isPrimaryConstraint ?? false,
        };

        set((s) => ({
          teams: [...s.teams, newTeam],
          // Add NOT_STARTED state for new team to all initiatives
          initiatives: s.initiatives.map((init) => ({
            ...init,
            teamStates: { ...init.teamStates, [newTeam.id]: 'NOT_STARTED' as FlowState },
          })),
        }));

        // Update all initiatives in AppSync with new team state
        const initiatives = get().initiatives;
        await Promise.all(
          initiatives.map((init) =>
            client.models.Initiative.update({
              id: init.id,
              teamStates: JSON.stringify(init.teamStates),
            })
          )
        );
      }
    } catch (err) {
      console.error('Failed to add team:', err);
    }
  },

  removeTeam: async (id) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;

    // Optimistic update
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      initiatives: s.initiatives.map((init) => {
        const { [id]: _, ...remainingStates } = init.teamStates;
        return { ...init, teamStates: remainingStates };
      }),
    }));

    try {
      await client.models.Team.delete({ id });
      // Update all initiatives to remove team state
      const initiatives = get().initiatives;
      await Promise.all(
        initiatives.map((init) =>
          client.models.Initiative.update({
            id: init.id,
            teamStates: JSON.stringify(init.teamStates),
          })
        )
      );
    } catch (err) {
      console.error('Failed to delete team:', err);
      get().loadPortfolio();
    }
  },

  renameTeam: async (id, name) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;

    set((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)),
    }));

    try {
      await client.models.Team.update({ id, name });
    } catch (err) {
      console.error('Failed to rename team:', err);
      set((s) => ({
        teams: s.teams.map((t) => (t.id === id ? { ...t, name: team.name } : t)),
      }));
    }
  },

  // Theme actions
  addTheme: async (name) => {
    try {
      const result = await client.models.Theme.create({ name });

      if (result.data) {
        const newTheme: Theme = {
          id: result.data.id,
          name: result.data.name,
        };
        set((s) => ({ themes: [...s.themes, newTheme] }));
      }
    } catch (err) {
      console.error('Failed to add theme:', err);
    }
  },

  removeTheme: async (id) => {
    const theme = get().themes.find((t) => t.id === id);
    if (!theme) return;

    const initiativesToDelete = get().initiatives.filter((i) => i.themeId === id);

    // Optimistic update
    set((s) => ({
      themes: s.themes.filter((t) => t.id !== id),
      initiatives: s.initiatives.filter((init) => init.themeId !== id),
    }));

    try {
      // Delete all initiatives in this theme first
      await Promise.all(
        initiativesToDelete.map((i) => client.models.Initiative.delete({ id: i.id }))
      );
      await client.models.Theme.delete({ id });
    } catch (err) {
      console.error('Failed to delete theme:', err);
      get().loadPortfolio();
    }
  },

  renameTheme: async (id, name) => {
    const theme = get().themes.find((t) => t.id === id);
    if (!theme) return;

    set((s) => ({
      themes: s.themes.map((t) => (t.id === id ? { ...t, name } : t)),
    }));

    try {
      await client.models.Theme.update({ id, name });
    } catch (err) {
      console.error('Failed to rename theme:', err);
      set((s) => ({
        themes: s.themes.map((t) => (t.id === id ? { ...t, name: theme.name } : t)),
      }));
    }
  },

  // Internal subscription handlers
  _applyInitiativeUpdate: (initiative) => {
    set((s) => {
      const exists = s.initiatives.some((i) => i.id === initiative.id);
      if (exists) {
        return {
          initiatives: s.initiatives.map((i) =>
            i.id === initiative.id ? initiative : i
          ),
        };
      }
      return { initiatives: [...s.initiatives, initiative] };
    });
  },

  _applyInitiativeDelete: (id) => {
    set((s) => ({
      initiatives: s.initiatives.filter((i) => i.id !== id && i.parentId !== id),
    }));
  },

  _applyTeamUpdate: (team) => {
    set((s) => {
      const exists = s.teams.some((t) => t.id === team.id);
      if (exists) {
        return { teams: s.teams.map((t) => (t.id === team.id ? team : t)) };
      }
      return { teams: [...s.teams, team] };
    });
  },

  _applyTeamDelete: (id) => {
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      initiatives: s.initiatives.map((init) => {
        const { [id]: _, ...remainingStates } = init.teamStates;
        return { ...init, teamStates: remainingStates };
      }),
    }));
  },

  _applyThemeUpdate: (theme) => {
    set((s) => {
      const exists = s.themes.some((t) => t.id === theme.id);
      if (exists) {
        return { themes: s.themes.map((t) => (t.id === theme.id ? theme : t)) };
      }
      return { themes: [...s.themes, theme] };
    });
  },

  _applyThemeDelete: (id) => {
    set((s) => ({
      themes: s.themes.filter((t) => t.id !== id),
      initiatives: s.initiatives.filter((i) => i.themeId !== id),
    }));
  },
}));
