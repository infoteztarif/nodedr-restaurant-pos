import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PlatformUser } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type PlatformRequest = Request & { platformUser: PlatformUser };

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!token) throw new UnauthorizedException('Platform token required');
    let payload: { sub?: string; kind?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired platform token');
    }
    if (payload.kind !== 'platform' || !payload.sub) {
      throw new UnauthorizedException('Invalid platform token');
    }
    const user = await this.prisma.platformUser.findUnique({
      where: { id: payload.sub },
    });
    if (!user?.isActive)
      throw new UnauthorizedException('Platform user disabled');
    request.platformUser = user;
    return true;
  }
}
