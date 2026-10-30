import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { EntitlementsService } from './entitlements.service';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthGuard } from './platform-auth.guard';
import { PlatformController } from './platform.controller';
import { CompanySaasController } from './company-saas.controller';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        ({
          secret:
            config.get<string>('PLATFORM_JWT_SECRET') ??
            config.getOrThrow<string>('JWT_SECRET'),
          signOptions: { expiresIn: '4h' },
        }) as JwtModuleOptions,
    }),
  ],
  controllers: [PlatformController, CompanySaasController],
  providers: [EntitlementsService, PlatformAuthService, PlatformAuthGuard],
  exports: [EntitlementsService],
})
export class SaasModule {}
