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

export interface Initiative {
  id: string;
  name: string;
  themeId: string;
  parentId: string | null;
  notes: string;
  sequencingNotes: string;
  teamStates: Record<string, FlowState>; // teamId -> state
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
