import { ApiProperty } from '@nestjs/swagger';

export class SubscribeResponseDto {
  @ApiProperty({
    description: 'Checkout URL to redirect user to',
    example: 'https://checkout.creem.io/...',
  })
  checkoutUrl: string;
}
