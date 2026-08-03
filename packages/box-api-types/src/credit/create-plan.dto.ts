import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePlanRequestDto {
  @ApiProperty({ description: 'Plan name (code)', example: 'PRO' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Professional' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Price in cents', example: 1000 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Monthly credits', example: 1200 })
  @IsNumber()
  monthlyCredits: number;

  @ApiProperty({
    description: 'Description',
    example: 'Best for power users',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePlanResponseDto {
  @ApiProperty({ description: 'Created plan ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Creem Product ID', example: 'prod_123456' })
  creemProductId: string;
}
