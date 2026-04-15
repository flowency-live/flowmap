import { create } from 'zustand';
import type { Theme, Team, Initiative, FlowState, PortfolioState } from '@/types';
import { mockPortfolio } from '@/lib/mockData';
import { generateId } from '@/lib/utils';

interface PortfolioStore extends PortfolioState {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Initiative actions
  updateTeamState: (initiativeId: string, teamId: string, state: FlowState) => void;
  addInitiative: (themeId: string, name: string, parentId?: string | null) => void;
  removeInitiative: (id: string) => void;
  renameInitiative: (id: string, name: string) => void;
  updateNotes: (id: string, notes: string) => void;
  updateSequencingNotes: (id: string, notes: string) => void;

  // Team actions
  addTeam: (name: string) => void;
  removeTeam: (id: string) => void;
  renameTeam: (id: string, name: string) => void;

  // Theme actions
  addTheme: (name: string) => void;
  removeTheme: (id: string) => void;
  renameTheme: (id: string, name: string) => void;

  // Sync action (for future AppSync integration)
  syncPortfolio: (data: PortfolioState) => void;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  // Initial state from mock data
  themes: mockPortfolio.themes,
  teams: mockPortfolio.teams,
  initiatives: mockPortfolio.initiatives,
  isLoading: false,
  error: null,

  // Initiative actions
  updateTeamState: (initiativeId, teamId, state) => {
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === initiativeId
          ? { ...init, teamStates: { ...init.teamStates, [teamId]: state } }
          : init
      ),
    }));
  },

  addInitiative: (themeId, name, parentId = null) => {
    const teams = get().teams;
    const defaultStates: Record<string, FlowState> = {};
    teams.forEach((team) => {
      defaultStates[team.id] = 'NOT_STARTED';
    });

    const newInitiative: Initiative = {
      id: `init-${generateId()}`,
      name,
      themeId,
      parentId,
      notes: '',
      sequencingNotes: '',
      teamStates: defaultStates,
    };

    set((s) => ({
      initiatives: [...s.initiatives, newInitiative],
    }));
  },

  removeInitiative: (id) => {
    set((s) => ({
      // Remove the initiative and all its children
      initiatives: s.initiatives.filter(
        (init) => init.id !== id && init.parentId !== id
      ),
    }));
  },

  renameInitiative: (id, name) => {
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, name } : init
      ),
    }));
  },

  updateNotes: (id, notes) => {
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, notes } : init
      ),
    }));
  },

  updateSequencingNotes: (id, notes) => {
    set((s) => ({
      initiatives: s.initiatives.map((init) =>
        init.id === id ? { ...init, sequencingNotes: notes } : init
      ),
    }));
  },

  // Team actions
  addTeam: (name) => {
    const id = `team-${generateId()}`;
    const newTeam: Team = {
      id,
      name,
      isPrimaryConstraint: false,
    };

    set((s) => ({
      teams: [...s.teams, newTeam],
      // Add NOT_STARTED state for new team to all initiatives
      initiatives: s.initiatives.map((init) => ({
        ...init,
        teamStates: { ...init.teamStates, [id]: 'NOT_STARTED' as FlowState },
      })),
    }));
  },

  removeTeam: (id) => {
    set((s) => ({
      teams: s.teams.filter((t) => t.id !== id),
      // Remove team state from all initiatives
      initiatives: s.initiatives.map((init) => {
        const { [id]: _, ...remainingStates } = init.teamStates;
        return { ...init, teamStates: remainingStates };
      }),
    }));
  },

  renameTeam: (id, name) => {
    set((s) => ({
      teams: s.teams.map((t) => (t.id === id ? { ...t, name } : t)),
    }));
  },

  // Theme actions
  addTheme: (name) => {
    const newTheme: Theme = {
      id: `theme-${generateId()}`,
      name,
    };

    set((s) => ({
      themes: [...s.themes, newTheme],
    }));
  },

  removeTheme: (id) => {
    set((s) => ({
      themes: s.themes.filter((t) => t.id !== id),
      // Remove all initiatives in this theme
      initiatives: s.initiatives.filter((init) => init.themeId !== id),
    }));
  },

  renameTheme: (id, name) => {
    set((s) => ({
      themes: s.themes.map((t) => (t.id === id ? { ...t, name } : t)),
    }));
  },

  // Sync from external source (AppSync)
  syncPortfolio: (data) => {
    set({
      themes: data.themes,
      teams: data.teams,
      initiatives: data.initiatives,
    });
  },
}));
