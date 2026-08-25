import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  titleSelector?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contentSelector?: string | null;
}
