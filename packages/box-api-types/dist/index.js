"use strict";
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
/**
 * Box API Types 主入口
 * 导出所有 API 类型定义、接口和路由
 *
 * 这个包提供 Box API 的类型定义，供前后端共享使用
 * 包括 DTOs 应该实现的接口、路由定义等
 *
 * 使用示例：
 * ```typescript
 * import { IUserPrivateProfile, UserRoutes, Language } from '@box-local/box-api-types';
 *
 * // 在前端使用接口定义
 * const userProfile: IUserPrivateProfile = {
 *   userId: 123,
 *   displayName: 'Alice',
 *   // ...
 * };
 *
 * // 在后端使用接口
 * class UserService {
 *   getUserProfile(userId: number): Promise<IUserPrivateProfile> {
 *     // ...
 *   }
 * }
 * ```
 */
__exportStar(require("./credit"), exports);
__exportStar(require("./inventory"), exports);
__exportStar(require("./user"), exports);
//# sourceMappingURL=index.js.map