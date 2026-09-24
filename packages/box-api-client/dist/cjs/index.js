"use strict";
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
 * import { BoxApiClient } from '@box/box-api-client';
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./box-api-client"), exports);
__exportStar(require("./core"), exports);
__exportStar(require("./api"), exports);
//# sourceMappingURL=index.js.map