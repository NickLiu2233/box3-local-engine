import {
  CreditBalanceResponseDto,
  GetCreditHistoryResponseDto,
  GetSubscriptionPlansResponseDto,
  SubscribeRequestDto,
  SubscribeResponseDto,
} from '@box-local/box-api-types';
import { HttpClient } from '../core/http-client';

/**
 * 积分系统 API 客户端
 * 提供积分余额查询、交易历史记录、订阅计划和订阅购买等功能
 */
export class CreditApiClient {
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * 获取当前用户的积分余额
   *
   * @returns 包含当前可用积分数量的响应对象
   * @throws {ApiError} 当请求失败或用户未认证时抛出
   */
  async getBalance(): Promise<CreditBalanceResponseDto> {
    return this.httpClient.get<CreditBalanceResponseDto>('/credit/balance');
  }

  /**
   * 获取积分交易历史记录
   * 返回用户的积分消费和充值记录，支持分页查询
   *
   * @param page - 页码，从 1 开始，默认为 1
   * @param limit - 每页记录数，默认为 20
   * @returns 包含交易记录列表和总记录数的响应对象
   * @throws {ApiError} 当请求失败或用户未认证时抛出
   */
  async getHistory(page = 1, limit = 20): Promise<GetCreditHistoryResponseDto> {
    return this.httpClient.get<GetCreditHistoryResponseDto>('/credit/history', {
      params: { page, limit },
    });
  }

  /**
   * 获取所有可用的订阅计划列表
   * 包含各个计划的价格、包含的积分数量和功能特性
   *
   * @returns 包含所有订阅计划详情的响应对象
   * @throws {ApiError} 当请求失败时抛出
   */
  async getPlans(): Promise<GetSubscriptionPlansResponseDto> {
    return this.httpClient.get<GetSubscriptionPlansResponseDto>(
      '/credit/plans',
    );
  }

  /**
   * 发起订阅购买流程
   * 根据选定的订阅计划创建支付订单，返回支付链接供用户完成支付
   *
   * @param data - 订阅请求参数，包含要订阅的计划名称
   * @returns 包含支付链接和订单信息的响应对象
   * @throws {ApiError} 当请求失败、用户未认证或计划不存在时抛出
   */
  async subscribe(data: SubscribeRequestDto): Promise<SubscribeResponseDto> {
    return this.httpClient.post<SubscribeResponseDto>(
      '/credit/subscribe',
      data,
    );
  }
}
