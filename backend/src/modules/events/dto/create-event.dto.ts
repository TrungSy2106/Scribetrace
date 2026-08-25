import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReadingEventType } from '../../../../generated/prisma/client';

export class EventPageDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class EventBrowserDto {
  @IsInt()
  tabId!: number;

  @IsInt()
  windowId!: number;
}

export class CreateEventDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  sessionId!: string;

  @IsInt()
  @Min(1)
  clientSeq!: number;

  @IsEnum(ReadingEventType)
  eventType!: ReadingEventType;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsString()
  title!: string;

  @IsISO8601()
  occurredAt!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventPageDto)
  page?: EventPageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventBrowserDto)
  browser?: EventBrowserDto;
}
