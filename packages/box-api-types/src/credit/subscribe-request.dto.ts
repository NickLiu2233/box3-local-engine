import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubscribeRequestDto {
  @ApiProperty({ description: 'Plan name to subscribe to', example: 'PRO' })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty({
    description: 'URL to redirect to after successful payment',
    example: 'https://example.com/success',
    required: false,
  })
  @IsString()
  @IsOptional()
  successUrl?: string;
}
