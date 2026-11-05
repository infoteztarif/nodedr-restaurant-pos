import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerTrackingService } from './customer-tracking.service';

const TOKEN = 'a'.repeat(32);

function build(enabled = true) {
  const prisma = {
    order: {
      findUnique: jest.fn().mockResolvedValue({
        orderNumber: 'O-100',
        type: 'TAKEAWAY',
        status: 'OPEN',
        acceptance: 'ACCEPTED',
        deliveryStatus: null,
        deliveryEtaAt: null,
        scheduledFor: null,
        createdAt: new Date('2026-11-05T10:00:00Z'),
        updatedAt: new Date('2026-11-05T10:01:00Z'),
        totalAmount: new Prisma.Decimal(250),
        branch: {
          name: 'Main',
          restaurant: {
            id: 'r1',
            name: 'Demo Restaurant',
            logoUrl: null,
            currency: 'INR',
          },
        },
        items: [{
          nameSnapshot: 'Paneer Tikka',
          quantity: 1,
          lineTotal: new Prisma.Decimal(250),
          status: 'PREPARING',
        }],
        payments: [],
      }),
    },
    featureFlag: {
      findUnique: jest.fn().mockResolvedValue({ enabled, expiresAt: null }),
    },
  };
  return { service: new CustomerTrackingService(prisma as never), prisma };
}

describe('CustomerTrackingService', () => {
  it('returns a PII-free customer tracking projection', async () => {
    const { service } = build();
    await expect(service.getOrder(TOKEN)).resolves.toMatchObject({
      orderNumber: 'O-100',
      restaurantName: 'Demo Restaurant',
      paid: false,
      items: [{ name: 'Paneer Tikka', status: 'PREPARING' }],
    });
  });

  it('hides tracking when Customer Portal is not licensed', async () => {
    const { service } = build(false);
    await expect(service.getOrder(TOKEN)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects malformed tokens without querying orders', async () => {
    const { service, prisma } = build();
    await expect(service.getOrder('short')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
  });
});
