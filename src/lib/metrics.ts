import type { Initiative, FlowState } from '@/types';
import { ENGAGED_STATES } from '@/types';

/**
 * Calculate startability score for an initiative
 * Returns percentage of required teams that are engaged (not NA and not NOT_STARTED)
 */
export function getStartabilityScore(initiative: Initiative): number {
  const teamIds = Object.keys(initiative.teamStates);
  const requiredTeams = teamIds.filter(
    (teamId) => initiative.teamStates[teamId] !== 'NA'
  );

  if (requiredTeams.length === 0) return 0;

  const engagedTeams = requiredTeams.filter((teamId) => {
    const state = initiative.teamStates[teamId];
    return state !== undefined && ENGAGED_STATES.includes(state);
  });

  return Math.round((engagedTeams.length / requiredTeams.length) * 100);
}

/**
 * Check if initiative has zero engagement (all required teams are NOT_STARTED)
 */
export function isZeroEngagement(initiative: Initiative): boolean {
  const teamIds = Object.keys(initiative.teamStates);
  const requiredTeams = teamIds.filter(
    (teamId) => initiative.teamStates[teamId] !== 'NA'
  );

  if (requiredTeams.length === 0) return true;

  return requiredTeams.every(
    (teamId) => initiative.teamStates[teamId] === 'NOT_STARTED'
  );
}

/**
 * Count initiatives that have at least one team in READY state
 */
export function getReadyCount(initiatives: Initiative[]): number {
  return initiatives.filter((init) =>
    Object.values(init.teamStates).some((state) => state === 'READY')
  ).length;
}

/**
 * Calculate constraint load ratio for a team
 * Returns percentage of initiatives blocked by this team
 */
export function getConstraintLoadRatio(
  teamId: string,
  initiatives: Initiative[]
): number {
  if (initiatives.length === 0) return 0;

  const blockedCount = initiatives.filter((init) => {
    const state = init.teamStates[teamId];
    // Team is blocking if their state is NOT_STARTED while others are engaged
    if (state !== 'NOT_STARTED') return false;

    // Check if other teams are waiting (engaged but this team is holding things up)
    const otherTeams = Object.entries(init.teamStates).filter(
      ([id, s]) => id !== teamId && s !== 'NA'
    );
    return otherTeams.some(([, s]) => ENGAGED_STATES.includes(s));
  }).length;

  return Math.round((blockedCount / initiatives.length) * 100);
}

/**
 * Get initiatives blocked by a specific team
 */
export function getBlockedByTeam(
  teamId: string,
  initiatives: Initiative[]
): Initiative[] {
  return initiatives.filter((init) => {
    const state = init.teamStates[teamId];
    if (state !== 'NOT_STARTED') return false;

    const otherTeams = Object.entries(init.teamStates).filter(
      ([id, s]) => id !== teamId && s !== 'NA'
    );
    return otherTeams.some(([, s]) => ENGAGED_STATES.includes(s));
  });
}

/**
 * Get rollup state for a group of initiatives (most behind state wins)
 */
export function getRollupState(
  initiatives: Initiative[],
  teamId: string
): FlowState {
  const priority: FlowState[] = [
    'NOT_STARTED',
    'IN_DISCOVERY',
    'READY',
    'IN_FLIGHT',
    'UAT',
    'DONE',
    'NA',
  ];

  const states = initiatives.map((i) => i.teamStates[teamId] ?? 'NA');

  for (const state of priority) {
    if (states.includes(state)) return state;
  }

  return 'NA';
}

/**
 * Calculate average startability for a group of initiatives
 */
export function getAverageStartability(initiatives: Initiative[]): number {
  if (initiatives.length === 0) return 0;

  const total = initiatives.reduce(
    (sum, init) => sum + getStartabilityScore(init),
    0
  );

  return Math.round(total / initiatives.length);
}
