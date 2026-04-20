import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

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
});

// Grant pre-signup Lambda access to the Invitation table
// The table name follows Amplify's naming convention
const preSignUpLambda = backend.auth.resources.userPoolFunction;
if (preSignUpLambda) {
  // Get the Invitation table from the data stack
  const invitationTable = backend.data.resources.tables['Invitation'];
  if (invitationTable) {
    invitationTable.grantReadData(preSignUpLambda);
    preSignUpLambda.addEnvironment(
      'INVITATION_TABLE_NAME',
      invitationTable.tableName
    );
  }
}
