import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  name: string;

  @IsString()
  @MaxLength(32)
  phone: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}