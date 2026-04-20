import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createHmac, timingSafeEqual } from 'crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const SSM_PARAMS = {
  accessToken: '/flowmap/auth/access-token',
  jwtSecret: '/flowmap/auth/jwt-secret',
} as const;

const JWT_EXPIRY_DAYS = 30;

function createResponse(
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return timingSafeEqual(bufferA, bufferB);
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // Parse request body
  let token: string;
  try {
    if (!event.body) {
      return createResponse(400, { error: 'Token is required' });
    }
    const body = JSON.parse(event.body);
    token = body.token;
    if (!token) {
      return createResponse(400, { error: 'Token is required' });
    }
  } catch {
    return createResponse(400, { error: 'Invalid request body' });
  }

  try {
    // Create SSM client - done here so mocks work in tests
    const ssmClient = new SSMClient({});

    // Fetch secrets from SSM Parameter Store
    const [accessTokenResponse, jwtSecretResponse] = await Promise.all([
      ssmClient.send(
        new GetParameterCommand({
          Name: SSM_PARAMS.accessToken,
          WithDecryption: true,
        })
      ),
      ssmClient.send(
        new GetParameterCommand({
          Name: SSM_PARAMS.jwtSecret,
          WithDecryption: true,
        })
      ),
    ]);

    const storedToken = accessTokenResponse.Parameter?.Value ?? '';
    const jwtSecret = jwtSecretResponse.Parameter?.Value ?? '';

    // Timing-safe comparison to prevent timing attacks
    if (!secureCompare(token, storedToken)) {
      return createResponse(401, { error: 'Invalid token' });
    }

    // Sign and return JWT
    const now = Math.floor(Date.now() / 1000);
    const signedJwt = signJwt(
      {
        authorized: true,
        iat: now,
        exp: now + JWT_EXPIRY_DAYS * 24 * 60 * 60,
      },
      jwtSecret
    );

    return createResponse(200, { jwt: signedJwt });
  } catch (error) {
    console.error('Error validating token:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}
