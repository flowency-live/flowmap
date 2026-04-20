import { defineBackend } from '@aws-amplify/backend';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Create pre-signup Lambda directly in root stack to avoid circular dependency
// between auth and data nested stacks
const preSignUpLambda = new NodejsFunction(backend.stack, 'PreSignUpLambda', {
  entry: path.join(__dirname, 'auth/pre-sign-up/handler.ts'),
  runtime: Runtime.NODEJS_20_X,
  timeout: Duration.seconds(10),
  memorySize: 128,
  bundling: {
    externalModules: ['@aws-sdk/*'],
  },
});

// Grant pre-signup Lambda access to the Invitation table
const invitationTable = backend.data.resources.tables['Invitation'];
invitationTable.grantReadData(preSignUpLambda);
preSignUpLambda.addEnvironment('INVITATION_TABLE_NAME', invitationTable.tableName);

// Attach pre-signup trigger to Cognito User Pool
const userPool = backend.auth.resources.userPool as cognito.UserPool;
userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpLambda);
