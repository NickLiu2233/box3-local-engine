import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecordUsageRequestDto {
  @ApiProperty({
    description: 'User ID (optional, for internal use)',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Model name', example: 'gpt-4' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Input tokens used', example: 100 })
  @IsNumber()
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens used', example: 50 })
  @IsNumber()
  outputTokens: number;
}

export class RecordUsageResponseDto {
  @ApiProperty({ description: 'Credits deducted', example: 10 })
  deductedCredits: number;

  @ApiProperty({ description: 'Remaining balance', example: 90 })
  remainingBalance: number;
}
