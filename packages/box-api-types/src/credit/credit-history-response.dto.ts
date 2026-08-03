import { ApiProperty } from '@nestjs/swagger';

export class CreditTransactionDto {
  @ApiProperty({ description: 'Transaction ID', example: '1' })
  id: string;

  @ApiProperty({ description: 'Amount changed', example: -10 })
  amount: number;

  @ApiProperty({ description: 'Transaction type', example: 'USAGE' })
  type: string;

  @ApiProperty({
    description: 'Description',
    example: 'GPT-4 Request',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Created at', example: '2023-11-25T10:00:00Z' })
  createdAt: Date;
}

export class GetCreditHistoryResponseDto {
  @ApiProperty({
    description: 'List of transactions',
    type: [CreditTransactionDto],
  })
  transactions: CreditTransactionDto[];

  @ApiProperty({ description: 'Total count', example: 100 })
  total: number;
}
