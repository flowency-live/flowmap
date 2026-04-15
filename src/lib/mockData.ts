import type { PortfolioState, Theme, Team, Initiative, FlowState } from '@/types';

/**
 * Mock data for development
 * Simulates a realistic portfolio with 4 themes, 6 teams, and ~15 initiatives
 */

export const mockThemes: Theme[] = [
  { id: 'theme-natwest', name: 'NatWest' },
  { id: 'theme-ms', name: 'M&S' },
  { id: 'theme-lbg', name: 'LBG' },
  { id: 'theme-aviva', name: 'Aviva' },
];

export const mockTeams: Team[] = [
  { id: 'team-upj', name: 'UPJ', isPrimaryConstraint: true },
  { id: 'team-upc', name: 'UPC', isPrimaryConstraint: false },
  { id: 'team-ember', name: 'Ember', isPrimaryConstraint: false },
  { id: 'team-logan', name: 'Logan', isPrimaryConstraint: false },
  { id: 'team-dataan', name: 'DataAn', isPrimaryConstraint: false },
  { id: 'team-dataen', name: 'DataEn', isPrimaryConstraint: false },
];

const createTeamStates = (
  states: Record<string, FlowState>
): Record<string, FlowState> => {
  const defaultStates: Record<string, FlowState> = {
    'team-upj': 'NOT_STARTED',
    'team-upc': 'NOT_STARTED',
    'team-ember': 'NOT_STARTED',
    'team-logan': 'NOT_STARTED',
    'team-dataan': 'NOT_STARTED',
    'team-dataen': 'NOT_STARTED',
  };
  return { ...defaultStates, ...states };
};

export const mockInitiatives: Initiative[] = [
  // NatWest Initiatives
  {
    id: 'init-nw-1',
    name: 'Customer Portal Redesign',
    themeId: 'theme-natwest',
    parentId: null,
    notes: 'High priority for Q2. Requires significant UPJ involvement.',
    sequencingNotes: 'Blocked on API team completion',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'IN_FLIGHT',
      'team-ember': 'READY',
      'team-logan': 'DONE',
      'team-dataan': 'NA',
      'team-dataen': 'NA',
    }),
  },
  {
    id: 'init-nw-2',
    name: 'Mobile App v2',
    themeId: 'theme-natwest',
    parentId: null,
    notes: 'Critical mobile banking update',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'IN_DISCOVERY',
      'team-upc': 'NOT_STARTED',
      'team-ember': 'IN_DISCOVERY',
      'team-logan': 'NA',
      'team-dataan': 'NA',
      'team-dataen': 'NA',
    }),
  },
  {
    id: 'init-nw-3',
    name: 'Payment Gateway Integration',
    themeId: 'theme-natwest',
    parentId: null,
    notes: 'New payment provider integration',
    sequencingNotes: 'Depends on security review',
    teamStates: createTeamStates({
      'team-upj': 'READY',
      'team-upc': 'READY',
      'team-ember': 'NOT_STARTED',
      'team-logan': 'READY',
      'team-dataan': 'IN_FLIGHT',
      'team-dataen': 'NA',
    }),
  },

  // M&S Initiatives
  {
    id: 'init-ms-1',
    name: 'Loyalty Program Overhaul',
    themeId: 'theme-ms',
    parentId: null,
    notes: 'Sparks loyalty program redesign',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'IN_FLIGHT',
      'team-ember': 'IN_FLIGHT',
      'team-logan': 'UAT',
      'team-dataan': 'DONE',
      'team-dataen': 'IN_FLIGHT',
    }),
  },
  {
    id: 'init-ms-2',
    name: 'Inventory Sync',
    themeId: 'theme-ms',
    parentId: null,
    notes: 'Real-time inventory across stores',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'DONE',
      'team-upc': 'DONE',
      'team-ember': 'UAT',
      'team-logan': 'DONE',
      'team-dataan': 'DONE',
      'team-dataen': 'DONE',
    }),
  },
  {
    id: 'init-ms-3',
    name: 'Click & Collect v3',
    themeId: 'theme-ms',
    parentId: null,
    notes: 'Enhanced pickup experience',
    sequencingNotes: 'Waiting on store ops sign-off',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'NOT_STARTED',
      'team-ember': 'NOT_STARTED',
      'team-logan': 'IN_DISCOVERY',
      'team-dataan': 'NA',
      'team-dataen': 'NA',
    }),
  },

  // LBG Initiatives
  {
    id: 'init-lbg-1',
    name: 'Open Banking APIs',
    themeId: 'theme-lbg',
    parentId: null,
    notes: 'PSD2 compliance and beyond',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'IN_FLIGHT',
      'team-upc': 'IN_FLIGHT',
      'team-ember': 'READY',
      'team-logan': 'NA',
      'team-dataan': 'IN_FLIGHT',
      'team-dataen': 'READY',
    }),
  },
  {
    id: 'init-lbg-2',
    name: 'Fraud Detection ML',
    themeId: 'theme-lbg',
    parentId: null,
    notes: 'Machine learning fraud detection',
    sequencingNotes: 'Requires data science team',
    teamStates: createTeamStates({
      'team-upj': 'NA',
      'team-upc': 'NA',
      'team-ember': 'NA',
      'team-logan': 'NA',
      'team-dataan': 'IN_FLIGHT',
      'team-dataen': 'IN_DISCOVERY',
    }),
  },
  {
    id: 'init-lbg-3',
    name: 'Branch Digital Signage',
    themeId: 'theme-lbg',
    parentId: null,
    notes: 'Digital displays in branches',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'READY',
      'team-ember': 'READY',
      'team-logan': 'NOT_STARTED',
      'team-dataan': 'NA',
      'team-dataen': 'NA',
    }),
  },

  // Aviva Initiatives
  {
    id: 'init-av-1',
    name: 'Claims Automation',
    themeId: 'theme-aviva',
    parentId: null,
    notes: 'Automated claims processing',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'NOT_STARTED',
      'team-ember': 'IN_DISCOVERY',
      'team-logan': 'NOT_STARTED',
      'team-dataan': 'READY',
      'team-dataen': 'NOT_STARTED',
    }),
  },
  {
    id: 'init-av-2',
    name: 'Policy Portal Refresh',
    themeId: 'theme-aviva',
    parentId: null,
    notes: 'Customer policy management',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'UAT',
      'team-upc': 'DONE',
      'team-ember': 'DONE',
      'team-logan': 'UAT',
      'team-dataan': 'NA',
      'team-dataen': 'NA',
    }),
  },
  {
    id: 'init-av-3',
    name: 'Telematics Integration',
    themeId: 'theme-aviva',
    parentId: null,
    notes: 'Car insurance telematics',
    sequencingNotes: 'Hardware dependency',
    teamStates: createTeamStates({
      'team-upj': 'NOT_STARTED',
      'team-upc': 'NOT_STARTED',
      'team-ember': 'NOT_STARTED',
      'team-logan': 'NOT_STARTED',
      'team-dataan': 'IN_DISCOVERY',
      'team-dataen': 'NOT_STARTED',
    }),
  },
  {
    id: 'init-av-4',
    name: 'Agent Dashboard',
    themeId: 'theme-aviva',
    parentId: null,
    notes: 'Insurance agent tooling',
    sequencingNotes: '',
    teamStates: createTeamStates({
      'team-upj': 'READY',
      'team-upc': 'IN_FLIGHT',
      'team-ember': 'IN_FLIGHT',
      'team-logan': 'READY',
      'team-dataan': 'DONE',
      'team-dataen': 'IN_FLIGHT',
    }),
  },
];

export const mockPortfolio: PortfolioState = {
  themes: mockThemes,
  teams: mockTeams,
  initiatives: mockInitiatives,
};
