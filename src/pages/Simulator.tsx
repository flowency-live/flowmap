import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { getStartabilityScore, getBlockedByTeam } from '@/lib/metrics';
import { ENGAGED_STATES } from '@/types';

type ScenarioType = 'ADD_POD' | 'OUTSOURCE' | 'REALLOCATE';

const SCENARIOS: { value: ScenarioType; label: string }[] = [
  { value: 'ADD_POD', label: 'Add a New Pod' },
  { value: 'OUTSOURCE', label: 'Outsource Work' },
  { value: 'REALLOCATE', label: 'Reallocate Team' },
];

export function Simulator() {
  const { initiatives, teams } = usePortfolioStore();
  const [scenario, setScenario] = useState<ScenarioType>('ADD_POD');
  const [targetTeamId, setTargetTeamId] = useState<string>(
    teams.find((t) => t.isPrimaryConstraint)?.id ?? teams[0]?.id ?? ''
  );
  const [selectedInitId, setSelectedInitId] = useState<string>('');
  const [simulated, setSimulated] = useState(false);

  const targetTeam = teams.find((t) => t.id === targetTeamId);
  const blockedInitiatives = getBlockedByTeam(targetTeamId, initiatives);
  const targetInitiative = initiatives.find((i) => i.id === selectedInitId);

  const blockedCount = blockedInitiatives.length;

  const handleSimulate = () => {
    setSimulated(true);
  };

  const resetSimulation = () => {
    setSimulated(false);
    setSelectedInitId('');
  };

  // Calculate simulated startability (assumes target team becomes engaged)
  const getSimulatedStartability = () => {
    if (!targetInitiative) return 0;

    const teamIds = Object.keys(targetInitiative.teamStates);
    const requiredTeams = teamIds.filter(
      (id) => targetInitiative.teamStates[id] !== 'N/A'
    );

    if (requiredTeams.length === 0) return 0;

    let engaged = 0;
    requiredTeams.forEach((id) => {
      if (id === targetTeamId) {
        // Simulate this team becoming engaged
        engaged++;
      } else {
        const state = targetInitiative.teamStates[id];
        if (state !== undefined && ENGAGED_STATES.includes(state)) {
          engaged++;
        }
      }
    });

    return Math.round((engaged / requiredTeams.length) * 100);
  };

  const currentStartability = targetInitiative
    ? getStartabilityScore(targetInitiative)
    : 0;
  const simulatedStartability = getSimulatedStartability();
  const improvement = simulatedStartability - currentStartability;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display flex items-center gap-3">
          <Zap className="h-8 w-8 text-primary" />
          Unlock Simulator
        </h1>
        <p className="text-muted-foreground mt-1">
          Model the impact of adding capability to the constraint
        </p>
      </div>

      {/* Scenario Parameters */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
        <h2 className="text-lg font-semibold font-display">Scenario Parameters</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select
              value={scenario}
              onValueChange={(v) => {
                setScenario(v as ScenarioType);
                setSimulated(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Relieve Team</label>
            <Select
              value={targetTeamId}
              onValueChange={(v) => {
                setTargetTeamId(v);
                setSelectedInitId('');
                setSimulated(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Initiative</label>
            <Select
              value={selectedInitId}
              onValueChange={(v) => {
                setSelectedInitId(v);
                setSimulated(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select to unblock" />
              </SelectTrigger>
              <SelectContent>
                {blockedInitiatives.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleSimulate}
          disabled={!selectedInitId}
          className="w-full"
        >
          Run Simulation
        </Button>
      </div>

      {/* Results */}
      {simulated && targetInitiative && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border-2 border-primary/20 rounded-lg p-8 shadow-md"
        >
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-bold font-display">Simulation Results</h2>
          </div>

          <div className="p-4 bg-muted/30 rounded-md mb-8 font-mono text-sm border border-border">
            "If {targetTeam?.name}'s capacity issue could be resolved by{' '}
            {scenario.toLowerCase().replace('_', ' ')} for '{targetInitiative.name}',
            here is the projected impact."
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground border-b border-border pb-2">
                Before
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    Initiatives blocked by {targetTeam?.name}
                  </span>
                  <span className="font-bold text-destructive">{blockedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Target Startability</span>
                  <span className="font-bold">{currentStartability}%</span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="space-y-4 relative">
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 hidden md:block">
                <ArrowRight className="text-muted-foreground h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold uppercase text-emerald-600 border-b border-border pb-2">
                Projected After
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">
                    Initiatives blocked by {targetTeam?.name}
                  </span>
                  <span className="font-bold text-emerald-500">
                    {Math.max(0, blockedCount - 1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Target Startability</span>
                  <span className="font-bold text-emerald-500">
                    {simulatedStartability}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold mb-2">Downstream Unlock Effect</h3>
            <p className="text-sm text-muted-foreground">
              Unblocking{' '}
              <span className="font-semibold text-foreground">
                {targetInitiative.name}
              </span>{' '}
              would improve startability by{' '}
              <span className="font-semibold text-emerald-600">
                {improvement} percentage points
              </span>
              , allowing downstream teams to move from{' '}
              <span className="font-semibold text-teal-600">Ready</span> to{' '}
              <span className="font-semibold text-violet-600">Doing</span>.
            </p>
          </div>

          <div className="mt-6">
            <Button variant="outline" onClick={resetSimulation}>
              Run Another Simulation
            </Button>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!simulated && blockedInitiatives.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No initiatives are currently blocked by {targetTeam?.name ?? 'this team'}.
            Select a different team to simulate.
          </p>
        </div>
      )}
    </motion.div>
  );
}
