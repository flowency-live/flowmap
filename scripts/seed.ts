/**
 * Seed Script for FlowMap
 *
 * Seeds the database with data from roadmap.json:
 * - 1 Theme (Portfolio)
 * - 6 Teams (UPJ, UIE, UNC, Logan, DataE, DataS)
 * - 9 Parent initiatives with 35 child items
 *
 * Run with: npx tsx scripts/seed.ts
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import roadmapData from '../.documentation/roadmap.json';

// Load Amplify configuration
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);

const client = generateClient<Schema>();

type FlowState =
  | 'N/A'
  | 'N/S'
  | 'Discovery'
  | 'Ready'
  | 'Constrained'
  | 'Doing'
  | 'Done'
  | 'Blocked';

interface RoadmapChild {
  name: string;
  due_date: string | null;
  status_by_team: Record<string, string | null>;
}

interface RoadmapInitiative {
  name: string;
  due_date: string | null;
  rollup_by_team: Record<string, string | null>;
  children: RoadmapChild[];
}

async function clearExistingData() {
  console.log('Clearing existing data...');

  // Delete all initiatives first (due to foreign key)
  const { data: initiatives } = await client.models.Initiative.list();
  for (const initiative of initiatives ?? []) {
    await client.models.Initiative.delete({ id: initiative.id });
  }

  // Delete themes
  const { data: themes } = await client.models.Theme.list();
  for (const theme of themes ?? []) {
    await client.models.Theme.delete({ id: theme.id });
  }

  // Delete teams
  const { data: teams } = await client.models.Team.list();
  for (const team of teams ?? []) {
    await client.models.Team.delete({ id: team.id });
  }

  console.log('Existing data cleared.');
}

async function seedTheme() {
  console.log('Creating theme...');

  const { data } = await client.models.Theme.create({ name: 'Portfolio' });
  if (data) {
    console.log(`  Created theme: Portfolio`);
    return data;
  }
  throw new Error('Failed to create theme');
}

async function seedTeams() {
  console.log('Creating teams...');

  const teamData = roadmapData.model.teams.map((team) => ({
    name: team.id,
    isPrimaryConstraint: team.id === 'UPJ', // UPJ is typically the constraint
  }));

  const teams: Schema['Team']['type'][] = [];

  for (const team of teamData) {
    const { data } = await client.models.Team.create(team);
    if (data) {
      teams.push(data);
      console.log(`  Created team: ${team.name}${team.isPrimaryConstraint ? ' (Primary Constraint)' : ''}`);
    }
  }

  return teams;
}

function normalizeStatus(status: string | null): FlowState {
  if (status === null || status === undefined) return 'N/A';
  // Status values from JSON match our FlowState type
  const validStates: FlowState[] = ['N/A', 'N/S', 'Discovery', 'Ready', 'Constrained', 'Doing', 'Done', 'Blocked'];
  if (validStates.includes(status as FlowState)) {
    return status as FlowState;
  }
  return 'N/A';
}

function createTeamStates(
  teams: Schema['Team']['type'][],
  statusByTeam: Record<string, string | null>
): string {
  const states: Record<string, FlowState> = {};
  for (const team of teams) {
    // Map team name to status from roadmap (team names in roadmap are: UPJ, UIE, UNC, Logan, DataE, DataS)
    const status = statusByTeam[team.name];
    states[team.id] = normalizeStatus(status);
  }
  return JSON.stringify(states);
}

async function seedInitiatives(
  theme: Schema['Theme']['type'],
  teams: Schema['Team']['type'][]
) {
  console.log('Creating initiatives...');

  const initiatives = roadmapData.initiatives as RoadmapInitiative[];
  let parentCount = 0;
  let childCount = 0;

  for (const initiative of initiatives) {
    // Create parent initiative
    const parentData = {
      name: initiative.name,
      themeId: theme.id,
      liveDate: initiative.due_date || undefined,
      notes: '',
      sequencingNotes: '',
      teamStates: createTeamStates(teams, initiative.rollup_by_team),
    };

    const { data: parentResult } = await client.models.Initiative.create(parentData);
    if (!parentResult) {
      console.error(`  Failed to create parent: ${initiative.name}`);
      continue;
    }
    parentCount++;
    console.log(`  Created parent: ${initiative.name}`);

    // Create child initiatives
    for (const child of initiative.children) {
      const childData = {
        name: child.name,
        themeId: theme.id,
        parentId: parentResult.id,
        dueDate: child.due_date && child.due_date !== '-' ? child.due_date : undefined,
        notes: '',
        sequencingNotes: '',
        teamStates: createTeamStates(teams, child.status_by_team),
      };

      const { data: childResult } = await client.models.Initiative.create(childData);
      if (childResult) {
        childCount++;
        console.log(`    - ${child.name}`);
      }
    }
  }

  return { parentCount, childCount };
}

async function seed() {
  console.log('\n🌱 Starting FlowMap seed from roadmap.json...\n');

  try {
    await clearExistingData();
    const theme = await seedTheme();
    const teams = await seedTeams();
    const { parentCount, childCount } = await seedInitiatives(theme, teams);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  - 1 theme (Portfolio)`);
    console.log(`  - ${teams.length} teams`);
    console.log(`  - ${parentCount} parent initiatives`);
    console.log(`  - ${childCount} child items`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
