import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { roleEnum, userStatusEnum } from '../../db/schema.js';

export class ListUsersDto {
  @IsOptional() @IsIn([...userStatusEnum.enumValues]) status?: (typeof userStatusEnum.enumValues)[number];
  @IsOptional() @IsIn([...roleEnum.enumValues]) role?: (typeof roleEnum.enumValues)[number];
  @IsOptional() @IsString() @MaxLength(50) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}