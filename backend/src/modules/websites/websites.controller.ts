import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { UpdateWebsiteDto } from './dto/update-website.dto';
import { WebsitesService } from './websites.service';

@UseGuards(JwtAuthGuard)
@Controller('websites')
export class WebsitesController {
  constructor(private readonly websitesService: WebsitesService) {}

  @Get()
  findAll() {
    return this.websitesService.findAll();
  }

  @Post()
  create(@Body() body: CreateWebsiteDto) {
    return this.websitesService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateWebsiteDto,
  ) {
    return this.websitesService.update(id, body);
  }
}
