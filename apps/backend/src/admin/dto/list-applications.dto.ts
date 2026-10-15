import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListApplicationsDto {
  @IsOptional() @IsIn(['pending', 'approved', 'rejected'])
  status: 'pending' | 'approved' | 'rejected' = 'pending';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}