import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PublicKioskController } from './public-kiosk.controller';
import { PublicKioskService } from './public-kiosk.service';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';
import { CustomerTrackingController } from './customer-tracking.controller';
import { CustomerTrackingService } from './customer-tracking.service';

@Module({
  imports: [OrdersModule, NotificationsModule],
  controllers: [
    PublicMenuController,
    PublicKioskController,
    CustomerTrackingController,
  ],
  providers: [PublicMenuService, PublicKioskService, CustomerTrackingService],
})
export class PublicModule {}
