import {
  CreditBalanceResponseDto,
  RecordUsageRequestDto,
  RecordUsageResponseDto,
} from '@box-local/box-api-types';
import { AxiosInstance } from 'axios';

export class BoxApi {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * Record credit usage (Internal)
   */
  async recordUsage(
    data: RecordUsageRequestDto,
  ): Promise<RecordUsageResponseDto> {
    const response = await this.client.post<{ data: RecordUsageResponseDto }>(
      '/credit/usage',
      data,
    );
    return response.data.data;
  }

  /**
   * Get user balance (Internal)
   */
  async getInternalBalance(userId: string): Promise<CreditBalanceResponseDto> {
    const response = await this.client.get<{ data: CreditBalanceResponseDto }>(
      `/credit/internal/balance/${userId}`,
    );
    return response.data.data;
  }
}
