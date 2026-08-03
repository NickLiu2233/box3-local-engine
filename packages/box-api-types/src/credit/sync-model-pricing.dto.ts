import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

export class SyncModelPricingRequestDto {
  @ApiProperty({
    description: 'Conversion rate from USD to Credits (Credits per 1 USD)',
    example: 100,
    default: 100,
  })
  @IsNumber()
  @IsOptional()
  conversionRate?: number;
}

export class SyncModelPricingResponseDto {
  @ApiProperty({ description: 'Number of models updated' })
  updatedCount: number;

  @ApiProperty({ description: 'Number of models created' })
  createdCount: number;
}
