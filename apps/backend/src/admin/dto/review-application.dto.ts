import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  // reject karte waqt wajah zaroori
  @ValidateIf((o: ReviewApplicationDto) => o.decision === 'rejected')
  @IsString() @MinLength(3) @MaxLength(300)
  reason?: string;
}