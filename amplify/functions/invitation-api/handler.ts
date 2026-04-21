import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.INVITATION_TABLE_NAME!;

interface Invitation {
  id: string;
  email: string;
  code: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
}

interface LambdaEvent {
  requestContext?: {
    http?: {
      method: string;
      path: string;
    };
  };
  body?: string;
  queryStringParameters?: Record<string, string>;
}

export const handler = async (event: LambdaEvent) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.requestContext?.http?.path || '/';

  try {
    // List all invitations
    if (method === 'GET' && path === '/invitations') {
      const result = await docClient.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      return response(200, result.Items || []);
    }

    // Get invitation by code (for signup validation)
    if (method === 'GET' && path === '/invitations/by-code') {
      const code = event.queryStringParameters?.code;
      if (!code) {
        return response(400, { error: 'Missing code parameter' });
      }

      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: 'byCode',
          KeyConditionExpression: 'code = :code',
          ExpressionAttributeValues: { ':code': code },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return response(404, { error: 'Invitation not found' });
      }

      return response(200, result.Items[0]);
    }

    // Create invitation
    if (method === 'POST' && path === '/invitations') {
      const body = JSON.parse(event.body || '{}');
      const { email, invitedBy } = body;

      if (!email) {
        return response(400, { error: 'Missing email' });
      }

      const invitation: Invitation = {
        id: crypto.randomUUID(),
        email,
        code: crypto.randomUUID(),
        status: 'pending',
        invitedBy: invitedBy || 'admin',
        invitedAt: new Date().toISOString(),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: invitation,
        })
      );

      return response(201, invitation);
    }

    // Update invitation status (revoke or accept)
    if (method === 'PATCH' && path.startsWith('/invitations/')) {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body || '{}');
      const { status } = body;

      if (!['accepted', 'revoked'].includes(status)) {
        return response(400, { error: 'Invalid status' });
      }

      const updateExpression =
        status === 'accepted'
          ? 'SET #status = :status, acceptedAt = :acceptedAt'
          : 'SET #status = :status';

      const expressionValues: Record<string, string> =
        status === 'accepted'
          ? { ':status': status, ':acceptedAt': new Date().toISOString() }
          : { ':status': status };

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: expressionValues,
        })
      );

      return response(200, { id, status });
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: 'Internal server error' });
  }
};

function response(statusCode: number, body: unknown) {
  // CORS headers handled by Function URL configuration in backend.ts
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
