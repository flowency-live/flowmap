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
  teamStartDates: Record<string, string>; // teamId -> estimated start date (e.g., "15th May")
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
  // N/A: Barely visible - stays very muted
  'N/A': {
    label: 'Not Applicable',
    short: 'N/A',
    bgColor: '#E5E7EB',
    textColor: '#9CA3AF',
    bgColorDark: '#1A1C1E',
    textColorDark: '#4B4F54',
  },
  // Not Started: Warm brown - visible but neutral
  'N/S': {
    label: 'Not Started',
    short: 'N/S',
    bgColor: '#8B7265',
    textColor: '#FFFFFF',
    bgColorDark: '#6B5545',
    textColorDark: '#E0D0C0',
  },
  // Discovery: Golden amber - distinct warm tone
  Discovery: {
    label: 'Discovery',
    short: 'Disc',
    bgColor: '#9C7C3C',
    textColor: '#FFFFFF',
    bgColorDark: '#8B6B2A',
    textColorDark: '#F0D890',
  },
  // Ready: Olive green - earthy but visible
  Ready: {
    label: 'Ready',
    short: 'Ready',
    bgColor: '#5A7A45',
    textColor: '#FFFFFF',
    bgColorDark: '#4A6A35',
    textColorDark: '#C0E0A0',
  },
  // Constrained: BRIGHT purple - must POP
  Constrained: {
    label: 'Constrained',
    short: 'Const',
    bgColor: '#7C3AED',
    textColor: '#FFFFFF',
    bgColorDark: '#A78BFA',
    textColorDark: '#FFFFFF',
    isEmphasis: true,
  },
  // Doing: Steel blue - professional but clear
  Doing: {
    label: 'Doing',
    short: 'Doing',
    bgColor: '#4A6A8A',
    textColor: '#FFFFFF',
    bgColorDark: '#4A6590',
    textColorDark: '#B0D0F0',
  },
  // Done: Forest green - clearly distinct from Ready
  Done: {
    label: 'Done',
    short: 'Done',
    bgColor: '#3A6A45',
    textColor: '#FFFFFF',
    bgColorDark: '#2A5A35',
    textColorDark: '#A0D4A0',
  },
  // Blocked: BRIGHT red - must POP
  Blocked: {
    label: 'Blocked',
    short: 'Block',
    bgColor: '#DC2626',
    textColor: '#FFFFFF',
    bgColorDark: '#F87171',
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
