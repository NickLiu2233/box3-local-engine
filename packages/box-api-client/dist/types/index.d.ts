/**
 * Box API 客户端库
 * 基于 fetch 的 REST API 客户端，提供完整的类型安全和错误处理
 *
 * 核心功能:
 * - 类型安全的 API 调用
 * - 自动 Cookie 处理 (认证通过 Cookie 管理)
 * - 请求超时控制
 * - 详细的错误处理
 *
 * 使用示例:
 * ```typescript
 * import { BoxApiClient } from '@box-local/box-api-client';
 *
 * // 初始化客户端
 * const client = new BoxApiClient({
 *   baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003',
 * });
 *
 * // 直接调用 API (认证通过 Cookie 自动处理)
 * const profile = await client.users.getMyProfile();
 * ```
 */
export * from './box-api-client';
export * from './core';
export * from './api';
//# sourceMappingURL=index.d.ts.map