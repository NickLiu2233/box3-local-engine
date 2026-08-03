import { ApiProperty } from '@nestjs/swagger';

export class CreditBalanceResponseDto {
  @ApiProperty({ description: 'Current credit balance', example: 1200 })
  creditBalance: number;

  @ApiProperty({ description: 'Current subscription plan', example: 'PRO' })
  subscriptionPlan: string;

  @ApiProperty({ description: 'Subscription status', example: 'ACTIVE' })
  subscriptionStatus: string;

  @ApiProperty({
    description: 'Subscription end date',
    example: '2023-12-31T23:59:59Z',
    required: false,
    nullable: true,
  })
  subscriptionEndDate: Date | null;
}
