import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

export const client = generateClient<Schema>();

export type AmplifyTheme = Schema['Theme']['type'];
export type AmplifyTeam = Schema['Team']['type'];
export type AmplifyInitiative = Schema['Initiative']['type'];
