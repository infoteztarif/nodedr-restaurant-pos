import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PlatformRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.platformUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (
      !user?.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid platform credentials');
    }
    await this.prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        kind: 'platform',
        role: user.role,
      }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async bootstrap(input: {
    secret: string;
    name: string;
    email: string;
    password: string;
  }) {
    const expected = this.config.get<string>('PLATFORM_BOOTSTRAP_SECRET');
    if (!expected || input.secret !== expected) {
      throw new UnauthorizedException('Invalid bootstrap secret');
    }
    if ((await this.prisma.platformUser.count()) > 0) {
      throw new ConflictException('Platform administrator already exists');
    }
    const user = await this.prisma.platformUser.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(input.password, 12),
        role: PlatformRole.SUPER_ADMIN,
      },
    });
    return { id: user.id, email: user.email, role: user.role };
  }
}
