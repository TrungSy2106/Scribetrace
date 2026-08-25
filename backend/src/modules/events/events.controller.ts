import { Body, Controller, Post } from '@nestjs/common';
import { CreateEventBatchDto } from './dto/create-event-batch.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() body: CreateEventDto) {
    return this.eventsService.create(body);
  }

  @Post('batch')
  createBatch(@Body() body: CreateEventBatchDto) {
    return this.eventsService.createBatch(body);
  }
}
