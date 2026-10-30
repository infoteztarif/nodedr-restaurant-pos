import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ModuleKey } from '@prisma/client';
import type { SessionUser } from '@nodedr-restaurant/types';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';

@Controller('v1/company/access')
export class CompanySaasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Auth('settings.manage')
  @Get()
  async overview(@CurrentUser() user: SessionUser) {
    const [departments, modules, users] = await Promise.all([
      this.prisma.department.findMany({
        where: { restaurantId: user.restaurantId },
        include: { _count: { select: { users: true, roles: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.tenantModule.findMany({
        where: { restaurantId: user.restaurantId },
      }),
      this.prisma.user.findMany({
        where: { restaurantId: user.restaurantId, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { id: true, name: true } },
          departments: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { departments, modules, users };
  }

  @Auth('settings.manage')
  @Post('departments')
  async createDepartment(
    @CurrentUser() user: SessionUser,
    @Body()
    body: {
      name?: string;
      code?: string;
      moduleKey?: ModuleKey;
      branchId?: string;
    },
  ) {
    if (!body.name || !body.code)
      throw new BadRequestException('Name and code required');
    if (body.moduleKey && !Object.values(ModuleKey).includes(body.moduleKey)) {
      throw new BadRequestException('Invalid module');
    }
    if (body.moduleKey) {
      await this.entitlements.assertModuleEnabled(
        user.restaurantId,
        body.moduleKey,
      );
    }
    if (body.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: body.branchId, restaurantId: user.restaurantId },
        select: { id: true },
      });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    return this.prisma.department.create({
      data: {
        restaurantId: user.restaurantId,
        name: body.name.trim(),
        code: body.code.trim().toUpperCase(),
        moduleKey: body.moduleKey,
        branchId: body.branchId,
      },
    });
  }

  @Auth('settings.manage')
  @Patch('departments/:id')
  async updateDepartment(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    const department = await this.prisma.department.findFirst({
      where: { id, restaurantId: user.restaurantId },
    });
    if (!department) throw new BadRequestException('Department not found');
    return this.prisma.department.update({
      where: { id },
      data: { name: body.name?.trim(), isActive: body.isActive },
    });
  }

  @Auth('settings.manage')
  @Post('departments/:id/users')
  async assignUser(
    @CurrentUser() user: SessionUser,
    @Param('id') departmentId: string,
    @Body()
    body: { userId?: string; isAdmin?: boolean; validUntil?: string | null },
  ) {
    if (!body.userId) throw new BadRequestException('userId required');
    const [department, member] = await Promise.all([
      this.prisma.department.findFirst({
        where: { id: departmentId, restaurantId: user.restaurantId },
      }),
      this.prisma.user.findFirst({
        where: { id: body.userId, restaurantId: user.restaurantId },
      }),
    ]);
    if (!department || !member)
      throw new BadRequestException('Department or user not found');
    return this.prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: body.userId, departmentId } },
      create: {
        userId: body.userId,
        departmentId,
        isAdmin: body.isAdmin ?? false,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      },
      update: {
        isAdmin: body.isAdmin ?? false,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      },
    });
  }
}
