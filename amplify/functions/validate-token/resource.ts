import { defineFunction } from '@aws-amplify/backend';

export const validateToken = defineFunction({
  name: 'validate-token',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 10,
  memoryMB: 128,
});
