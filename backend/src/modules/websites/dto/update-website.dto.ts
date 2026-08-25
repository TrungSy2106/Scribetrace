import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWebsiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleSelector?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contentSelector?: string | null;
}
