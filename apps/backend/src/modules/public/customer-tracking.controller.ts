import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomerTrackingService } from './customer-tracking.service';

@ApiTags('public')
@Controller('v1/public/track')
export class CustomerTrackingController {
  constructor(private readonly tracking: CustomerTrackingService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':trackingToken')
  getOrder(@Param('trackingToken') trackingToken: string) {
    return this.tracking.getOrder(trackingToken);
  }
}
