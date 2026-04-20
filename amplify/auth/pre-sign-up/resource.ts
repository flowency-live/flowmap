import { defineFunction } from '@aws-amplify/backend';

export const preSignUp = defineFunction({
  name: 'pre-sign-up',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 10,
  memoryMB: 128,
  bundling: {
    externalModules: ['@aws-sdk/*'],
  },
});
