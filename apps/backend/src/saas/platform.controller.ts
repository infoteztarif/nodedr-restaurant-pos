import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ModuleKey,
  PlatformRole,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformAuthGuard, type PlatformRequest } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';

@Controller('v1/platform')
export class PlatformController {
  constructor(
    private readonly auth: PlatformAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('bootstrap')
  bootstrap(
    @Headers('x-bootstrap-secret') secret: string,
    @Body() body: { name?: string; email?: string; password?: string },
  ) {
    if (
      !body.name ||
      !body.email ||
      !body.password ||
      body.password.length < 12
    ) {
      throw new BadRequestException(
        'Name, email and password (12+ chars) required',
      );
    }
    return this.auth.bootstrap({ secret, ...body } as {
      secret: string;
      name: string;
      email: string;
      password: string;
    });
  }

  @Post('auth/login')
  login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password required');
    }
    return this.auth.login(body.email, body.password);
  }

  @UseGuards(PlatformAuthGuard)
  @Get('overview')
  async overview() {
    const [tenants, active, trial, pastDue, paidSubscriptions] =
      await Promise.all([
        this.prisma.restaurant.count(),
        this.prisma.restaurant.count({
          where: { status: TenantStatus.ACTIVE },
        }),
        this.prisma.restaurant.count({ where: { status: TenantStatus.TRIAL } }),
        this.prisma.restaurant.count({
          where: { status: TenantStatus.PAST_DUE },
        }),
        this.prisma.subscription.findMany({
          where: { status: SubscriptionStatus.ACTIVE },
          select: { plan: { select: { monthlyPrice: true } } },
        }),
      ]);
    const monthlyRevenue = paidSubscriptions.reduce(
      (sum, subscription) => sum + Number(subscription.plan.monthlyPrice),
      0,
    );
    return { tenants, active, trial, pastDue, monthlyRevenue };
  }

  @UseGuards(PlatformAuthGuard)
  @Get('tenants')
  tenants() {
    return this.prisma.restaurant.findMany({
      include: {
        _count: { select: { branches: true, users: true } },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tenantModules: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(PlatformAuthGuard)
  @Patch('tenants/:id/status')
  updateStatus(
    @Req() request: PlatformRequest,
    @Param('id') id: string,
    @Body() body: { status?: TenantStatus; reason?: string },
  ) {
    this.assertSuperAdmin(request);
    if (!body.status || !Object.values(TenantStatus).includes(body.status)) {
      throw new BadRequestException('Valid tenant status required');
    }
    return this.prisma.restaurant.update({
      where: { id },
      data: {
        status: body.status,
        suspendedAt: body.status === TenantStatus.SUSPENDED ? new Date() : null,
        suspensionReason:
          body.status === TenantStatus.SUSPENDED ? body.reason?.trim() : null,
      },
    });
  }

  @UseGuards(PlatformAuthGuard)
  @Patch('tenants/:id/modules/:moduleKey')
  updateModule(
    @Req() request: PlatformRequest,
    @Param('id') restaurantId: string,
    @Param('moduleKey') rawModuleKey: string,
    @Body()
    body: { enabled?: boolean; expiresAt?: string | null; limits?: object },
  ) {
    this.assertSuperAdmin(request);
    if (!Object.values(ModuleKey).includes(rawModuleKey as ModuleKey)) {
      throw new BadRequestException('Invalid module');
    }
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be boolean');
    }
    const moduleKey = rawModuleKey as ModuleKey;
    return this.prisma.tenantModule.upsert({
      where: { restaurantId_moduleKey: { restaurantId, moduleKey } },
      create: {
        restaurantId,
        moduleKey,
        enabled: body.enabled,
        source: 'PLATFORM',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        limits: body.limits,
      },
      update: {
        enabled: body.enabled,
        source: 'PLATFORM',
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        limits: body.limits,
      },
    });
  }

  @UseGuards(PlatformAuthGuard)
  @Get('plans')
  plans() {
    return this.prisma.subscriptionPlan.findMany({
      include: { modules: true },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  private assertSuperAdmin(request: PlatformRequest) {
    if (request.platformUser.role !== PlatformRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super Admin access required');
    }
  }
}
