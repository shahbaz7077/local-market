import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, IsUUID,
  Length, Matches, Max, MaxLength, Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const CLOUDINARY = { protocols: ['https'], require_protocol: true, host_whitelist: ['res.cloudinary.com'] };

export class CreateProductDto {
  @Transform(trim) @IsString() @Length(2, 120)
  title: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  description?: string;

  // string rakha hai taake paisa float ki ghalti se kharab na ho
  @Matches(/^\d{1,10}(\.\d{1,2})?$/, { message: 'price must be a number with up to 2 decimals' })
  price: string;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsUrl(CLOUDINARY, { each: true })
  imageUrls?: string[];
}

export class UpdateProductDto {
  @IsOptional() @Transform(trim) @IsString() @Length(2, 120)
  title?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  price?: string;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsIn(['active', 'hidden'])
  status?: 'active' | 'hidden';

  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsUrl(CLOUDINARY, { each: true })
  imageUrls?: string[];
}

export class ListProductsDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(60) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit: number = 20;
}