import { defineBackend } from '@aws-amplify/backend';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { preSignUp } from './auth/pre-sign-up/resource';
import { invitationApi } from './functions/invitation-api/resource';

/**
 * FlowMap Backend
 *
 * Architecture note: Invitations are managed via a standalone DynamoDB table
 * and Lambda API, NOT through AppSync. This avoids the circular dependency
 * between auth (pre-signup trigger) and data (userPool authorization).
 *
 * The invitation table is created in the ROOT stack, which both preSignUp
 * and invitationApi reference. This breaks the circular dependency chain.
 */
const backend = defineBackend({
  auth,
  data,
  preSignUp,
  invitationApi,
});

// Create invitation table in ROOT stack to avoid circular dependencies
const invitationTable = new Table(backend.stack, 'InvitationTable', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

// Add GSI for querying by code (for pre-signup validation)
invitationTable.addGlobalSecondaryIndex({
  indexName: 'byCode',
  partitionKey: { name: 'code', type: AttributeType.STRING },
});

// Grant preSignUp Lambda read access to validate invitation codes
invitationTable.grantReadData(backend.preSignUp.resources.lambda);
backend.preSignUp.resources.lambda.addEnvironment(
  'INVITATION_TABLE_NAME',
  invitationTable.tableName
);

// Grant invitationApi Lambda full access for CRUD operations
invitationTable.grantReadWriteData(backend.invitationApi.resources.lambda);
backend.invitationApi.resources.lambda.addEnvironment(
  'INVITATION_TABLE_NAME',
  invitationTable.tableName
);

// Add Function URL for invitationApi (frontend access)
const fnUrl = backend.invitationApi.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // We'll add Cognito auth at app layer
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

// Export the function URL for frontend configuration
backend.addOutput({
  custom: {
    invitationApiUrl: fnUrl.url,
  },
});
