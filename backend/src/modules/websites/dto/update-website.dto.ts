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
}
