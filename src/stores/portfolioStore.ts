import { create } from 'zustand';
import type { Theme, Team, Initiative, FlowState, Effort, PortfolioState, TeamCapacity, Dependency } from '@/types';
import { client } from '@/lib/amplifyClient';
import { toast } from '@/stores/toastStore';
import { wouldCreateCycle } from '@/lib/dependencies';

interface PortfolioStore extends PortfolioState {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Dependencies
  dependencies: Dependency[];

  // Data loading
  loadPortfolio: () => Promise<void>;

  // Initiative actions
  updateTeamState: (initiativeId: string, teamId: string, state: FlowState) => Promise<void>;
  updateTeamEffort: (initiativeId: string, teamId: string, effort: Effort | null) => Promise<void>;
  updateTeamNotes: (initiativeId: string, teamId: string, notes: string) => Promise<void>;
  updateTeamStartDate: (initiativeId: string, teamId: string, startDate: string | null) => Promise<void>;
  updateLiveDate: (initiativeId: string, liveDate: string) => Promise<void>;
  updateDueDate: (initiativeId: string, dueDate: string) => Promise<void>;
  addInitiative: (themeId: string, name: string, parentId?: string | null) => Promise<void>;
  removeInitiative: (id: string) => Promise<void>;
  renameInitiative: (id: string, name: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  updateSequencingNotes: (id: string, notes: string) => Promise<void>;
  updateInitiativeFavicon: (id: string, faviconUrl: string) => Promise<void>;

  // Team actions
  addTeam: (name: string) => Promise<void>;
  removeTeam: (id: string) => Promise<void>;
  renameTeam: (id: string, name: string) => Promise<void>;
  updateTeamCapacity: (id: string, capacityConfig: TeamCapacity | null) => Promise<void>;

  // Theme actions
  addTheme: (name: string) => Promise<void>;
  removeTheme: (id: string) => Promise<void>;
  renameTheme: (id: string, name: string) => Promise<void>;
  updateThemeFavicon: (id: string, faviconUrl: string) => Promise<void>;

  // Dependency actions
  addDependency: (fromInitiativeId: string, toInitiativeId: string, notes?: string) => Promise<void>;
  removeDependency: (id: string) => Promise<void>;
  getDependenciesFor: (initiativeId: string) => { blockedBy: Dependency[]; blocks: Dependency[] };

  // Internal: apply updates from subscriptions
  _applyInitiativeUpdate: (initiative: Initiative) => void;
  _applyInitiativeDelete: (id: string) => void;
  _applyTeamUpdate: (team: Team) => void;
  _applyTeamDelete: (id: string) => void;
  _applyThemeUpdate: (theme: Theme) => void;
  _applyThemeDelete: (id: string) => void;
  _applyDependencyUpdate: (dependency: Dependency) => void;
  _applyDependencyDelete: (id: string) => void;
}

// Convert AppSync Initiative to local type
function toLocalInitiative(amplifyInit: {
  id: string;
  name: string;
  themeId: string;
  parentId?: string | null;
  order?: number | null;
  faviconUrl?: string | null;
  liveDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  sequencingNotes?: string | null;
  teamStates?: unknown;
  teamEfforts?: unknown;
  teamNotes?: unknown;
  teamStartDates?: unknown;
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
  let teamEfforts: Record<string, Effort> = {};
  if (amplifyInit.teamEfforts) {
    try {
      teamEfforts = typeof amplifyInit.teamEfforts === 'string'
        ? JSON.parse(amplifyInit.teamEfforts)
        : amplifyInit.teamEfforts as Record<string, Effort>;
    } catch {
      teamEfforts = {};
    }
  }
  let teamNotes: Record<string, string> = {};
  if (amplifyInit.teamNotes) {
    try {
      teamNotes = typeof amplifyInit.teamNotes === 'string'
        ? JSON.parse(amplifyInit.teamNotes)
        : amplifyInit.teamNotes as Record<string, string>;
    } catch {
      teamNotes = {};
    }
  }
  let teamStartDates: Record<string, string> = {};
  if (amplifyInit.teamStartDates) {
    try {
      teamStartDates = typeof amplifyInit.teamStartDates === 'string'
        ? JSON.parse(amplifyInit.teamStartDates)
        : amplifyInit.teamStartDates as Record<string, string>;
    } catch {
      teamStartDates = {};
    }
  }
  const initiative: Initiative = {
    id: amplifyInit.id,
    name: amplifyInit.name,
    themeId: amplifyInit.themeId,
    parentId: amplifyInit.parentId ?? null,
    order: amplifyInit.order ?? 0,
    liveDate: amplifyInit.liveDate ?? undefined,
    dueDate: amplifyInit.dueDate ?? undefined,
    notes: amplifyInit.notes ?? '',
    sequencingNotes: amplifyInit.sequencingNotes ?? '',
    teamStates,
    teamEfforts,
    teamNotes,
    teamStartDates,
  };
  if (amplifyInit.faviconUrl) initiative.faviconUrl = amplifyInit.faviconUrl;
  return initiative;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  // Initial empty state
  themes: [],
  teams: [],
  initiatives: [],
  dependencies: [],
  isLoading: true,
  error: null,

  // Load all data from AppSync
  loadPortfolio: async () => {
    set({ isLoading: true, error: null });
    try {
      const [themesResult, teamsResult, initiativesResult, dependenciesResult] = await Promise.all([
        client.models.Theme.list(),
        client.models.Team.list(),
        client.models.Initiative.list(),
        client.models.Dependency.list(),
      ]);

      const themes: Theme[] = (themesResult.data ?? []).map((t: { id: string; name: string; faviconUrl?: string | null }) => {
        const theme: Theme = { id: t.id, name: t.name };
        if (t.faviconUrl) theme.faviconUrl = t.faviconUrl;
        return theme;
      });

      const teams: Team[] = (teamsResult.data ?? []).map((t: { id: string; name: string; isPrimaryConstraint?: boolean | null; capacityConfig?: unknown }) => {
        const team: Team = {
          id: t.id,
          name: t.name,
          isPrimaryConstraint: t.isPrimaryConstraint ?? false,
        };
        if (t.capacityConfig) {
          try {
            team.capacityConfig = typeof t.capacityConfig === 'string'
              ? JSON.parse(t.capacityConfig)
              : t.capacityConfig as TeamCapacity;
          } catch {
            // Ignore invalid JSON
          }
        }
        return team;
      });

      // Sort initiatives by explicit order field
      const initiatives: Initiative[] = (initiativesResult.data ?? [])
        .map(toLocalInitiative)
        .sort((a: Initiative, b: Initiative) => a.order - b.order);

      const dependencies: Dependency[] = (dependenciesResult.data ?? []).map((d: { id: string; fromInitiativeId: string; toInitiativeId: string; notes?: string | null }) => {
        const dep: Dependency = {
          id: d.id,
          fromInitiativeId: d.fromInitiativeId,
          toInitiativeId: d.toInitiativeId,
        };
        if (d.notes) dep.notes = d.notes;
        return dep;
      });

      set({ themes, teams, initiatives, dependencies, isLoading: false });
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      set({ error: 'Failed to load data', isLoading: false });
      toast.error('Failed to load portfolio data');
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
      toast.error('Failed to update state');
      // Revert on error
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === initiativeId ? { ...init, teamStates: initiative.teamStates } : init
        ),
      }));
    }
  },

  updateTeamEffort: async (initiativeId, teamId, effort) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    let newTeamEfforts: Record<string, Effort>;
    if (effort === null) {
      // Remove effort
      const { [teamId]: _, ...rest } = initiative.teamEfforts;
      newTeamEfforts = rest;
    } else {
      newTeamEfforts = { ...initiative.teamEfforts, [teamId]: effort };
    }

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, teamEfforts: newTeamEfforts } : init
      ),
    }));

    try {
      await client.models.Initiative.update({
        id: initiativeId,
        teamEfforts: JSON.stringify(newTeamEfforts),
      });
    } catch (err) {
      console.error('Failed to update team effort:', err);
      toast.error('Failed to update effort');
      // Rollback on error
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === initiativeId ? { ...init, teamEfforts: initiative.teamEfforts } : init
        ),
      }));
    }
  },

  updateTeamNotes: async (initiativeId, teamId, notes) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    let newTeamNotes: Record<string, string>;
    if (notes === '') {
      // Remove notes for this team
      const { [teamId]: _, ...rest } = initiative.teamNotes;
      newTeamNotes = rest;
    } else {
      newTeamNotes = { ...initiative.teamNotes, [teamId]: notes };
    }

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, teamNotes: newTeamNotes } : init
      ),
    }));

    // Persist to AppSync
    try {
      await client.models.Initiative.update({
        id: initiativeId,
        teamNotes: JSON.stringify(newTeamNotes),
      });
    } catch (err) {
      console.error('Failed to update team notes:', err);
      // Revert on error
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === initiativeId ? { ...init, teamNotes: initiative.teamNotes } : init
        ),
      }));
    }
  },

  updateTeamStartDate: async (initiativeId, teamId, startDate) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    let newTeamStartDates: Record<string, string>;
    if (startDate === null || startDate === '') {
      // Remove start date for this team
      const { [teamId]: _, ...rest } = initiative.teamStartDates;
      newTeamStartDates = rest;
    } else {
      newTeamStartDates = { ...initiative.teamStartDates, [teamId]: startDate };
    }

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, teamStartDates: newTeamStartDates } : init
      ),
    }));

    // Persist to AppSync
    try {
      await client.models.Initiative.update({
        id: initiativeId,
        teamStartDates: JSON.stringify(newTeamStartDates),
      });
    } catch (err) {
      console.error('Failed to update team start date:', err);
      // Revert on error
      set((s) => ({
        initiatives: s.initiatives.map((init) =>
          init.id === initiativeId ? { ...init, teamStartDates: initiative.teamStartDates } : init
        ),
      }));
    }
  },

  updateLiveDate: async (initiativeId, liveDate) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, liveDate: liveDate || undefined } : init
      ),
    }));

    try {
      await client.models.Initiative.update({ id: initiativeId, liveDate });
    } catch (err) {
      console.error('Failed to update live date:', err);
    }
  },

  updateDueDate: async (initiativeId, dueDate) => {
    const initiative = get().initiatives.find((i) => i.id === initiativeId);
    if (!initiative) return;

    // Optimistic update
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId ? { ...init, dueDate: dueDate || undefined } : init
      ),
    }));

    try {
      await client.models.Initiative.update({ id: initiativeId, dueDate });
    } catch (err) {
      console.error('Failed to update due date:', err);
    }
  },

  addInitiative: async (themeId, name, parentId = null) => {
    const teams = get().teams;
    const initiatives = get().initiatives;
    const defaultStates: Record<string, FlowState> = {};
    // Child initiatives default to N/A, top-level to N/S
    const defaultState: FlowState = parentId ? 'N/A' : 'N/S';
    teams.forEach((team) => {
      defaultStates[team.id] = defaultState;
    });

    // Calculate next order value (max + 1)
    const maxOrder = initiatives.reduce((max, i) => Math.max(max, i.order), 0);

    try {
      const result = await client.models.Initiative.create({
        name,
        themeId,
        parentId: parentId,
        order: maxOrder + 1,
        notes: '',
        sequencingNotes: '',
        teamStates: JSON.stringify(defaultStates),
        // teamEfforts not in schema yet - will be added to local state
      });

      if (result.data) {
        const newInitiative = toLocalInitiative(result.data);
        set((s) => ({ initiatives: [...s.initiatives, newInitiative] }));
        toast.success('Initiative created');
      }
    } catch (err) {
      console.error('Failed to add initiative:', err);
      toast.error('Failed to create initiative');
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
      toast.error('Failed to delete initiative');
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

  updateInitiativeFavicon: async (id, faviconUrl) => {
    const initiative = get().initiatives.find((i) => i.id === id);
    if (!initiative) return;

    set((s) => ({
      initiatives: s.initiatives.map((init) => {
        if (init.id !== id) return init;
        const updated = { ...init };
        if (faviconUrl) {
          updated.faviconUrl = faviconUrl;
        } else {
          delete updated.faviconUrl;
        }
        return updated;
      }),
    }));

    try {
      await client.models.Initiative.update({ id, faviconUrl: faviconUrl || null });
    } catch (err) {
      console.error('Failed to update initiative favicon:', err);
      // Rollback on error
      set((s) => ({
        initiatives: s.initiatives.map((init) => {
          if (init.id !== id) return init;
          const restored = { ...init };
          if (initiative.faviconUrl) {
            restored.faviconUrl = initiative.faviconUrl;
          } else {
            delete restored.faviconUrl;
          }
          return restored;
        }),
      }));
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
            teamStates: { ...init.teamStates, [newTeam.id]: 'N/S' as FlowState },
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
        toast.success('Team added');
      }
    } catch (err) {
      console.error('Failed to add team:', err);
      toast.error('Failed to add team');
    }
  },

  removeTeam: async (id) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;

    // Optimistic update
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      initiatives: s.initiatives.map((init) => {
        const { [id]: _state, ...remainingStates } = init.teamStates;
        const { [id]: _effort, ...remainingEfforts } = init.teamEfforts;
        const { [id]: _notes, ...remainingNotes } = init.teamNotes;
        const { [id]: _startDate, ...remainingStartDates } = init.teamStartDates;
        return { ...init, teamStates: remainingStates, teamEfforts: remainingEfforts, teamNotes: remainingNotes, teamStartDates: remainingStartDates };
      }),
    }));

    try {
      await client.models.Team.delete({ id });
      // Update all initiatives to remove team state, notes, and start dates
      const initiatives = get().initiatives;
      await Promise.all(
        initiatives.map((init) =>
          client.models.Initiative.update({
            id: init.id,
            teamStates: JSON.stringify(init.teamStates),
            teamNotes: JSON.stringify(init.teamNotes),
            teamStartDates: JSON.stringify(init.teamStartDates),
          })
        )
      );
    } catch (err) {
      console.error('Failed to delete team:', err);
      toast.error('Failed to delete team');
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

  updateTeamCapacity: async (id, capacityConfig) => {
    const team = get().teams.find((t) => t.id === id);
    if (!team) return;

    // Optimistic update
    set((s) => ({
      teams: s.teams.map((t) => {
        if (t.id !== id) return t;
        const updated: Team = { ...t };
        if (capacityConfig) {
          updated.capacityConfig = capacityConfig;
        } else {
          delete updated.capacityConfig;
        }
        return updated;
      }),
    }));

    try {
      await client.models.Team.update({
        id,
        capacityConfig: capacityConfig ? JSON.stringify(capacityConfig) : null,
      });
      toast.success('Team capacity updated');
    } catch (err) {
      console.error('Failed to update team capacity:', err);
      toast.error('Failed to update capacity');
      // Rollback on error
      set((s) => ({
        teams: s.teams.map((t) => {
          if (t.id !== id) return t;
          const restored: Team = { ...t };
          if (team.capacityConfig) {
            restored.capacityConfig = team.capacityConfig;
          } else {
            delete restored.capacityConfig;
          }
          return restored;
        }),
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

  updateThemeFavicon: async (id, faviconUrl) => {
    const theme = get().themes.find((t) => t.id === id);
    if (!theme) return;

    set((s) => ({
      themes: s.themes.map((t) => {
        if (t.id !== id) return t;
        const updated: Theme = { id: t.id, name: t.name };
        if (faviconUrl) updated.faviconUrl = faviconUrl;
        return updated;
      }),
    }));

    try {
      await client.models.Theme.update({ id, faviconUrl: faviconUrl || null });
    } catch (err) {
      console.error('Failed to update theme favicon:', err);
      set((s) => ({
        themes: s.themes.map((t) => {
          if (t.id !== id) return t;
          const restored: Theme = { id: t.id, name: t.name };
          if (theme.faviconUrl) restored.faviconUrl = theme.faviconUrl;
          return restored;
        }),
      }));
    }
  },

  // Dependency actions
  addDependency: async (fromInitiativeId, toInitiativeId, notes) => {
    // Prevent self-dependency
    if (fromInitiativeId === toInitiativeId) {
      toast.error('Cannot create a dependency on itself');
      return;
    }

    // Check if dependency already exists
    const dependencies = get().dependencies;
    const existing = dependencies.find(
      (d) => d.fromInitiativeId === fromInitiativeId && d.toInitiativeId === toInitiativeId
    );
    if (existing) {
      toast.error('Dependency already exists');
      return;
    }

    // Check for cycles
    if (wouldCreateCycle(dependencies, fromInitiativeId, toInitiativeId)) {
      toast.error('Cannot add dependency: would create a circular reference');
      return;
    }

    try {
      const createInput: { fromInitiativeId: string; toInitiativeId: string; notes?: string } = {
        fromInitiativeId,
        toInitiativeId,
      };
      if (notes) createInput.notes = notes;

      const result = await client.models.Dependency.create(createInput);

      if (result.data) {
        const newDependency: Dependency = {
          id: result.data.id,
          fromInitiativeId: result.data.fromInitiativeId,
          toInitiativeId: result.data.toInitiativeId,
        };
        if (result.data.notes) newDependency.notes = result.data.notes;
        set((s) => ({ dependencies: [...s.dependencies, newDependency] }));
        toast.success('Dependency added');
      }
    } catch (err) {
      console.error('Failed to add dependency:', err);
      toast.error('Failed to add dependency');
    }
  },

  removeDependency: async (id) => {
    const dependency = get().dependencies.find((d) => d.id === id);
    if (!dependency) return;

    // Optimistic update
    set((s) => ({
      dependencies: s.dependencies.filter((d) => d.id !== id),
    }));

    try {
      await client.models.Dependency.delete({ id });
      toast.success('Dependency removed');
    } catch (err) {
      console.error('Failed to remove dependency:', err);
      toast.error('Failed to remove dependency');
      // Rollback on error
      set((s) => ({ dependencies: [...s.dependencies, dependency] }));
    }
  },

  getDependenciesFor: (initiativeId) => {
    const dependencies = get().dependencies;
    return {
      // This initiative is blocked by these (fromInitiativeId blocks toInitiativeId)
      blockedBy: dependencies.filter((d) => d.toInitiativeId === initiativeId),
      // This initiative blocks these
      blocks: dependencies.filter((d) => d.fromInitiativeId === initiativeId),
    };
  },

  // Internal subscription handlers
  _applyInitiativeUpdate: (initiative) => {
    set((s) => {
      const existing = s.initiatives.find((i) => i.id === initiative.id);
      if (existing) {
        // Preserve local data if incoming has empty values
        const teamEfforts = Object.keys(initiative.teamEfforts).length > 0
          ? initiative.teamEfforts
          : existing.teamEfforts;
        const teamNotes = Object.keys(initiative.teamNotes).length > 0
          ? initiative.teamNotes
          : existing.teamNotes;
        const teamStartDates = Object.keys(initiative.teamStartDates).length > 0
          ? initiative.teamStartDates
          : existing.teamStartDates;
        return {
          initiatives: s.initiatives.map((i) =>
            i.id === initiative.id ? { ...initiative, teamEfforts, teamNotes, teamStartDates } : i
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
        const { [id]: _state, ...remainingStates } = init.teamStates;
        const { [id]: _effort, ...remainingEfforts } = init.teamEfforts;
        const { [id]: _notes, ...remainingNotes } = init.teamNotes;
        const { [id]: _startDate, ...remainingStartDates } = init.teamStartDates;
        return { ...init, teamStates: remainingStates, teamEfforts: remainingEfforts, teamNotes: remainingNotes, teamStartDates: remainingStartDates };
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

  _applyDependencyUpdate: (dependency) => {
    set((s) => {
      const exists = s.dependencies.some((d) => d.id === dependency.id);
      if (exists) {
        return { dependencies: s.dependencies.map((d) => (d.id === dependency.id ? dependency : d)) };
      }
      return { dependencies: [...s.dependencies, dependency] };
    });
  },

  _applyDependencyDelete: (id) => {
    set((s) => ({
      dependencies: s.dependencies.filter((d) => d.id !== id),
    }));
  },
}));
