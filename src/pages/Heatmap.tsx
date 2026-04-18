import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  TrendingDown,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { KpiCard } from '@/components/KpiCard';
import { StateBadge, STATE_LEGEND_ITEMS } from '@/components/StateBadge';
import { StatePicker } from '@/components/StatePicker';
import { InitiativeDetail } from '@/components/InitiativeDetail';
import { ConfirmDelete } from '@/components/ConfirmDelete';
import { usePortfolioStore } from '@/stores/portfolioStore';
import {
  getStartabilityScore,
  isZeroEngagement,
  getReadyCount,
  getConstraintLoadRatio,
  getRollupState,
  getAverageStartability,
} from '@/lib/metrics';
import { cn } from '@/lib/utils';
import type { Initiative, Effort, FlowState } from '@/types';

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
    addInitiative,
    removeInitiative,
    renameInitiative,
    addTeam,
    removeTeam,
    addTheme,
    removeTheme,
  } = usePortfolioStore();

  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [collapsedThemes, setCollapsedThemes] = useState<Set<string>>(new Set());
  const [addingInitToTheme, setAddingInitToTheme] = useState<string | null>(null);
  const [addingTheme, setAddingTheme] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamValue, setAddTeamValue] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Filter initiatives by theme
  const filteredInitiatives =
    selectedTheme === 'all'
      ? initiatives
      : initiatives.filter((i) => i.themeId === selectedTheme);

  // Get leaf initiatives (no children) for metrics
  const leafInitiatives = initiatives.filter(
    (i) => !initiatives.some((child) => child.parentId === i.id)
  );

  // KPI calculations
  const totalCount = initiatives.filter((i) => i.parentId === null).length;
  const zeroCount = leafInitiatives.filter(isZeroEngagement).length;
  const readyCount = getReadyCount(leafInitiatives);
  const constraintTeam = teams.find((t) => t.isPrimaryConstraint) ?? teams[0];
  const constraintLoad = constraintTeam
    ? getConstraintLoadRatio(constraintTeam.id, leafInitiatives)
    : 0;

  const visibleThemes = themes.filter(
    (t) => selectedTheme === 'all' || t.id === selectedTheme
  );

  const toggleTheme = (themeId: string) => {
    setCollapsedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
      } else {
        next.add(themeId);
      }
      return next;
    });
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">
            Portfolio Heatmap
          </h1>
          <p className="text-muted-foreground mt-1">
            Cross-team delivery states and upstream bottlenecks
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedTheme} onValueChange={setSelectedTheme}>
            <SelectTrigger>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Initiatives" value={totalCount} icon={Layers} />
        <KpiCard
          title="Zero Engagement"
          value={zeroCount}
          icon={TrendingDown}
          variant="destructive"
        />
        <KpiCard title="Ready to Start" value={readyCount} icon={Clock} />
        <KpiCard
          title="Constraint Load"
          value={`${constraintLoad}%`}
          icon={AlertTriangle}
          variant="warning"
          subtitle={constraintTeam?.name ?? 'No constraint'}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Legend
        </span>
        {STATE_LEGEND_ITEMS.map(({ state, label }) => (
          <div key={state} className="flex items-center gap-1.5">
            <StateBadge state={state} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-fixed">
            <colgroup>
              <col className="w-[260px]" />
              <col className="w-[110px]" />
              {teams.map((team) => (
                <col key={team.id} className="w-[90px]" />
              ))}
              <col className="w-[60px]" />
              <col className="w-[70px]" />
            </colgroup>
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 font-semibold">Initiative</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                {teams.map((team) => (
                  <th key={team.id} className="px-2 py-3 font-semibold text-center group">
                    <div className="flex items-center justify-center gap-1 relative">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1',
                          team.isPrimaryConstraint && 'text-destructive'
                        )}
                      >
                        {team.name}
                        {team.isPrimaryConstraint && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                      </span>
                      {teams.length > 1 && (
                        <ConfirmDelete
                          trigger={
                            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity absolute -right-1">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          }
                          title={`Delete "${team.name}"?`}
                          description="This will remove this team column from all initiatives. This action cannot be undone."
                          onConfirm={() => removeTeam(team.id)}
                        />
                      )}
                    </div>
                  </th>
                ))}
                {/* Add Team Column */}
                <th className="px-2 py-3 text-center">
                  <Popover open={addTeamOpen} onOpenChange={setAddTeamOpen}>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-medium px-2 py-1 rounded border border-dashed border-border hover:border-primary">
                        <Plus className="h-3 w-3" />
                        Team
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="end">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        New Team
                      </p>
                      <div className="flex gap-2">
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
                <th className="px-2 py-3 font-semibold text-center">Start %</th>
              </tr>
            </thead>

            <tbody>
              {visibleThemes.flatMap((theme) => {
                const themeInits = filteredInitiatives.filter(
                  (i) => i.themeId === theme.id && i.parentId === null
                );
                const themeLeaves = filteredInitiatives.filter((i) => {
                  if (i.themeId !== theme.id) return false;
                  return !initiatives.some((child) => child.parentId === i.id);
                });

                const isCollapsed = collapsedThemes.has(theme.id);
                const avgScore = getAverageStartability(themeLeaves);
                const isAddingInit = addingInitToTheme === theme.id;

                const rows: React.ReactNode[] = [];

                // Theme Header Row
                rows.push(
                  <tr
                    key={`theme-${theme.id}`}
                    className="bg-muted/40 border-b border-border hover:bg-muted/60 transition-colors group"
                  >
                    <td className="px-4 py-3 h-12">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTheme(theme.id)}
                          className="flex items-center gap-2 font-bold text-sm flex-1 text-left"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                          {theme.name}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({themeInits.length})
                          </span>
                        </button>
                        <ConfirmDelete
                          trigger={
                            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                          title={`Delete "${theme.name}"?`}
                          description="This will permanently delete this theme and all its initiatives. This action cannot be undone."
                          onConfirm={() => removeTheme(theme.id)}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 h-12" />
                    {teams.map((team) => (
                      <td key={team.id} className="px-2 py-3 text-center h-12">
                        <div className="flex items-center justify-center h-6">
                          <StateBadge
                            state={getRollupState(themeLeaves, team.id)}
                            size="lg"
                          />
                        </div>
                      </td>
                    ))}
                    <td className="h-12" />
                    <td className="px-2 py-3 text-center h-12">
                      <div className="flex flex-col items-center justify-center gap-1 h-6">
                        <span className="text-xs font-bold">{avgScore}%</span>
                        <Progress value={avgScore} className="h-1.5 w-12" />
                      </div>
                    </td>
                  </tr>
                );

                // Initiative Rows (only when expanded)
                if (!isCollapsed) {
                  themeInits.forEach((parentInit) => {
                    const children = filteredInitiatives.filter(
                      (i) => i.parentId === parentInit.id
                    );
                    const hasChildren = children.length > 0;
                    const isRenaming = renamingId === parentInit.id;

                    // For parents with children, compute rollup from children
                    // For leaf initiatives, use their own states
                    const displayStates = hasChildren
                      ? teams.reduce((acc, team) => {
                          acc[team.id] = getRollupState(children, team.id);
                          return acc;
                        }, {} as Record<string, FlowState>)
                      : parentInit.teamStates;

                    const score = hasChildren
                      ? getAverageStartability(children)
                      : getStartabilityScore(parentInit);

                    // Parent Initiative Row
                    rows.push(
                      <tr
                        key={parentInit.id}
                        className={cn(
                          'border-b border-border cursor-pointer transition-colors group',
                          hasChildren
                            ? 'bg-muted/20 hover:bg-muted/40 border-l-2 border-l-primary/30'
                            : 'hover:bg-muted/30'
                        )}
                        onClick={() => setSelectedInit(parentInit)}
                      >
                        <td className="px-6 py-3 pl-10 h-12">
                          <div className="flex items-center gap-2">
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
                              <span
                                className={cn(
                                  'flex-1 truncate',
                                  hasChildren ? 'font-semibold' : 'font-medium'
                                )}
                              >
                                {parentInit.name}
                              </span>
                            )}
                            {!isRenaming && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRename(parentInit);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <span onClick={(e) => e.stopPropagation()}>
                                  <ConfirmDelete
                                    trigger={
                                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    }
                                    title={`Delete "${parentInit.name}"?`}
                                    description={
                                      hasChildren
                                        ? 'This will permanently delete this initiative and all its child items. This action cannot be undone.'
                                        : 'This will permanently delete this initiative. This action cannot be undone.'
                                    }
                                    onConfirm={() => removeInitiative(parentInit.id)}
                                  />
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 h-12">
                          {parentInit.liveDate && (
                            <span className="text-xs font-medium text-primary">
                              {parentInit.liveDate}
                            </span>
                          )}
                        </td>
                        {teams.map((team) => (
                          <td
                            key={team.id}
                            className="px-2 py-3 text-center h-12"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center h-6">
                              {hasChildren ? (
                                <StateBadge
                                  state={displayStates[team.id] ?? 'N/A'}
                                  size="lg"
                                />
                              ) : (
                                <StatePicker
                                  value={parentInit.teamStates[team.id] ?? 'N/S'}
                                  effort={parentInit.teamEfforts[team.id]}
                                  onChange={(state) =>
                                    updateTeamState(parentInit.id, team.id, state)
                                  }
                                  onEffortChange={(effort: Effort | null) =>
                                    updateTeamEffort(parentInit.id, team.id, effort)
                                  }
                                />
                              )}
                            </div>
                          </td>
                        ))}
                        <td className="h-12" />
                        <td className="px-2 py-3 text-center h-12">
                          <div className="flex flex-col items-center justify-center gap-1 h-6">
                            <span className="text-xs font-bold">{score}%</span>
                            <Progress value={score} className="h-1.5 w-12" />
                          </div>
                        </td>
                      </tr>
                    );

                    // Child rows
                    children.forEach((child) => {
                      const childScore = getStartabilityScore(child);
                      const isChildRenaming = renamingId === child.id;

                      rows.push(
                        <tr
                          key={child.id}
                          className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors group bg-background"
                          onClick={() => setSelectedInit(child)}
                        >
                          <td className="px-6 py-2 pl-14 h-10">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">└</span>
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
                                <span className="flex-1 truncate text-sm">
                                  {child.name}
                                </span>
                              )}
                              {!isChildRenaming && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRename(child);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <span onClick={(e) => e.stopPropagation()}>
                                    <ConfirmDelete
                                      trigger={
                                        <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      }
                                      title={`Delete "${child.name}"?`}
                                      description="This will permanently delete this item. This action cannot be undone."
                                      onConfirm={() => removeInitiative(child.id)}
                                    />
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 h-10">
                            {child.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                {child.dueDate}
                              </span>
                            )}
                          </td>
                          {teams.map((team) => (
                            <td
                              key={team.id}
                              className="px-2 py-2 text-center h-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center h-5">
                                <StatePicker
                                  value={child.teamStates[team.id] ?? 'N/S'}
                                  effort={child.teamEfforts[team.id]}
                                  onChange={(state) =>
                                    updateTeamState(child.id, team.id, state)
                                  }
                                  onEffortChange={(effort: Effort | null) =>
                                    updateTeamEffort(child.id, team.id, effort)
                                  }
                                />
                              </div>
                            </td>
                          ))}
                          <td className="h-10" />
                          <td className="px-2 py-2 text-center h-10">
                            <div className="flex flex-col items-center justify-center gap-0.5 h-5">
                              <span className="text-xs font-medium">{childScore}%</span>
                              <Progress value={childScore} className="h-1 w-10" />
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  });

                  // Add Initiative Row
                  rows.push(
                    <tr
                      key={`add-init-${theme.id}`}
                      className="border-b border-border bg-muted/10"
                    >
                      <td className="px-6 py-2 pl-10 h-10" colSpan={teams.length + 4}>
                        {isAddingInit ? (
                          <InlineInput
                            placeholder="Initiative name..."
                            onConfirm={(name) => {
                              addInitiative(theme.id, name);
                              setAddingInitToTheme(null);
                            }}
                            onCancel={() => setAddingInitToTheme(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setAddingInitToTheme(theme.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add initiative
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }

                return rows;
              })}

              {/* Add Theme Row */}
              <tr className="border-t-2 border-border bg-muted/5">
                <td className="px-4 py-3" colSpan={teams.length + 4}>
                  {addingTheme ? (
                    <InlineInput
                      placeholder="Theme name..."
                      onConfirm={(name) => {
                        addTheme(name);
                        setAddingTheme(false);
                      }}
                      onCancel={() => setAddingTheme(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingTheme(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add theme
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiative Detail Sheet */}
      <InitiativeDetail
        initiative={selectedInit}
        onClose={() => setSelectedInit(null)}
      />
    </motion.div>
  );
}
