import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardRangeDto } from './dto/dashboard-range.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  overview() {
    return this.dashboardService.overview();
  }

  @Get('reading-trend')
  readingTrend(@Query() query: DashboardRangeDto) {
    return this.dashboardService.readingTrend(query);
  }

  @Get('reading-by-website')
  readingByWebsite(@Query() query: DashboardRangeDto) {
    return this.dashboardService.readingByWebsite(query);
  }
}
