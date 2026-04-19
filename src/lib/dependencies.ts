import type { Dependency } from '@/types';

/**
 * Dependency Graph Utilities
 *
 * Provides cycle detection and graph analysis for initiative dependencies.
 * A dependency relationship is: fromInitiativeId blocks toInitiativeId
 * (i.e., fromInitiative must complete before toInitiative can proceed)
 */

/**
 * Detects if adding a new dependency would create a cycle in the graph.
 *
 * @param dependencies - Current list of dependencies
 * @param fromId - The blocking initiative ID
 * @param toId - The blocked initiative ID
 * @returns true if adding this dependency would create a cycle
 */
export function wouldCreateCycle(
  dependencies: Dependency[],
  fromId: string,
  toId: string
): boolean {
  // Build adjacency list: fromId -> [toIds it blocks]
  const graph = new Map<string, Set<string>>();

  for (const dep of dependencies) {
    if (!graph.has(dep.fromInitiativeId)) {
      graph.set(dep.fromInitiativeId, new Set());
    }
    graph.get(dep.fromInitiativeId)!.add(dep.toInitiativeId);
  }

  // Add the proposed edge temporarily
  if (!graph.has(fromId)) {
    graph.set(fromId, new Set());
  }
  graph.get(fromId)!.add(toId);

  // Check if there's a path from toId back to fromId (would complete a cycle)
  const visited = new Set<string>();
  const stack = [toId];

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (current === fromId) {
      return true; // Found a cycle
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const neighbors = graph.get(current);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }

  return false;
}

/**
 * Gets all initiatives that block a given initiative (transitive closure)
 *
 * @param dependencies - List of dependencies
 * @param initiativeId - The initiative to check
 * @returns Array of initiative IDs that transitively block this initiative
 */
export function getAllBlockers(
  dependencies: Dependency[],
  initiativeId: string
): string[] {
  // Build reverse graph: toId -> [fromIds that block it]
  const reverseGraph = new Map<string, Set<string>>();

  for (const dep of dependencies) {
    if (!reverseGraph.has(dep.toInitiativeId)) {
      reverseGraph.set(dep.toInitiativeId, new Set());
    }
    reverseGraph.get(dep.toInitiativeId)!.add(dep.fromInitiativeId);
  }

  const blockers = new Set<string>();
  const stack = [initiativeId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const directBlockers = reverseGraph.get(current);
    if (directBlockers) {
      for (const blocker of directBlockers) {
        blockers.add(blocker);
        if (!visited.has(blocker)) {
          stack.push(blocker);
        }
      }
    }
  }

  return Array.from(blockers);
}

/**
 * Gets all initiatives that are blocked by a given initiative (transitive closure)
 *
 * @param dependencies - List of dependencies
 * @param initiativeId - The initiative to check
 * @returns Array of initiative IDs that are transitively blocked by this initiative
 */
export function getAllBlocked(
  dependencies: Dependency[],
  initiativeId: string
): string[] {
  // Build forward graph: fromId -> [toIds it blocks]
  const graph = new Map<string, Set<string>>();

  for (const dep of dependencies) {
    if (!graph.has(dep.fromInitiativeId)) {
      graph.set(dep.fromInitiativeId, new Set());
    }
    graph.get(dep.fromInitiativeId)!.add(dep.toInitiativeId);
  }

  const blocked = new Set<string>();
  const stack = [initiativeId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const directBlocked = graph.get(current);
    if (directBlocked) {
      for (const b of directBlocked) {
        blocked.add(b);
        if (!visited.has(b)) {
          stack.push(b);
        }
      }
    }
  }

  return Array.from(blocked);
}
