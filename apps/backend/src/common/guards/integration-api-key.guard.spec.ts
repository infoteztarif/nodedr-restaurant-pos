import { ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IntegrationApiKeyGuard } from './integration-api-key.guard';

const requestFor = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

describe('IntegrationApiKeyGuard aggregator licensing', () => {
  const rawToken = 'ordr_ext_test';
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  function setup(enabled: boolean) {
    const request = requestFor(rawToken) as never;
    const prisma = {
      integrationApiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'key-1',
          restaurantId: 'restaurant-1',
          branchId: null,
          scopes: ['orders:write'],
          provider: 'SWIGGY',
          revokedAt: null,
          tokenHash,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      featureFlag: {
        findUnique: jest.fn().mockResolvedValue({ enabled, expiresAt: null }),
      },
    };
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => null,
      getClass: () => null,
    };
    return {
      guard: new IntegrationApiKeyGuard(prisma as never, reflector as never),
      context: context as never,
      request: request as unknown as { integrationKey?: { provider: string } },
    };
  }

  it('blocks a Swiggy key when the platform feature is disabled', async () => {
    const { guard, context } = setup(false);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a Swiggy key when Super Admin enabled the feature', async () => {
    const { guard, context, request } = setup(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.integrationKey?.provider).toBe('SWIGGY');
  });
});
