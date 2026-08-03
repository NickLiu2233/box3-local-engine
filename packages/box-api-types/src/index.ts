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
export * from './credit';
export * from './inventory';
export * from './user';
