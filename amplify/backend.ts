import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';

/**
 * FlowMap Backend
 *
 * This defines the Amplify Gen 2 backend with:
 * - AppSync GraphQL API
 * - DynamoDB tables (auto-created from schema)
 * - Real-time subscriptions (auto-enabled)
 */
defineBackend({
  data,
});
