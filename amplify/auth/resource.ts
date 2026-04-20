import { defineAuth } from '@aws-amplify/backend';

/**
 * FlowMap Authentication
 *
 * Uses Cognito User Pool with email-based login.
 * Invitation validation happens client-side before signup.
 *
 * Future: O365 SSO can be added via externalProviders.oidc
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
