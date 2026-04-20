import type { PreSignUpTriggerHandler, PreSignUpTriggerEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

interface Invitation {
  id: string;
  email: string;
  code: string;
  status: 'pending' | 'accepted' | 'revoked';
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: PreSignUpTriggerHandler = async (
  event: PreSignUpTriggerEvent
) => {
  const inviteCode = event.request.userAttributes['custom:inviteCode'];
  const email = event.request.userAttributes.email;

  if (!inviteCode) {
    throw new Error('Invitation code is required');
  }

  const tableName = process.env.INVITATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('INVITATION_TABLE_NAME environment variable not set');
  }

  // Query invitation by code using GSI
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'byCode',
      KeyConditionExpression: 'code = :code',
      ExpressionAttributeValues: { ':code': inviteCode },
    })
  );

  const invitation = result.Items?.[0] as Invitation | undefined;

  if (!invitation) {
    throw new Error('Invalid invitation code');
  }

  // Case-insensitive email comparison
  if (invitation.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Invitation email does not match');
  }

  if (invitation.status === 'accepted') {
    throw new Error('Invitation has already been used');
  }

  if (invitation.status === 'revoked') {
    throw new Error('Invitation has been revoked');
  }

  // Valid invitation - auto-confirm the user
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
