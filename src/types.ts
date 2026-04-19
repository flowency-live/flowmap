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

/**
 * Team capacity configuration for timeline planning
 * - streams: Number of parallel work streams (e.g., 2 for UPJ)
 * - streamPct: Capacity percentage per stream (e.g., 45%)
 * - bauPct: BAU allocation percentage (e.g., 10%)
 */
export interface TeamCapacity {
  streams: number;
  streamPct: number;
  bauPct: number;
}

export interface Team {
  id: string;
  name: string;
  isPrimaryConstraint: boolean;
  capacityConfig?: TeamCapacity;
}

/**
 * Dependency - Cross-initiative blocking relationship
 * - fromInitiativeId: The blocking initiative (must complete first)
 * - toInitiativeId: The blocked initiative (waiting on fromInitiative)
 */
export interface Dependency {
  id: string;
  fromInitiativeId: string;
  toInitiativeId: string;
  notes?: string;
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
  faviconUrl?: string; // Brand favicon/logo URL for parent initiatives
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
 * High-saturation colors for instant pattern recognition
 * This is a system heatmap: colour = meaning, density = speed, contrast = decision-making
 */
export interface StateConfig {
  label: string;
  short: string;
  bgColor: string; // Hex background color (light mode)
  textColor: string; // Hex text color (light mode)
  bgColorDark: string; // Hex background color (dark mode)
  textColorDark: string; // Hex text color (dark mode)
  isEmphasis?: boolean; // Constrained + Blocked should visually "pop"
}

export const STATE_CONFIG: Record<FlowState, StateConfig> = {
  // N/A: Faded - this is noise, kill it visually
  'N/A': {
    label: 'Not Applicable',
    short: 'N/A',
    bgColor: '#F3F4F6',
    textColor: '#9CA3AF',
    bgColorDark: '#1F2937',
    textColorDark: '#6B7280',
  },
  // Not Started: Orange - waiting, needs attention
  'N/S': {
    label: 'Not Started',
    short: 'N/S',
    bgColor: '#FB923C',
    textColor: '#1F2937',
    bgColorDark: '#FB923C',
    textColorDark: '#0B0F19',
  },
  // Discovery: Amber - early stage exploration
  Discovery: {
    label: 'Discovery',
    short: 'Disc',
    bgColor: '#F59E0B',
    textColor: '#1F2937',
    bgColorDark: '#FBBF24',
    textColorDark: '#0B0F19',
  },
  // Ready: Vibrant lime - GO signal
  Ready: {
    label: 'Ready',
    short: 'Ready',
    bgColor: '#84CC16',
    textColor: '#1F2937',
    bgColorDark: '#A3E635',
    textColorDark: '#0B0F19',
  },
  // Constrained: Strong purple - bottleneck, must POP
  Constrained: {
    label: 'Constrained',
    short: 'Const',
    bgColor: '#7C3AED',
    textColor: '#FFFFFF',
    bgColorDark: '#8B5CF6',
    textColorDark: '#FFFFFF',
    isEmphasis: true,
  },
  // Doing: Deep blue - actively in progress
  Doing: {
    label: 'Doing',
    short: 'Doing',
    bgColor: '#2563EB',
    textColor: '#FFFFFF',
    bgColorDark: '#3B82F6',
    textColorDark: '#FFFFFF',
  },
  // Done: Strong green - complete, success
  Done: {
    label: 'Done',
    short: 'Done',
    bgColor: '#16A34A',
    textColor: '#FFFFFF',
    bgColorDark: '#22C55E',
    textColorDark: '#FFFFFF',
  },
  // Blocked: Strong red - problem, must POP
  Blocked: {
    label: 'Blocked',
    short: 'Block',
    bgColor: '#DC2626',
    textColor: '#FFFFFF',
    bgColorDark: '#EF4444',
    textColorDark: '#FFFFFF',
    isEmphasis: true,
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
