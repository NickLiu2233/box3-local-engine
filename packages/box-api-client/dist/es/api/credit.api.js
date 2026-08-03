var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * 积分系统 API 客户端
 * 提供积分余额查询、交易历史记录、订阅计划和订阅购买等功能
 */
export class CreditApiClient {
    constructor(httpClient) {
        Object.defineProperty(this, "httpClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: httpClient
        });
    }
    /**
     * 获取当前用户的积分余额
     *
     * @returns 包含当前可用积分数量的响应对象
     * @throws {ApiError} 当请求失败或用户未认证时抛出
     */
    getBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClient.get('/credit/balance');
        });
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
    getHistory() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            return this.httpClient.get('/credit/history', {
                params: { page, limit },
            });
        });
    }
    /**
     * 获取所有可用的订阅计划列表
     * 包含各个计划的价格、包含的积分数量和功能特性
     *
     * @returns 包含所有订阅计划详情的响应对象
     * @throws {ApiError} 当请求失败时抛出
     */
    getPlans() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClient.get('/credit/plans');
        });
    }
    /**
     * 发起订阅购买流程
     * 根据选定的订阅计划创建支付订单，返回支付链接供用户完成支付
     *
     * @param data - 订阅请求参数，包含要订阅的计划名称
     * @returns 包含支付链接和订单信息的响应对象
     * @throws {ApiError} 当请求失败、用户未认证或计划不存在时抛出
     */
    subscribe(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.httpClient.post('/credit/subscribe', data);
        });
    }
}
//# sourceMappingURL=credit.api.js.map