/**
 * FlowMap Type Definitions
 *
 * Core domain types for the portfolio flow intelligence system.
 *
 * Flow States (from roadmap):
 * N/A, N/S, Discovery, Ready, Constrained, Doing, Done, Blocked
 */

export type FlowState =
  | 'N/A'
  | 'N/S'
  | 'Discovery'
  | 'Ready'
  | 'Constrained'
  | 'Doing'
  | 'Done'
  | 'Blocked';

export interface Theme {
  id: string;
  name: string;
  faviconUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  isPrimaryConstraint: boolean;
}

export type Effort =
  | '1d'
  | '3d'
  | '1w'
  | '2w'
  | '3w'
  | '4w'
  | '5w'
  | '6w'
  | '7w'
  | '8w'
  | '9w'
  | '10w';

export const EFFORT_OPTIONS: { value: Effort; label: string }[] = [
  { value: '1d', label: '1 day' },
  { value: '3d', label: '3 days' },
  { value: '1w', label: '1 week' },
  { value: '2w', label: '2 weeks' },
  { value: '3w', label: '3 weeks' },
  { value: '4w', label: '4 weeks' },
  { value: '5w', label: '5 weeks' },
  { value: '6w', label: '6 weeks' },
  { value: '7w', label: '7 weeks' },
  { value: '8w', label: '8 weeks' },
  { value: '9w', label: '9 weeks' },
  { value: '10w', label: '10 weeks' },
];

export interface Initiative {
  id: string;
  name: string;
  themeId: string;
  parentId: string | null;
  order: number; // Explicit sort order (lower = higher in list)
  liveDate?: string | undefined; // Go-live date for parent initiatives (e.g., "LIVE 29th June")
  dueDate?: string | undefined; // UAT delivery date for child items (e.g., "15th May")
  notes: string;
  sequencingNotes: string;
  teamStates: Record<string, FlowState>; // teamId -> state
  teamEfforts: Record<string, Effort>; // teamId -> effort
  teamNotes: Record<string, string>; // teamId -> notes
}

export interface PortfolioState {
  themes: Theme[];
  teams: Team[];
  initiatives: Initiative[];
}

/**
 * State configuration for UI rendering
 * Colors match the Excel roadmap specification
 */
export interface StateConfig {
  label: string;
  short: string;
  bgColor: string; // Hex background color
  textColor: string; // Hex text color
}

export const STATE_CONFIG: Record<FlowState, StateConfig> = {
  // N/A: Subtle gray - this is noise, kill it visually
  'N/A': {
    label: 'Not Applicable',
    short: 'N/A',
    bgColor: '#F0F0F0',
    textColor: '#909090',
  },
  // Not Started: Bold amber - waiting, needs attention
  'N/S': {
    label: 'Not Started',
    short: 'N/S',
    bgColor: '#FFEDD5',
    textColor: '#C2410C',
  },
  // Discovery: Bold yellow - early stage exploration
  Discovery: {
    label: 'Discovery',
    short: 'Disc',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
  },
  // Ready: Lime/chartreuse - GO signal, can start but hasn't
  Ready: {
    label: 'Ready',
    short: 'Ready',
    bgColor: '#ECFCCB',
    textColor: '#4D7C0F',
  },
  // Constrained: Bold purple - bottleneck, must POP
  Constrained: {
    label: 'Constrained',
    short: 'Const',
    bgColor: '#E9D5FF',
    textColor: '#7C3AED',
  },
  // Doing: Bold blue - actively in progress
  Doing: {
    label: 'Doing',
    short: 'Doing',
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8',
  },
  // Done: Rich green - complete, success
  Done: {
    label: 'Done',
    short: 'Done',
    bgColor: '#BBF7D0',
    textColor: '#15803D',
  },
  // Blocked: Bold red - problem, must POP
  Blocked: {
    label: 'Blocked',
    short: 'Block',
    bgColor: '#FECACA',
    textColor: '#B91C1C',
  },
};

/**
 * Flow states in display order (for dropdowns, legends)
 */
export const FLOW_STATES: FlowState[] = [
  'N/S',
  'Discovery',
  'Ready',
  'Constrained',
  'Doing',
  'Done',
  'Blocked',
  'N/A',
];

/**
 * Rollup priority order: most urgent first
 * Used for computing parent status from children ("worst-status-wins")
 */
export const ROLLUP_PRIORITY: FlowState[] = [
  'Blocked', // 1 - highest urgency
  'Doing', // 2 - active work
  'Constrained', // 3 - capacity signal
  'Ready', // 4 - next in queue
  'Discovery', // 5 - exploratory
  'N/S', // 6 - known backlog
  'Done', // 7 - only if no live work
  'N/A', // 8 - lowest
];

/**
 * States that indicate active engagement (not backlog or N/A)
 */
export const ENGAGED_STATES: FlowState[] = [
  'Discovery',
  'Ready',
  'Constrained',
  'Doing',
  'Done',
];
