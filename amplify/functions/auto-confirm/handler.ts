import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * Pre-signup trigger that auto-confirms users.
 *
 * Since signup is gated by invitation validation (client-side),
 * we can safely auto-confirm all users who make it to signup.
 * This eliminates the redundant email verification step.
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  // Auto-confirm user and verify email
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
