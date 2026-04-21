import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Lazy client initialization to avoid calling generateClient() before Amplify.configure()
let _client: ReturnType<typeof generateClient<Schema>> | null = null;

export function getClient() {
  if (!_client) {
    _client = generateClient<Schema>();
  }
  return _client;
}

// For backwards compatibility - lazy getter
export const client = new Proxy({} as ReturnType<typeof generateClient<Schema>>, {
  get(_, prop) {
    return getClient()[prop as keyof ReturnType<typeof generateClient<Schema>>];
  },
});

export type AmplifyTheme = Schema['Theme']['type'];
export type AmplifyTeam = Schema['Team']['type'];
export type AmplifyInitiative = Schema['Initiative']['type'];
