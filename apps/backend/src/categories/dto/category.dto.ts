import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @Transform(trim) @IsString() @Length(2, 60)
  name: string;
}

export class UpdateCategoryDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 60)
  name?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}