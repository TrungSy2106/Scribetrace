import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWebsiteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  domain!: string;
}
