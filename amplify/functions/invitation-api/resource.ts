import { defineFunction } from '@aws-amplify/backend';

export const invitationApi = defineFunction({
  name: 'invitation-api',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
});
