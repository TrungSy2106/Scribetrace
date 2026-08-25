import { IsDateString, IsOptional } from 'class-validator';

export class DashboardRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
