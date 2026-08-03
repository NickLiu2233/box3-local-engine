import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionPlanDto {
  @ApiProperty({ description: 'Plan ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Plan name (code)', example: 'PRO' })
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Professional' })
  displayName: string;

  @ApiProperty({ description: 'Price in cents', example: 1000 })
  price: number;

  @ApiProperty({ description: 'Monthly credits', example: 1200 })
  monthlyCredits: number;

  @ApiProperty({
    description: 'Description',
    example: 'Best for power users',
    nullable: true,
  })
  description: string | null;
}

export class GetSubscriptionPlansResponseDto {
  @ApiProperty({
    description: 'List of subscription plans',
    type: [SubscriptionPlanDto],
  })
  plans: SubscriptionPlanDto[];
}
