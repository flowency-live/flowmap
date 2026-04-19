import React, { useState, useMemo, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { StatePicker } from '@/components/StatePicker';
import type { FlowState, Initiative, Effort } from '@/types';
import { FLOW_STATES, STATE_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

// States to show as columns (exclude N/A)
const KANBAN_STATES: FlowState[] = FLOW_STATES.filter((s) => s !== 'N/A');

export function TeamKanban() {
  const [match, params] = useRoute('/team/:teamId');
  const teamId = params?.teamId;

  const teams = usePortfolioStore((s) => s.teams);
  const initiatives = usePortfolioStore((s) => s.initiatives);
  const updateTeamState = usePortfolioStore((s) => s.updateTeamState);
  const updateTeamEffort = usePortfolioStore((s) => s.updateTeamEffort);
  const updateTeamNotes = usePortfolioStore((s) => s.updateTeamNotes);

  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [initialCollapseApplied, setInitialCollapseApplied] = useState(false);

  const team = useMemo(
    () => teams.find((t) => t.id === teamId),
    [teams, teamId]
  );

  // Filter to only initiatives where this team has work (not N/A)
  const relevantInitiatives = useMemo(() => {
    if (!teamId) return [];
    return initiatives.filter((init) => {
      const state = init.teamStates[teamId];
      return state && state !== 'N/A';
    });
  }, [initiatives, teamId]);

  // Get parent initiatives (no theme grouping - just flat list of parents)
  const parentInitiatives = useMemo(() => {
    return relevantInitiatives.filter((i) => !i.parentId);
  }, [relevantInitiatives]);

  // Get parents that have children
  const parentsWithChildren = useMemo(() => {
    return new Set(
      parentInitiatives
        .filter((p) => relevantInitiatives.some((c) => c.parentId === p.id))
        .map((p) => p.id)
    );
  }, [parentInitiatives, relevantInitiatives]);

  // Default to collapsed state when data loads
  useEffect(() => {
    if (parentInitiatives.length > 0 && !initialCollapseApplied) {
      // Collapse all parents
      setCollapsedParents(new Set(parentsWithChildren));
      setInitialCollapseApplied(true);
    }
  }, [parentInitiatives, parentsWithChildren, initialCollapseApplied]);

  // Expand/Collapse all functions
  const expandAll = () => {
    setCollapsedParents(new Set());
  };

  const collapseAll = () => {
    setCollapsedParents(new Set(parentsWithChildren));
  };

  const isAllCollapsed = collapsedParents.size === parentsWithChildren.size && parentsWithChildren.size > 0;

  const toggleParent = (parentId: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  };

  if (!match || !team || !teamId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Team not found</p>
          <Link
            href="/"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Heatmap
          </Link>
        </div>
      </div>
    );
  }

  const validTeamId: string = teamId;

  const handleStateChange = (initId: string, newState: FlowState) => {
    updateTeamState(initId, validTeamId, newState);
  };

  const handleEffortChange = (initId: string, effort: Effort | null) => {
    updateTeamEffort(initId, validTeamId, effort);
  };

  const handleNoteChange = (initId: string, note: string) => {
    updateTeamNotes(initId, validTeamId, note);
  };

  // Render initiative row
  const renderInitiativeRow = (
    init: Initiative,
    isChild: boolean,
    hasChildren: boolean
  ) => {
    const state = init.teamStates[validTeamId] ?? 'N/S';
    const effort = init.teamEfforts[validTeamId];
    const note = init.teamNotes[validTeamId];
    const isCollapsed = collapsedParents.has(init.id);

    return (
      <tr
        key={init.id}
        className={cn(
          'border-b border-border/50 hover:bg-muted/30 transition-colors',
          isChild && 'bg-muted/10'
        )}
      >
        {/* Initiative Name */}
        <td className="px-3 py-2">
          <div
            className={cn(
              'flex items-center gap-1.5',
              isChild && 'pl-5'
            )}
          >
            {hasChildren && !isChild && (
              <button
                onClick={() => toggleParent(init.id)}
                className="p-0.5 hover:bg-accent rounded"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}
            {isChild && (
              <span className="text-muted-foreground/50 text-xs">└</span>
            )}
            <span
              className={cn(
                'text-sm truncate max-w-[180px]',
                !isChild && 'font-medium'
              )}
              title={init.name}
            >
              {init.name}
            </span>
            {init.dueDate && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {init.dueDate}
              </span>
            )}
          </div>
        </td>

        {/* State columns */}
        {KANBAN_STATES.map((colState) => (
          <td key={colState} className="px-1 py-2 text-center">
            {state === colState ? (
              <StatePicker
                value={state}
                effort={effort}
                note={note}
                onChange={(s) => handleStateChange(init.id, s)}
                onEffortChange={(e) => handleEffortChange(init.id, e)}
                onNoteChange={(n) => handleNoteChange(init.id, n)}
                size="sm"
              />
            ) : (
              <div className="h-5" /> // Empty cell placeholder
            )}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1
              className={cn(
                'text-xl font-semibold flex items-center gap-2',
                team.isPrimaryConstraint && 'text-destructive'
              )}
            >
              {team.name} Workload
              {team.isPrimaryConstraint && <AlertTriangle className="h-5 w-5" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              {relevantInitiatives.length} active items
            </p>
          </div>
        </div>
        {/* Expand/Collapse All */}
        <button
          onClick={isAllCollapsed ? expandAll : collapseAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {isAllCollapsed ? 'Expand All' : 'Collapse All'}
        </button>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-y-scroll overflow-x-auto p-4">
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left table-fixed">
            <colgroup>
              <col className="w-[220px]" />
              {KANBAN_STATES.map((state) => (
                <col key={state} className="w-[80px]" />
              ))}
            </colgroup>
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Initiative</th>
                {KANBAN_STATES.map((state) => (
                  <th
                    key={state}
                    className="px-1 py-2.5 text-center"
                    style={{ color: STATE_CONFIG[state].textColor }}
                  >
                    <span className="text-[10px] font-semibold">
                      {STATE_CONFIG[state].short}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parentInitiatives.map((parent) => {
                const children = relevantInitiatives.filter(
                  (i) => i.parentId === parent.id
                );
                const hasChildren = children.length > 0;
                const isParentCollapsed = collapsedParents.has(parent.id);

                return (
                  <React.Fragment key={parent.id}>
                    {renderInitiativeRow(parent, false, hasChildren)}
                    {hasChildren &&
                      !isParentCollapsed &&
                      children.map((child) =>
                        renderInitiativeRow(child, true, false)
                      )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {parentInitiatives.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No active work for this team
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
