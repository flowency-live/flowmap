import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { data } from './data/resource';
import { validateToken } from './functions/validate-token/resource';

/**
 * FlowMap Backend
 *
 * This defines the Amplify Gen 2 backend with:
 * - AppSync GraphQL API
 * - DynamoDB tables (auto-created from schema)
 * - Real-time subscriptions (auto-enabled)
 * - Token validation Lambda for magic link auth
 */
const backend = defineBackend({
  data,
  validateToken,
});

// Grant Lambda permission to read SSM parameters
const validateTokenLambda = backend.validateToken.resources.lambda;

validateTokenLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['ssm:GetParameter'],
    resources: [
      `arn:aws:ssm:*:*:parameter/flowmap/auth/*`,
    ],
  })
);

// Create a public function URL for the validation endpoint
const functionUrl = validateTokenLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedHeaders: ['content-type'],
    allowedMethods: [HttpMethod.POST, HttpMethod.OPTIONS],
  },
});

// Export the function URL for use in the frontend
backend.addOutput({
  custom: {
    validateTokenUrl: functionUrl.url,
  },
});
