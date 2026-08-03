import { CreditApiClient } from './api/credit.api';
import { UsersApiClient } from './api/users.api';
/**
 * Box API 客户端配置选项
 */
export interface BoxApiClientOptions {
    /**
     * API 服务器的基础 URL
     * @example "https://api.example.com"
     */
    baseUrl: string;
    /**
     * 请求超时时间 (毫秒)
     * @default 30000
     */
    timeout?: number;
    /**
     * 默认请求头
     */
    headers?: Record<string, string>;
}
/**
 * Box API 客户端
 * 集成了所有 Box API 功能的统一客户端
 *
 * 注意: 认证令牌通过 Cookie 自动管理，无需手动设置
 *
 * 使用示例:
 * ```typescript
 * const client = new BoxApiClient({
 *   baseUrl: 'https://api.example.com',
 * });
 *
 * // 直接调用 API (认证通过 Cookie 自动处理)
 * const profile = await client.users.getMyProfile();
 * ```
 */
export declare class BoxApiClient {
    private readonly httpClient;
    /**
     * 用户相关的 API 操作
     */
    readonly users: UsersApiClient;
    /**
     * Credit 相关的 API 操作
     */
    readonly credit: CreditApiClient;
    constructor(options: BoxApiClientOptions);
    /**
     * 设置默认请求头
     *
     * @param headers 要添加或覆盖的请求头
     *
     * @example
     * ```typescript
     * client.setDefaultHeaders({
     *   'X-Custom-Header': 'value',
     * });
     * ```
     */
    setDefaultHeaders(headers: Record<string, string>): void;
    /**
     * 设置 Cookie
     * 用于手动设置认证 Cookie（当需要使用前端提供的 Cookie 时）
     * 不会覆盖其他已设置的请求头
     *
     * @param cookieString Cookie 字符串，可以是单个 Cookie 也可以是多个 Cookie（使用 '; ' 分隔）
     *
     * @example
     * ```typescript
     * // 设置单个 Cookie
     * client.setCookie('session_id=abc123');
     *
     * // 设置多个 Cookie
     * client.setCookie('session_id=abc123; user_id=456');
     *
     * // 设置前端复制的完整 Cookie 字符串
     * client.setCookie('auth_token=xyz789; expires=Wed, 09 Jun 2025 10:18:14 GMT');
     * ```
     */
    setCookie(cookieString: string): void;
}
//# sourceMappingURL=box-api-client.d.ts.map