import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ApplySellerDto {
  @Transform(trim) @IsString() @Length(2, 80)
  shopName: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  description?: string;
}