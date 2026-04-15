/**
 * Seed Script for FlowMap
 *
 * Seeds the database with initial data:
 * - 4 Themes (NatWest, M&S, LBG, Aviva)
 * - 6 Teams (UPJ, UPC, Ember, Logan, DataAn, DataEn)
 * - Sample initiatives with flow states
 *
 * Run with: npx tsx scripts/seed.ts
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

// Load Amplify configuration
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);

const client = generateClient<Schema>();

type FlowState =
  | 'NOT_STARTED'
  | 'IN_DISCOVERY'
  | 'READY'
  | 'IN_FLIGHT'
  | 'UAT'
  | 'DONE'
  | 'NA';

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

async function seedThemes() {
  console.log('Creating themes...');

  const themeNames = ['NatWest', 'M&S', 'LBG', 'Aviva'];
  const themes: Schema['Theme']['type'][] = [];

  for (const name of themeNames) {
    const { data } = await client.models.Theme.create({ name });
    if (data) {
      themes.push(data);
      console.log(`  Created theme: ${name}`);
    }
  }

  return themes;
}

async function seedTeams() {
  console.log('Creating teams...');

  const teamData = [
    { name: 'UPJ', isPrimaryConstraint: true },
    { name: 'UPC', isPrimaryConstraint: false },
    { name: 'Ember', isPrimaryConstraint: false },
    { name: 'Logan', isPrimaryConstraint: false },
    { name: 'DataAn', isPrimaryConstraint: false },
    { name: 'DataEn', isPrimaryConstraint: false },
  ];

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

function createTeamStates(
  teamIds: string[],
  states: Partial<Record<string, FlowState>> = {}
): string {
  const defaultStates: Record<string, FlowState> = {};
  for (const id of teamIds) {
    defaultStates[id] = states[id] ?? 'NOT_STARTED';
  }
  return JSON.stringify(defaultStates);
}

async function seedInitiatives(
  themes: Schema['Theme']['type'][],
  teams: Schema['Team']['type'][]
) {
  console.log('Creating initiatives...');

  const teamIds = teams.map((t) => t.id);
  const [natwest, mands, lbg, aviva] = themes;

  // NatWest initiatives
  const natwestInitiatives = [
    {
      name: 'Customer Portal Redesign',
      themeId: natwest!.id,
      notes: 'High priority for Q2. Dependencies on API team.',
      sequencingNotes: 'Must complete API changes first',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'READY',
        [teamIds[1]!]: 'IN_FLIGHT',
        [teamIds[2]!]: 'IN_DISCOVERY',
      }),
    },
    {
      name: 'API Modernization',
      themeId: natwest!.id,
      notes: 'Backend team leading this initiative',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'NOT_STARTED',
        [teamIds[1]!]: 'READY',
      }),
    },
    {
      name: 'Mobile App Launch',
      themeId: natwest!.id,
      notes: '',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'IN_FLIGHT',
        [teamIds[1]!]: 'IN_FLIGHT',
        [teamIds[2]!]: 'UAT',
      }),
    },
  ];

  // M&S initiatives
  const mandsInitiatives = [
    {
      name: 'Loyalty Program Integration',
      themeId: mands!.id,
      notes: 'Integration with existing loyalty platform',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'READY',
        [teamIds[3]!]: 'IN_DISCOVERY',
      }),
    },
    {
      name: 'Payment Gateway Upgrade',
      themeId: mands!.id,
      notes: 'Security compliance requirement',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'NOT_STARTED',
        [teamIds[1]!]: 'NOT_STARTED',
        [teamIds[4]!]: 'READY',
      }),
    },
  ];

  // LBG initiatives
  const lbgInitiatives = [
    {
      name: 'Risk Dashboard',
      themeId: lbg!.id,
      notes: 'Real-time risk monitoring',
      teamStates: createTeamStates(teamIds, {
        [teamIds[4]!]: 'IN_FLIGHT',
        [teamIds[5]!]: 'IN_FLIGHT',
      }),
    },
    {
      name: 'Compliance Reporting',
      themeId: lbg!.id,
      notes: 'Regulatory requirement - Q3 deadline',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'DONE',
        [teamIds[4]!]: 'UAT',
        [teamIds[5]!]: 'IN_FLIGHT',
      }),
    },
  ];

  // Aviva initiatives
  const avivaInitiatives = [
    {
      name: 'Claims Automation',
      themeId: aviva!.id,
      notes: 'AI-powered claims processing',
      teamStates: createTeamStates(teamIds, {
        [teamIds[0]!]: 'IN_DISCOVERY',
        [teamIds[2]!]: 'NOT_STARTED',
      }),
    },
    {
      name: 'Customer Self-Service Portal',
      themeId: aviva!.id,
      notes: '',
      teamStates: createTeamStates(teamIds),
    },
  ];

  const allInitiatives = [
    ...natwestInitiatives,
    ...mandsInitiatives,
    ...lbgInitiatives,
    ...avivaInitiatives,
  ];

  for (const initiative of allInitiatives) {
    const { data } = await client.models.Initiative.create(initiative);
    if (data) {
      console.log(`  Created initiative: ${initiative.name}`);
    }
  }
}

async function seed() {
  console.log('\n🌱 Starting FlowMap seed...\n');

  try {
    await clearExistingData();
    const themes = await seedThemes();
    const teams = await seedTeams();
    await seedInitiatives(themes, teams);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  - ${themes.length} themes`);
    console.log(`  - ${teams.length} teams`);
    console.log('  - 9 initiatives');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
