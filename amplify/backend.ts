import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { preSignUp } from './auth/pre-sign-up/resource';

/**
 * FlowMap Backend
 *
 * This defines the Amplify Gen 2 backend with:
 * - Cognito User Pool authentication (with invitation-based signup)
 * - AppSync GraphQL API
 * - DynamoDB tables (auto-created from schema)
 * - Real-time subscriptions (auto-enabled)
 */
const backend = defineBackend({
  auth,
  data,
  preSignUp,
});

// Grant pre-signup Lambda access to the Invitation table
const invitationTable = backend.data.resources.tables['Invitation'];
const preSignUpLambda = backend.preSignUp.resources.lambda;

invitationTable.grantReadData(preSignUpLambda);
preSignUpLambda.addEnvironment('INVITATION_TABLE_NAME', invitationTable.tableName);
