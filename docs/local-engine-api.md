# Local Engine API 与 Swagger

BOX3 Local Engine 使用一份 OpenAPI 3.1 文档登记 Creator、Play、Player Service、玩家管理、VOXA、地图运行时、Server Manager 和登录门户的 HTTP 接口。`@box/apis` 是这些本地引擎服务共用的 TypeScript API 契约包，不再包含旧 BOX 平台的 Java、Createra、Content、Model 等生成客户端。

内部许可证签发器和迁移器是独立工具，不属于本地引擎对外服务，也不会进入统一 OpenAPI、Swagger 或 `@box/apis`。它们分别维护自己的内部接口和调用代码。

## 查看接口文档

只查看文档时，不需要启动 Creator、Play、Player Service、数据库或其他业务服务。在仓库根目录执行：

```bash
npm run api:docs
```

然后访问：

```text
http://127.0.0.1:3210/
```

该命令会先重新生成 OpenAPI，再启动独立的只读 Swagger UI。独立文档服务禁用 Try it out，不会向业务接口发送请求。按 `Ctrl-C` 停止。需要修改端口时使用：

```bash
BOX_API_DOCS_PORT=8080 npm run api:docs
```

页面资源来自独立文档项目自己的 `swagger-ui-dist`，不访问外部 CDN。文档列出全部服务的接口；`x-box-services` 表示实现该操作的服务，`x-box-deployment-modes` 表示可用部署模式。

Creator、Play、Player Service 和 VOXA 均不再提供 `/api/docs` 或 `/api/openapi`。开发与生产构建不会把 Swagger UI 或 OpenAPI JSON 打进业务服务。需要联调真实接口时，根据文档中的服务归属和鉴权说明，从调用端或 API 工具请求对应业务地址。

独立页面是只读文档，因此没有 Try it out 和 Authorize 操作，也不会读取 Cookie。调试玩家管理写请求时仍需携带 `box_local_admin_csrf` Cookie 对应的 `X-Box-Admin-Csrf`；Creator CLI 接口需要 CLI Bearer Token。不要在截图、Issue 或日志中公开 Token、Cookie 和管理密钥。

## 契约来源

| 路径                                                     | 职责                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------- |
| `internals/apis/openapi/openapi.json`                    | 生成后的完整 OpenAPI 文档                                        |
| `internals/apis/src/generated/openapi.ts`                | `openapi-typescript` 生成的 paths、operations 和 components 类型 |
| `internals/apis/src/generated/client.ts`                 | 按 operationId 生成的 `ApiClient`、工厂函数和原始响应方法        |
| `internals/apis/src/routes.ts`                           | 尚未迁移到 operation 调用的稳定路由常量                          |
| `internals/apis/scripts/generate-openapi.mjs`            | 扫描 Next API 路由并合并非 Next 服务接口                         |
| `internals/apis/scripts/openapi-schemas.mjs`             | 共享请求与响应 schema                                            |
| `internals/apis/scripts/openapi-operation-contracts.mjs` | operation 与具体 schema 的绑定                                   |
| `internals/apis/scripts/check-openapi.mjs`               | 路径、operationId、服务归属和核心 schema 校验                    |

生成文件禁止手工修改。当前生成器只扫描 `apps/game/pages/api` 和 `apps/voxa/pages/api`；地图运行时、Rust Server Manager 和登录门户等非 Next 路由在生成器的 `manualRoutes` 中登记。`apps/migrator/` 与 `apps/license-server/` 不在生成范围内。

## TypeScript 调用

优先使用生成客户端：

```ts
import { createApiClient } from '@box/apis'

const api = createApiClient({ baseUrl: 'http://127.0.0.1:3124' })
const players = await api.getApiPlayAdminPlayers({
  params: { query: { page: 1, pageSize: 20 } },
})
```

方法名、返回值、请求参数和路径都由 OpenAPI 推导。普通方法在请求失败时抛出 `ApiClientError`；需要读取响应头、状态码或流时，使用对应的 `Raw` 方法，例如 `getApiPlayAdminPlayersRaw`。调用端不应复制接口类型，也不应自行维护另一份 URL 清单。

浏览器默认携带同源 Cookie。需要 CSRF 的管理端可在创建客户端时传入 `csrfCookie` 和 `csrfHeader`。新增页面不得直接新增一套通用 fetch 封装。

## 新增或修改接口

1. 修改真实路由及服务端权限检查。
2. 确认生成器能识别路径和 HTTP method；非 Next 路由加入 `manualRoutes`。
3. 在 `openapi-schemas.mjs` 增加或修改 schema。
4. 在 `openapi-operation-contracts.mjs` 将 operation 绑定到请求和响应 schema。
5. 重新生成并校验：

   ```bash
   npm run api:generate
   npm run api:check
   npm run api:build
   ```

   `api:generate` 负责生成 OpenAPI JSON 和 TypeScript 类型，`api:check` 检查生成结果是否为最新，`api:build` 重新构建 `@box/apis`。

6. 调用端改用 `@box/apis` 的 `ApiClient`、`createApiClient` 和生成类型。
7. 验证 Swagger Try it out、未登录响应、权限不足响应、非法参数和正常结果。
8. 若修改玩家管理功能，同步验证菜单 capability、只读/编辑权限和服务端拒绝测试。

仓库级 `rush verify` 会重新生成并检查 OpenAPI。生成结果有差异时应随源码提交；CI 不接受只修改路由而不更新契约。

## 约束

- `@box/apis` 只描述 Local Engine，不得重新引入旧平台域名、旧登录方式或云端生成客户端。
- 请求和响应必须有稳定 schema；`additionalProperties: true` 只能作为尚未完成建模的过渡状态。
- 浏览器代码不得保存管理密钥、CLI Token、数据库连接串或内部服务 Token。
- 内部接口必须使用内部 Bearer Token，玩家管理写接口必须同时通过会话、capability 和 CSRF 校验。
- 删除或重命名路径时，应先搜索全部调用端并同步更新 OpenAPI、测试和文档。
