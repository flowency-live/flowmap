import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

const mockQuery = vi.fn();

// Mock DynamoDB client
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockQuery,
    })),
  },
  QueryCommand: vi.fn().mockImplementation((params) => params),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

// Import after mocks
const { handler } = await import('./handler');

describe('pre-sign-up handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INVITATION_TABLE_NAME = 'Invitation-test-table';
  });

  const createEvent = (
    email: string,
    inviteCode?: string
  ): PreSignUpTriggerEvent =>
    ({
      version: '1',
      region: 'eu-west-2',
      userPoolId: 'eu-west-2_test',
      userName: 'test-user',
      callerContext: {
        awsSdkVersion: '1.0.0',
        clientId: 'test-client',
      },
      triggerSource: 'PreSignUp_SignUp',
      request: {
        userAttributes: {
          email,
          'custom:inviteCode': inviteCode ?? '',
        },
        validationData: {},
      },
      response: {
        autoConfirmUser: false,
        autoVerifyEmail: false,
        autoVerifyPhone: false,
      },
    }) as PreSignUpTriggerEvent;

  it('returns error when invite code is missing', async () => {
    const event = createEvent('user@example.com', '');

    await expect(handler(event, {} as never, vi.fn())).rejects.toThrow(
      'Invitation code is required'
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns error when invitation not found', async () => {
    mockQuery.mockResolvedValueOnce({ Items: [] });

    const event = createEvent('user@example.com', 'invalid-code');

    await expect(handler(event, {} as never, vi.fn())).rejects.toThrow(
      'Invalid invitation code'
    );
  });

  it('returns error when invitation email does not match', async () => {
    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'other@example.com',
          code: 'valid-code',
          status: 'pending',
        },
      ],
    });

    const event = createEvent('user@example.com', 'valid-code');

    await expect(handler(event, {} as never, vi.fn())).rejects.toThrow(
      'Invitation email does not match'
    );
  });

  it('returns error when invitation already used', async () => {
    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'user@example.com',
          code: 'valid-code',
          status: 'accepted',
        },
      ],
    });

    const event = createEvent('user@example.com', 'valid-code');

    await expect(handler(event, {} as never, vi.fn())).rejects.toThrow(
      'Invitation has already been used'
    );
  });

  it('returns error when invitation is revoked', async () => {
    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'user@example.com',
          code: 'valid-code',
          status: 'revoked',
        },
      ],
    });

    const event = createEvent('user@example.com', 'valid-code');

    await expect(handler(event, {} as never, vi.fn())).rejects.toThrow(
      'Invitation has been revoked'
    );
  });

  it('auto-confirms user when valid pending invitation exists', async () => {
    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'user@example.com',
          code: 'valid-code',
          status: 'pending',
        },
      ],
    });

    const event = createEvent('user@example.com', 'valid-code');

    const result = await handler(event, {} as never, vi.fn());

    expect(result.response.autoConfirmUser).toBe(true);
    expect(result.response.autoVerifyEmail).toBe(true);
  });

  it('queries DynamoDB with correct index and code', async () => {
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');

    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'user@example.com',
          code: 'abc123',
          status: 'pending',
        },
      ],
    });

    const event = createEvent('user@example.com', 'abc123');

    await handler(event, {} as never, vi.fn());

    expect(QueryCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        TableName: 'Invitation-test-table',
        IndexName: 'byCode',
        KeyConditionExpression: 'code = :code',
        ExpressionAttributeValues: { ':code': 'abc123' },
      })
    );
  });

  it('handles case-insensitive email comparison', async () => {
    mockQuery.mockResolvedValueOnce({
      Items: [
        {
          id: 'inv-1',
          email: 'User@Example.COM',
          code: 'valid-code',
          status: 'pending',
        },
      ],
    });

    const event = createEvent('user@example.com', 'valid-code');

    const result = await handler(event, {} as never, vi.fn());

    expect(result.response.autoConfirmUser).toBe(true);
  });
});
