import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { userStatusEnum } from '../../db/schema.js';

export class UpdateStatusDto {
  @IsIn([...userStatusEnum.enumValues])
  status: (typeof userStatusEnum.enumValues)[number];

  @IsOptional() @IsString() @MaxLength(300)
  reason?: string;
}