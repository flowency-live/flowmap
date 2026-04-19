import type { Initiative, FlowState, Team } from '@/types';
import { ENGAGED_STATES, ROLLUP_PRIORITY } from '@/types';

/**
 * Count items with any team actively working (Doing state)
 */
export function getInProgressCount(initiatives: Initiative[]): number {
  return initiatives.filter((init) =>
    Object.values(init.teamStates).some((state) => state === 'Doing')
  ).length;
}

/**
 * Count items with any team blocked
 */
export function getBlockedCount(initiatives: Initiative[]): number {
  return initiatives.filter((init) =>
    Object.values(init.teamStates).some((state) => state === 'Blocked')
  ).length;
}

/**
 * Count items waiting to progress (Ready or Constrained, but no team Doing yet)
 */
export function getWaitingCount(initiatives: Initiative[]): number {
  return initiatives.filter((init) => {
    const states = Object.values(init.teamStates);
    const hasWaiting = states.some(
      (s) => s === 'Ready' || s === 'Constrained'
    );
    const hasDoing = states.some((s) => s === 'Doing');
    return hasWaiting && !hasDoing;
  }).length;
}

/**
 * Find the team that is blocking the most work
 * Returns team with highest count of items where they're N/S/Constrained while others are engaged
 */
export function getBottleneckTeam(
  teams: Team[],
  initiatives: Initiative[]
): { team: Team; count: number } | null {
  if (teams.length === 0 || initiatives.length === 0) return null;

  let maxTeam: Team | null = null;
  let maxCount = 0;

  teams.forEach((team) => {
    const blockingCount = initiatives.filter((init) => {
      const state = init.teamStates[team.id];
      if (state === 'N/A' || state === 'Done' || state === 'Doing') return false;

      // Check if other teams are further along
      const otherTeams = Object.entries(init.teamStates).filter(
        ([id, s]) => id !== team.id && s !== 'N/A'
      );
      return otherTeams.some(
        ([, s]) => s === 'Doing' || s === 'Ready' || s === 'Done'
      );
    }).length;

    if (blockingCount > maxCount) {
      maxCount = blockingCount;
      maxTeam = team;
    }
  });

  return maxTeam ? { team: maxTeam, count: maxCount } : null;
}

/**
 * Calculate startability score for an initiative
 * Returns percentage of required teams that are engaged (not N/A and not N/S)
 */
export function getStartabilityScore(initiative: Initiative): number {
  const teamIds = Object.keys(initiative.teamStates);
  const requiredTeams = teamIds.filter(
    (teamId) => initiative.teamStates[teamId] !== 'N/A'
  );

  if (requiredTeams.length === 0) return 0;

  const engagedTeams = requiredTeams.filter((teamId) => {
    const state = initiative.teamStates[teamId];
    return state !== undefined && ENGAGED_STATES.includes(state);
  });

  return Math.round((engagedTeams.length / requiredTeams.length) * 100);
}

/**
 * Check if initiative has zero engagement (all required teams are N/S)
 */
export function isZeroEngagement(initiative: Initiative): boolean {
  const teamIds = Object.keys(initiative.teamStates);
  const requiredTeams = teamIds.filter(
    (teamId) => initiative.teamStates[teamId] !== 'N/A'
  );

  if (requiredTeams.length === 0) return true;

  return requiredTeams.every(
    (teamId) => initiative.teamStates[teamId] === 'N/S'
  );
}

/**
 * Count initiatives that have at least one team in Ready state
 */
export function getReadyCount(initiatives: Initiative[]): number {
  return initiatives.filter((init) =>
    Object.values(init.teamStates).some((state) => state === 'Ready')
  ).length;
}

/**
 * Calculate constraint load ratio for a team
 * Returns percentage of initiatives where this team is Constrained or N/S while others are engaged
 */
export function getConstraintLoadRatio(
  teamId: string,
  initiatives: Initiative[]
): number {
  if (initiatives.length === 0) return 0;

  const constrainedCount = initiatives.filter((init) => {
    const state = init.teamStates[teamId];
    // Team is a constraint if their state is N/S or Constrained while others are engaged
    if (state !== 'N/S' && state !== 'Constrained') return false;

    // Check if other teams are waiting (engaged but this team is holding things up)
    const otherTeams = Object.entries(init.teamStates).filter(
      ([id, s]) => id !== teamId && s !== 'N/A'
    );
    return otherTeams.some(([, s]) => ENGAGED_STATES.includes(s));
  }).length;

  return Math.round((constrainedCount / initiatives.length) * 100);
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
    if (state !== 'N/S' && state !== 'Constrained') return false;

    const otherTeams = Object.entries(init.teamStates).filter(
      ([id, s]) => id !== teamId && s !== 'N/A'
    );
    return otherTeams.some(([, s]) => ENGAGED_STATES.includes(s));
  });
}

/**
 * Get rollup state for a group of initiatives ("worst-status-wins")
 * Uses ROLLUP_PRIORITY: Blocked -> Doing -> Constrained -> Ready -> Discovery -> N/S -> Done -> N/A
 */
export function getRollupState(
  initiatives: Initiative[],
  teamId: string
): FlowState {
  const states = initiatives.map((i) => i.teamStates[teamId] ?? 'N/A');

  // Return the most urgent state (lowest index in priority order)
  for (const state of ROLLUP_PRIORITY) {
    if (states.includes(state)) return state;
  }

  return 'N/A';
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
