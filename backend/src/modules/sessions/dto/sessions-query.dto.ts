import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { SessionState } from '../../../../generated/prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SessionsQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SessionState)
  state?: SessionState;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  articleId?: string;
}
