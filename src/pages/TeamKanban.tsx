import { useMemo } from 'react';
import { useRoute, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { TeamKanbanCard } from '@/components/TeamKanbanCard';
import { StateBadge } from '@/components/StateBadge';
import type { FlowState, Initiative } from '@/types';
import { FLOW_STATES, STATE_CONFIG } from '@/types';
import { cn } from '@/lib/utils';

// States to show as columns (exclude N/A)
const KANBAN_STATES: FlowState[] = FLOW_STATES.filter((s) => s !== 'N/A');

// Container animation
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function TeamKanban() {
  const [match, params] = useRoute('/team/:teamId');
  const teamId = params?.teamId;

  const teams = usePortfolioStore((s) => s.teams);
  const initiatives = usePortfolioStore((s) => s.initiatives);
  const themes = usePortfolioStore((s) => s.themes);

  const team = useMemo(
    () => teams.find((t) => t.id === teamId),
    [teams, teamId]
  );

  // Group initiatives by their state for this team
  const initiativesByState = useMemo(() => {
    const grouped: Record<FlowState, Initiative[]> = {} as Record<
      FlowState,
      Initiative[]
    >;
    KANBAN_STATES.forEach((state) => {
      grouped[state] = [];
    });

    initiatives.forEach((init) => {
      const state = init.teamStates[teamId ?? ''] ?? 'N/S';
      // Skip N/A items
      if (state === 'N/A') return;
      if (grouped[state]) {
        grouped[state].push(init);
      }
    });

    return grouped;
  }, [initiatives, teamId]);

  // Get parent name for child initiatives
  const getParentContext = (init: Initiative): string | null => {
    if (!init.parentId) return null;
    const parent = initiatives.find((i) => i.id === init.parentId);
    return parent?.name ?? null;
  };

  // Get theme name
  const getThemeName = (init: Initiative): string => {
    const theme = themes.find((t) => t.id === init.themeId);
    return theme?.name ?? '';
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

  // After the check above, teamId is guaranteed to be string
  const validTeamId: string = teamId;

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
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
            {team.isPrimaryConstraint && (
              <AlertTriangle className="h-5 w-5" />
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {initiatives.filter(
              (i) => i.teamStates[validTeamId] && i.teamStates[validTeamId] !== 'N/A'
            ).length}{' '}
            active items
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {KANBAN_STATES.map((state) => {
            const items = initiativesByState[state];
            const config = STATE_CONFIG[state];

            return (
              <div
                key={state}
                className="flex flex-col w-[220px] bg-muted/30 rounded-lg border border-border"
              >
                {/* Column Header */}
                <div
                  className="p-3 border-b border-border flex items-center justify-between"
                  style={{ backgroundColor: `${config.bgColor}20` }}
                >
                  <StateBadge state={state} size="sm" />
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: config.bgColor,
                      color: config.textColor,
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-2"
                    >
                      {items.map((init) => (
                        <motion.div
                          key={init.id}
                          variants={itemVariants}
                          layout
                          layoutId={init.id}
                        >
                          <TeamKanbanCard
                            initiative={init}
                            teamId={validTeamId}
                            parentContext={getParentContext(init)}
                            themeName={getThemeName(init)}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
