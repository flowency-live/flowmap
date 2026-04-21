import { defineAuth } from '@aws-amplify/backend';
import { autoConfirm } from '../functions/auto-confirm/resource';

/**
 * FlowMap Authentication
 *
 * Uses Cognito User Pool with email-based login.
 * Invitation validation happens client-side before signup.
 * Users are auto-confirmed since invitation link serves as email verification.
 *
 * Future: O365 SSO can be added via externalProviders.oidc
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    preSignUp: autoConfirm,
  },
});
