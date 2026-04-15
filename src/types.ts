/**
 * FlowMap Type Definitions
 *
 * Core domain types for the portfolio flow intelligence system.
 */

export type FlowState =
  | 'NOT_STARTED'
  | 'IN_DISCOVERY'
  | 'READY'
  | 'IN_FLIGHT'
  | 'UAT'
  | 'DONE'
  | 'NA';

export interface Theme {
  id: string;
  name: string;
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
  notes: string;
  sequencingNotes: string;
  teamStates: Record<string, FlowState>; // teamId -> state
  teamEfforts: Record<string, Effort>; // teamId -> effort
}

export interface PortfolioState {
  themes: Theme[];
  teams: Team[];
  initiatives: Initiative[];
}

/**
 * State configuration for UI rendering
 */
export interface StateConfig {
  label: string;
  short: string;
  bgClass: string;
  textClass: string;
}

export const STATE_CONFIG: Record<FlowState, StateConfig> = {
  NOT_STARTED: {
    label: 'Not Started',
    short: 'NS',
    bgClass: 'bg-rose-500',
    textClass: 'text-white',
  },
  IN_DISCOVERY: {
    label: 'In Discovery',
    short: 'ID',
    bgClass: 'bg-blue-500',
    textClass: 'text-white',
  },
  READY: {
    label: 'Ready',
    short: 'RD',
    bgClass: 'bg-teal-500',
    textClass: 'text-white',
  },
  IN_FLIGHT: {
    label: 'In Flight',
    short: 'IF',
    bgClass: 'bg-violet-600',
    textClass: 'text-white',
  },
  UAT: {
    label: 'UAT',
    short: 'UT',
    bgClass: 'bg-amber-400',
    textClass: 'text-amber-950',
  },
  DONE: {
    label: 'Done',
    short: 'DN',
    bgClass: 'bg-emerald-500',
    textClass: 'text-white',
  },
  NA: {
    label: 'Not Required',
    short: '--',
    bgClass: 'bg-slate-200',
    textClass: 'text-slate-400',
  },
};

export const FLOW_STATES: FlowState[] = [
  'NOT_STARTED',
  'IN_DISCOVERY',
  'READY',
  'IN_FLIGHT',
  'UAT',
  'DONE',
  'NA',
];

/**
 * States that indicate active engagement
 */
export const ENGAGED_STATES: FlowState[] = [
  'IN_DISCOVERY',
  'READY',
  'IN_FLIGHT',
  'UAT',
  'DONE',
];
