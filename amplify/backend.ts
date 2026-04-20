import { defineBackend } from '@aws-amplify/backend';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Function, FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { invitationApi } from './functions/invitation-api/resource';

/**
 * FlowMap Backend
 *
 * Invitations are managed via a standalone DynamoDB table and Lambda API.
 * Invitation validation happens client-side before Cognito signup.
 */
const backend = defineBackend({
  auth,
  data,
  invitationApi,
});

// Create invitation table in ROOT stack
const invitationTable = new Table(backend.stack, 'InvitationTable', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

invitationTable.addGlobalSecondaryIndex({
  indexName: 'byCode',
  partitionKey: { name: 'code', type: AttributeType.STRING },
});

// Grant invitationApi Lambda access to table
const invitationApiFn = backend.invitationApi.resources.lambda as Function;
invitationTable.grantReadWriteData(invitationApiFn);
invitationApiFn.addEnvironment('INVITATION_TABLE_NAME', invitationTable.tableName);

// Add Function URL for frontend access
const fnUrl = invitationApiFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.PATCH],
    allowedHeaders: ['Content-Type'],
  },
});

backend.addOutput({
  custom: {
    invitationApiUrl: fnUrl.url,
  },
});
