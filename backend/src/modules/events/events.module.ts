import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [DashboardModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
