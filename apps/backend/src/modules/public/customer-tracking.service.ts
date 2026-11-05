import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrder(trackingToken: string) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(trackingToken)) {
      throw new NotFoundException('Order tracking link is invalid');
    }

    const order = await this.prisma.order.findUnique({
      where: { trackingToken },
      select: {
        orderNumber: true,
        type: true,
        status: true,
        acceptance: true,
        deliveryStatus: true,
        deliveryEtaAt: true,
        scheduledFor: true,
        createdAt: true,
        updatedAt: true,
        totalAmount: true,
        branch: {
          select: {
            name: true,
            restaurant: {
              select: { id: true, name: true, logoUrl: true, currency: true },
            },
          },
        },
        items: {
          select: {
            nameSnapshot: true,
            quantity: true,
            lineTotal: true,
            status: true,
          },
        },
        payments: { select: { amount: true } },
      },
    });
    if (!order) throw new NotFoundException('Order tracking link is invalid');

    const feature = await this.prisma.featureFlag.findUnique({
      where: {
        restaurantId_key: {
          restaurantId: order.branch.restaurant.id,
          key: 'CUSTOMER_PORTAL',
        },
      },
      select: { enabled: true, expiresAt: true },
    });
    if (!feature?.enabled || (feature.expiresAt && feature.expiresAt <= new Date())) {
      throw new NotFoundException('Order tracking is not available');
    }

    const paidAmount = order.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    return {
      orderNumber: order.orderNumber,
      restaurantName: order.branch.restaurant.name,
      branchName: order.branch.name,
      logoUrl: order.branch.restaurant.logoUrl,
      currency: order.branch.restaurant.currency,
      type: order.type,
      status: order.status,
      acceptance: order.acceptance,
      deliveryStatus: order.deliveryStatus,
      deliveryEtaAt: order.deliveryEtaAt,
      scheduledFor: order.scheduledFor,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      totalAmount: order.totalAmount.toString(),
      paid: paidAmount >= Number(order.totalAmount),
      items: order.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        lineTotal: item.lineTotal.toString(),
        status: item.status,
      })),
    };
  }
}
