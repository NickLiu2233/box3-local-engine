import { ApiProperty } from '@nestjs/swagger';

export class CreatePortalSessionResponseDto {
  @ApiProperty({
    description: 'Portal URL',
    example: 'https://billing.creem.io/...',
  })
  portalUrl: string;
}
