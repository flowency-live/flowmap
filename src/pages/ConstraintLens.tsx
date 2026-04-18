import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { KpiCard } from '@/components/KpiCard';
import { StateBadge } from '@/components/StateBadge';
import { InitiativeDetail } from '@/components/InitiativeDetail';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { getStartabilityScore, getBlockedByTeam } from '@/lib/metrics';
import type { Initiative } from '@/types';

export function ConstraintLens() {
  const { initiatives, teams } = usePortfolioStore();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams.find((t) => t.isPrimaryConstraint)?.id ?? teams[0]?.id ?? ''
  );
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const blockedInitiatives = getBlockedByTeam(selectedTeamId, initiatives);

  // Sort by startability score (highest first = closest to unblocking)
  const queuedInitiatives = [...blockedInitiatives].sort(
    (a, b) => getStartabilityScore(b) - getStartabilityScore(a)
  );

  // Count downstream teams waiting in READY state
  const downstreamWaitingCount = queuedInitiatives.reduce((acc, init) => {
    let waitingInInit = 0;
    Object.entries(init.teamStates).forEach(([teamId, state]) => {
      if (teamId !== selectedTeamId && state === 'Ready') {
        waitingInInit++;
      }
    });
    return acc + waitingInInit;
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Constraint Lens
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze system bottlenecks and queue depth
          </p>
        </div>
        <div className="w-64">
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.isPrimaryConstraint ? '(Constraint)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <KpiCard
          title="Directly Blocked"
          value={blockedInitiatives.length}
          subtitle={`Initiatives waiting on ${selectedTeam?.name ?? 'team'}`}
          variant="destructive"
        />
        <KpiCard
          title="Downstream Effect"
          value={downstreamWaitingCount}
          subtitle={`Team slices in "Ready" because of ${selectedTeam?.name ?? 'team'}`}
        />
      </div>

      {/* Queue */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold font-display flex items-center gap-2">
            Queue at the Constraint
            <Info className="h-4 w-4 text-muted-foreground" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by startability score (closest to unblocking first)
          </p>
        </div>

        <div className="divide-y divide-border">
          {queuedInitiatives.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No initiatives are currently blocked by {selectedTeam?.name ?? 'this team'}.
            </div>
          ) : (
            queuedInitiatives.map((init, idx) => {
              const score = getStartabilityScore(init);

              return (
                <div
                  key={init.id}
                  className="p-6 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-6"
                  onClick={() => setSelectedInit(init)}
                >
                  <div className="font-mono text-xl font-bold text-muted-foreground/50 w-8">
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{init.name}</h3>
                    {init.notes && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {init.notes}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground uppercase">
                          {selectedTeam?.name} State:
                        </span>
                        <StateBadge state={init.teamStates[selectedTeamId] ?? 'N/S'} />
                      </div>
                    </div>
                  </div>
                  <div className="w-48">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase">
                        Startability
                      </span>
                      <span className="text-xs font-bold">{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              );
            })
          )}
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
