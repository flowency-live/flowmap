import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

const mockSend = vi.fn();

// Mock AWS SDK SSM client
vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  GetParameterCommand: vi.fn().mockImplementation((params) => params),
}));

// Import after mocks are set up
const { handler } = await import('./handler');
const { GetParameterCommand } = await import('@aws-sdk/client-ssm');

describe('validate-token handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createEvent = (body: string | null): APIGatewayProxyEventV2 =>
    ({
      body,
      headers: {},
      requestContext: {} as APIGatewayProxyEventV2['requestContext'],
    }) as APIGatewayProxyEventV2;

  it('returns 400 when token is missing from request body', async () => {
    const event = createEvent(null);

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Token is required',
    });
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const event = createEvent('not valid json');

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Invalid request body',
    });
  });

  it('returns 400 when token field is empty', async () => {
    const event = createEvent(JSON.stringify({ token: '' }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Token is required',
    });
  });

  it('returns 401 when token does not match SSM parameter', async () => {
    mockSend
      .mockResolvedValueOnce({ Parameter: { Value: 'correct-token' } })
      .mockResolvedValueOnce({ Parameter: { Value: 'jwt-secret' } });

    const event = createEvent(JSON.stringify({ token: 'wrong-token' }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Invalid token',
    });
  });

  it('returns JWT when token matches SSM parameter', async () => {
    const validToken = 'a1b2c3d4e5f67890';
    mockSend
      .mockResolvedValueOnce({ Parameter: { Value: validToken } })
      .mockResolvedValueOnce({ Parameter: { Value: 'jwt-signing-secret' } });

    const event = createEvent(JSON.stringify({ token: validToken }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body as string);
    expect(body).toHaveProperty('jwt');
    expect(typeof body.jwt).toBe('string');
    // JWT should have 3 parts separated by dots
    expect(body.jwt.split('.').length).toBe(3);
  });

  it('returns JWT with correct claims structure', async () => {
    const validToken = 'a1b2c3d4e5f67890';
    mockSend
      .mockResolvedValueOnce({ Parameter: { Value: validToken } })
      .mockResolvedValueOnce({ Parameter: { Value: 'jwt-signing-secret' } });

    const event = createEvent(JSON.stringify({ token: validToken }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;
    const body = JSON.parse(result.body as string);

    // Decode JWT payload (second part) - handle URL-safe base64
    const payloadPart = body.jwt.split('.')[1];
    const paddedPayload = payloadPart + '='.repeat((4 - (payloadPart.length % 4)) % 4);
    const payload = JSON.parse(
      Buffer.from(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    expect(payload).toHaveProperty('authorized', true);
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    // Expiry should be ~30 days in the future
    expect(payload.exp - payload.iat).toBe(30 * 24 * 60 * 60);
  });

  it('returns 500 when SSM parameter fetch fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('SSM error'));

    const event = createEvent(JSON.stringify({ token: 'any-token' }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body as string)).toEqual({
      error: 'Internal server error',
    });
  });

  it('fetches correct SSM parameters', async () => {
    const validToken = 'a1b2c3d4e5f67890';
    mockSend
      .mockResolvedValueOnce({ Parameter: { Value: validToken } })
      .mockResolvedValueOnce({ Parameter: { Value: 'jwt-secret' } });

    const event = createEvent(JSON.stringify({ token: validToken }));

    await handler(event);

    expect(GetParameterCommand).toHaveBeenCalledWith({
      Name: '/flowmap/auth/access-token',
      WithDecryption: true,
    });
    expect(GetParameterCommand).toHaveBeenCalledWith({
      Name: '/flowmap/auth/jwt-secret',
      WithDecryption: true,
    });
  });

  it('includes CORS headers in response', async () => {
    mockSend
      .mockResolvedValueOnce({ Parameter: { Value: 'token' } })
      .mockResolvedValueOnce({ Parameter: { Value: 'secret' } });

    const event = createEvent(JSON.stringify({ token: 'token' }));

    const result = (await handler(event)) as APIGatewayProxyStructuredResultV2;

    expect(result.headers).toMatchObject({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    });
  });
});
