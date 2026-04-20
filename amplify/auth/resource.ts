import { defineAuth } from '@aws-amplify/backend';

/**
 * FlowMap Authentication
 *
 * Uses Cognito User Pool with email-based login.
 * Users cannot self-register - they must have a valid invitation.
 * The pre-signup trigger is attached in backend.ts using CDK to avoid
 * circular dependency between auth and data stacks.
 *
 * Future: O365 SSO can be added via externalProviders.oidc
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    // Custom attribute to pass invitation code during signup
    'custom:inviteCode': {
      dataType: 'String',
      mutable: false,
    },
  },
});
