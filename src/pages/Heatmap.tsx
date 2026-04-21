import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { format, parse } from 'date-fns';
import { enGB } from 'date-fns/locale';
import {
  Activity,
  OctagonX,
  Hourglass,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronsDownUp,
  ChevronsUpDown,
  Calendar as CalendarIcon,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { KpiCard } from '@/components/KpiCard';
import { StateBadge, STATE_LEGEND_ITEMS } from '@/components/StateBadge';
import { StatePicker } from '@/components/StatePicker';
import { InitiativeDetail } from '@/components/InitiativeDetail';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { usePortfolioStore } from '@/stores/portfolioStore';
import {
  getInProgressCount,
  getBlockedCount,
  getWaitingCount,
  getBottleneckTeam,
  getRollupState,
} from '@/lib/metrics';
import { calculateTeamRisk } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { Initiative, Effort, FlowState } from '@/types';

// Helper to parse date string like "15th May" or "LIVE 29th June" to Date
function parseDateString(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  // Remove "LIVE " prefix if present
  const cleaned = dateStr.replace(/^LIVE\s+/i, '').trim();
  // Try parsing "29th June" format
  const match = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
  if (match && match[1] && match[2]) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2];
    const year = new Date().getFullYear();
    const parsed = parse(`${day} ${monthStr} ${year}`, 'd MMMM yyyy', new Date(), { locale: enGB });
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

// Format Date to display string like "29th June"
function formatDateString(date: Date, isLiveDate: boolean): string {
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd' : 'th';
  const monthName = format(date, 'MMMM', { locale: enGB });
  const formatted = `${day}${suffix} ${monthName}`;
  return isLiveDate ? `LIVE ${formatted}` : formatted;
}

// Inline input component for adding items
function InlineInput({
  placeholder,
  onConfirm,
  onCancel,
}: {
  placeholder: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={handleConfirm}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-b border-primary text-sm outline-none py-1 min-w-0"
      />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
        className="text-emerald-500 hover:text-emerald-600"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onCancel();
        }}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Heatmap() {
  const {
    themes,
    teams,
    initiatives,
    updateTeamState,
    updateTeamEffort,
    updateTeamNotes,
    updateTeamStartDate,
    updateLiveDate,
    updateDueDate,
    addInitiative,
    removeInitiative,
    renameInitiative,
    addTeam,
    removeTeam,
  } = usePortfolioStore();

  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [collapsedInitiatives, setCollapsedInitiatives] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [addingInitToTheme, setAddingInitToTheme] = useState<string | null>(null);
  const [addingChildToParent, setAddingChildToParent] = useState<string | null>(null);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamValue, setAddTeamValue] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // Filter initiatives by theme
  const filteredInitiatives =
    selectedTheme === 'all'
      ? initiatives
      : initiatives.filter((i) => i.themeId === selectedTheme);

  // Get leaf initiatives (no children) for metrics
  const leafInitiatives = initiatives.filter(
    (i) => !initiatives.some((child) => child.parentId === i.id)
  );

  // KPI calculations - actionable metrics
  const inProgressCount = getInProgressCount(leafInitiatives);
  const blockedCount = getBlockedCount(leafInitiatives);
  const waitingCount = getWaitingCount(leafInitiatives);
  const bottleneck = getBottleneckTeam(teams, leafInitiatives);

  // Get parent initiatives (top level) - preserve original order from data
  const parentInitiatives = useMemo(() => {
    return filteredInitiatives.filter((i) => i.parentId === null);
  }, [filteredInitiatives]);

  // Get parent IDs that have children (for expand/collapse)
  const parentsWithChildren = useMemo(() => {
    return new Set(
      parentInitiatives
        .filter((p) => filteredInitiatives.some((c) => c.parentId === p.id))
        .map((p) => p.id)
    );
  }, [parentInitiatives, filteredInitiatives]);

  // Start collapsed on initial load - collapse ALL parent initiatives
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && initiatives.length > 0) {
      const allParentIds = initiatives
        .filter((i) => i.parentId === null)
        .map((i) => i.id);
      setCollapsedInitiatives(new Set(allParentIds));
      hasInitializedRef.current = true;
    }
  }, [initiatives]);

  const toggleInitiative = (initId: string) => {
    setCollapsedInitiatives((prev) => {
      const next = new Set(prev);
      if (next.has(initId)) {
        next.delete(initId);
      } else {
        next.add(initId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedInitiatives(new Set());
  };

  const collapseAll = () => {
    setCollapsedInitiatives(new Set(parentsWithChildren));
  };

  const handleAddTeam = () => {
    const name = addTeamValue.trim();
    if (name) {
      addTeam(name);
      setAddTeamValue('');
      setAddTeamOpen(false);
    }
  };

  const startRename = (init: Initiative) => {
    setRenamingId(init.id);
    setRenameValue(init.name);
  };

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameInitiative(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  // Keep selectedInit in sync with initiatives updates
  useEffect(() => {
    if (selectedInit) {
      const updated = initiatives.find((i) => i.id === selectedInit.id);
      if (updated) {
        setSelectedInit(updated);
      }
    }
  }, [initiatives, selectedInit]);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-5 space-y-4 overflow-y-scroll overflow-x-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-display">
              Portfolio Heatmap
            </h1>
            <p className="text-muted-foreground text-sm">
              Cross-team delivery states and upstream bottlenecks
            </p>
          </div>
          <div className="w-56">
            <Select value={selectedTheme} onValueChange={setSelectedTheme}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Filter by Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KpiCard
            title="In Progress"
            value={inProgressCount}
            icon={Activity}
            variant={inProgressCount > 0 ? 'default' : 'warning'}
          />
          <KpiCard
            title="Blocked"
            value={blockedCount}
            icon={OctagonX}
            variant={blockedCount > 0 ? 'destructive' : 'default'}
          />
          <KpiCard
            title="Waiting"
            value={waitingCount}
            icon={Hourglass}
            variant={waitingCount > 3 ? 'warning' : 'default'}
            subtitle="Ready or Constrained"
          />
          <KpiCard
            title="Bottleneck"
            value={bottleneck?.count ?? 0}
            icon={AlertTriangle}
            variant={bottleneck && bottleneck.count > 0 ? 'warning' : 'default'}
            subtitle={bottleneck?.team.name ?? 'None identified'}
          />
        </div>

        {/* Legend + Expand/Collapse Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Legend
            </span>
            {STATE_LEGEND_ITEMS.map(({ state }) => (
              <StateBadge key={state} state={state} />
            ))}
          </div>
          {parentsWithChildren.size > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={expandAll}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border hover:border-primary"
              >
                <ChevronsUpDown className="h-3 w-3" />
                Expand
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded border border-border hover:border-primary"
              >
                <ChevronsDownUp className="h-3 w-3" />
                Collapse
              </button>
            </div>
          )}
        </div>

        {/* Matrix Table */}
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-fixed">
              <colgroup>
                <col className="w-[200px]" />
                <col className="w-[90px]" />
                {teams.map((team) => (
                  <col key={team.id} className="w-[72px]" />
                ))}
                <col className="w-[40px]" />
              </colgroup>
              <thead className="text-xs text-muted-foreground uppercase bg-black/20 border-b border-[#2A3040]">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">Initiative</th>
                  <th className="px-2 py-1.5 font-semibold">Date</th>
                  {teams.map((team) => (
                    <th key={team.id} className="px-1 py-1.5 font-semibold text-center group">
                      <div className="flex items-center justify-center gap-0.5 relative">
                        <Link
                          href={`/team/${team.id}`}
                          className={cn(
                            'text-sm font-semibold normal-case hover:underline transition-colors',
                            team.isPrimaryConstraint ? 'text-destructive hover:text-destructive/80' : 'hover:text-primary'
                          )}
                        >
                          {team.name}
                          {team.isPrimaryConstraint && (
                            <AlertTriangle className="inline h-3 w-3 ml-0.5" />
                          )}
                        </Link>
                        {teams.length > 1 && (
                          <ConfirmDelete
                            trigger={
                              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity absolute -right-1 top-0">
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            }
                            title={`Delete "${team.name}"?`}
                            description="This will remove this team column from all initiatives."
                            onConfirm={() => removeTeam(team.id)}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                  {/* Add Team Column */}
                  <th className="px-1 py-1.5 text-center">
                    <Popover open={addTeamOpen} onOpenChange={setAddTeamOpen}>
                      <PopoverTrigger asChild>
                        <button className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors text-[10px] font-medium px-1 py-0.5 rounded border border-dashed border-border hover:border-primary">
                          <Plus className="h-2.5 w-2.5" />
                          Team
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          New Team
                        </p>
                        <div className="flex gap-1.5">
                          <input
                            autoFocus
                            value={addTeamValue}
                            onChange={(e) => setAddTeamValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddTeam();
                              if (e.key === 'Escape') setAddTeamOpen(false);
                            }}
                            placeholder="Team name..."
                            className="flex-1 text-sm border border-border rounded px-2 py-1 bg-background outline-none focus:border-primary"
                          />
                          <button
                            onClick={handleAddTeam}
                            className="bg-primary text-primary-foreground rounded px-2 py-1 text-xs font-medium hover:bg-primary/90"
                          >
                            Add
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>
                </tr>
              </thead>

              <tbody>
                {parentInitiatives.map((parentInit) => {
                  const children = filteredInitiatives.filter(
                    (i) => i.parentId === parentInit.id
                  );
                  const hasChildren = children.length > 0;
                  const isCollapsed = collapsedInitiatives.has(parentInit.id);
                  const isRenaming = renamingId === parentInit.id;
                  const isSelected = selectedInit?.id === parentInit.id;

                  // For parents with children, compute rollup from children
                  const displayStates = hasChildren
                    ? teams.reduce((acc, team) => {
                        acc[team.id] = getRollupState(children, team.id);
                        return acc;
                      }, {} as Record<string, FlowState>)
                    : parentInit.teamStates;

                  // Check for constraint signals
                  const states = Object.values(displayStates);
                  const hasBlocked = states.includes('Blocked');
                  const hasConstrained = states.includes('Constrained');
                  const constraintBorder = hasBlocked
                    ? 'border-l-2 border-l-red-500'
                    : hasConstrained
                      ? 'border-l-2 border-l-violet-500'
                      : '';

                  const rows: React.ReactNode[] = [];

                  // Parent Initiative Row
                  rows.push(
                    <tr
                      key={parentInit.id}
                      className={cn(
                        'border-t border-t-[#2A3040] border-b border-[#1E2430] cursor-pointer transition-colors group',
                        constraintBorder,
                        hasChildren
                          ? 'bg-black/10 hover:bg-black/20'
                          : 'bg-transparent hover:bg-black/10',
                        isSelected && 'bg-primary/10 hover:bg-primary/15'
                      )}
                      onClick={() => setSelectedInit(parentInit)}
                    >
                      <td className="px-2 py-1 h-7">
                        <div className="flex items-center gap-1.5">
                          {hasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleInitiative(parentInit.id);
                              }}
                              className="text-muted-foreground hover:text-foreground flex-shrink-0"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                          {!hasChildren && <span className="w-3.5 flex-shrink-0" />}
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmRename();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onBlur={confirmRename}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-transparent border-b border-primary text-sm font-medium outline-none py-0.5"
                            />
                          ) : (
                            <div className="flex items-center gap-1 min-w-0">
                              {parentInit.faviconUrl && (
                                <img
                                  src={parentInit.faviconUrl}
                                  alt=""
                                  className="h-4 w-4 rounded-sm object-contain shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <span
                                className={cn(
                                  'truncate text-sm',
                                  hasChildren ? 'font-semibold' : 'font-medium'
                                )}
                              >
                                {parentInit.name}
                                {hasChildren && (
                                  <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                    ({children.length})
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(parentInit);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity flex-shrink-0"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingChildToParent(parentInit.id);
                                  // Expand if collapsed so user sees the new input
                                  if (collapsedInitiatives.has(parentInit.id)) {
                                    setCollapsedInitiatives((prev) => {
                                      const next = new Set(prev);
                                      next.delete(parentInit.id);
                                      return next;
                                    });
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0"
                                title="Add child item"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                                <ConfirmDelete
                                  trigger={
                                    <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  }
                                  title={`Delete "${parentInit.name}"?`}
                                  description={
                                    hasChildren
                                      ? 'This will delete this initiative and all its child items.'
                                      : 'This will delete this initiative.'
                                  }
                                  onConfirm={() => removeInitiative(parentInit.id)}
                                />
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-1.5 py-1 h-8" onClick={(e) => e.stopPropagation()}>
                        <Popover
                          open={editingDateId === parentInit.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingDateId(parentInit.id);
                            } else {
                              setEditingDateId(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button className="w-full text-left flex items-center gap-1 hover:bg-muted/50 rounded px-1 -mx-1 py-0.5">
                              {parentInit.liveDate ? (
                                <span className="text-xs font-medium text-primary truncate">
                                  {parentInit.liveDate}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                                  <CalendarIcon className="h-3 w-3" />
                                  Add
                                </span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={parseDateString(parentInit.liveDate ?? '')}
                              onSelect={(date) => {
                                if (date) {
                                  updateLiveDate(parentInit.id, formatDateString(date, true));
                                }
                                setEditingDateId(null);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>
                      {teams.map((team) => (
                        <td
                          key={team.id}
                          className="px-0.5 py-1 text-center h-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            {hasChildren ? (
                              <StateBadge
                                state={displayStates[team.id] ?? 'N/A'}
                                size="lg"
                              />
                            ) : (
                              <StatePicker
                                value={parentInit.teamStates[team.id] ?? 'N/S'}
                                effort={parentInit.teamEfforts[team.id]}
                                note={parentInit.teamNotes[team.id]}
                                onChange={(state) =>
                                  updateTeamState(parentInit.id, team.id, state)
                                }
                                onEffortChange={(effort: Effort | null) =>
                                  updateTeamEffort(parentInit.id, team.id, effort)
                                }
                                onNoteChange={(note) =>
                                  updateTeamNotes(parentInit.id, team.id, note)
                                }
                              />
                            )}
                          </div>
                        </td>
                      ))}
                      <td className="h-7" />
                    </tr>
                  );

                  // Child rows (only when expanded)
                  if (hasChildren && !isCollapsed) {
                    children.forEach((child) => {
                      const isChildRenaming = renamingId === child.id;
                      const isChildSelected = selectedInit?.id === child.id;

                      // Check child constraint signals
                      const childStates = Object.values(child.teamStates);
                      const childHasBlocked = childStates.includes('Blocked');
                      const childHasConstrained = childStates.includes('Constrained');
                      const childConstraintBorder = childHasBlocked
                        ? 'border-l-2 border-l-red-500'
                        : childHasConstrained
                          ? 'border-l-2 border-l-violet-500'
                          : '';

                      rows.push(
                        <tr
                          key={child.id}
                          className={cn(
                            'border-b border-[#1E2430] hover:bg-black/10 cursor-pointer transition-colors group',
                            childConstraintBorder,
                            isChildSelected && 'bg-primary/10 hover:bg-primary/15'
                          )}
                          onClick={() => setSelectedInit(child)}
                        >
                          <td className="px-2 py-0.5 pl-6 h-6">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground text-xs shrink-0">└</span>
                              {isChildRenaming ? (
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmRename();
                                    if (e.key === 'Escape') setRenamingId(null);
                                  }}
                                  onBlur={confirmRename}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 bg-transparent border-b border-primary text-sm outline-none py-0.5"
                                />
                              ) : (
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate text-sm">
                                    {child.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRename(child);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0"
                                  >
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    <ConfirmDelete
                                      trigger={
                                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      }
                                      title={`Delete "${child.name}"?`}
                                      description="This will delete this item."
                                      onConfirm={() => removeInitiative(child.id)}
                                    />
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-1.5 py-0.5 h-7" onClick={(e) => e.stopPropagation()}>
                            <Popover
                              open={editingDateId === child.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditingDateId(child.id);
                                } else {
                                  setEditingDateId(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button className="w-full text-left flex items-center gap-1 hover:bg-muted/50 rounded px-1 -mx-1 py-0.5">
                                  {child.dueDate ? (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {child.dueDate}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                                      <CalendarIcon className="h-3 w-3" />
                                      Add
                                    </span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parseDateString(child.dueDate ?? '')}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateDueDate(child.id, formatDateString(date, false));
                                    }
                                    setEditingDateId(null);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </td>
                          {teams.map((team) => {
                            const risk = calculateTeamRisk(child, team.id);
                            return (
                              <td
                                key={team.id}
                                className="px-0.5 py-0.5 text-center h-7"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center">
                                  <StatePicker
                                    value={child.teamStates[team.id] ?? 'N/S'}
                                    effort={child.teamEfforts[team.id]}
                                    note={child.teamNotes[team.id]}
                                    startDate={child.teamStartDates?.[team.id]}
                                    isAtRisk={risk.isAtRisk}
                                    onChange={(state) =>
                                      updateTeamState(child.id, team.id, state)
                                    }
                                    onEffortChange={(effort: Effort | null) =>
                                      updateTeamEffort(child.id, team.id, effort)
                                    }
                                    onNoteChange={(note) =>
                                      updateTeamNotes(child.id, team.id, note)
                                    }
                                    onStartDateChange={(startDate) =>
                                      updateTeamStartDate(child.id, team.id, startDate)
                                    }
                                  />
                                </div>
                              </td>
                            );
                          })}
                          <td className="h-7" />
                        </tr>
                      );
                    });
                  }

                  // Add child input row (when expanded or adding child to this parent)
                  if (addingChildToParent === parentInit.id) {
                    rows.push(
                      <tr
                        key={`add-child-${parentInit.id}`}
                        className="border-b border-border/20 bg-muted/20"
                      >
                        <td className="px-2 py-1.5 pl-6 h-8" colSpan={teams.length + 3}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs shrink-0">└</span>
                            <InlineInput
                              placeholder="Child item name..."
                              onConfirm={(name) => {
                                addInitiative(parentInit.themeId, name, parentInit.id);
                                setAddingChildToParent(null);
                              }}
                              onCancel={() => setAddingChildToParent(null)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return rows;
                })}

                {/* Add Initiative Row */}
                {themes.length > 0 && (
                  <tr className="border-t border-border bg-muted/10">
                    <td className="px-3 py-1 h-7" colSpan={teams.length + 3}>
                      {addingInitToTheme ? (
                        <InlineInput
                          placeholder="Initiative name..."
                          onConfirm={(name) => {
                            addInitiative(addingInitToTheme, name);
                            setAddingInitToTheme(null);
                          }}
                          onCancel={() => setAddingInitToTheme(null)}
                        />
                      ) : (
                        <button
                          onClick={() => {
                            const firstTheme = themes[0];
                            if (firstTheme) setAddingInitToTheme(firstTheme.id);
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add initiative
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Collapsible Side Panel - only visible when initiative selected */}
      {selectedInit && (
        <div
          className={cn(
            "border-l border-border bg-card flex-shrink-0 transition-all duration-300 ease-in-out relative",
            sidebarCollapsed ? "w-10" : "w-[300px]"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -left-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded border border-border bg-background hover:bg-muted transition-colors"
            title={sidebarCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {sidebarCollapsed ? (
              <PanelRightClose className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Panel Content */}
          <div className={cn(
            "h-full transition-opacity duration-200",
            sidebarCollapsed ? "opacity-0 invisible" : "opacity-100 visible"
          )}>
            <InitiativeDetail
              initiative={selectedInit}
              onClose={() => setSelectedInit(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
