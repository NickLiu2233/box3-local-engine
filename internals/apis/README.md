# HTTP API 契约与客户端

`@box/apis` 维护本地引擎 HTTP 路由契约、OpenAPI、类型声明和生成客户端。Creator、玩家后台、管理器等应用通过同一套契约访问服务，避免各自维护一份请求 URL 和响应结构。地图脚本 API 声明属于 `internals/schema` / `packages/script-api`，不在这里生成。

## 来源与产物

| 文件/目录                                                     | 用途                         |
| ------------------------------------------------------------- | ---------------------------- |
| `src/routes.ts`、`src/domain.ts`、`src/local-engine-types.ts` | 路由定义与领域数据类型       |
| `src/permissions.ts`                                          | 契约权限元数据               |
| `scripts/generate-openapi.mjs`                                | 从契约生成 OpenAPI           |
| `scripts/generate-client.mjs`                                 | 生成应用使用的客户端         |
| `openapi/openapi.json`、`src/generated/`                      | 提交并检查同步的生成产物     |
| `test/`                                                       | 契约/生成客户端回归          |
| `dist/`                                                       | 包构建结果，不作为手工维护源 |

从仓库根先安装工作区依赖。修改契约或响应类型后，运行生成、同步检查与构建，再验证实际服务实现及调用者：

```sh
npm run api:generate
npm run api:check
npm run api:build
npm --prefix internals/apis test
```

不要直接改 `src/generated/` 绕过契约。检查路由方法、参数、响应、错误与权限是否一致；OpenAPI 类型正确不表示服务端自动完成了授权或输入校验。

`npm run api:docs` 启动本机文档服务器，实际地址以日志为准，Ctrl+C 停止。文档命令也会生成契约，因此运行后检查差异。按需执行的类型检查、测试和工程检查会在构建前核对已提交生成产物，避免重新生成文件掩盖遗漏；基础 `npm run verify` 不执行契约或生成同步检查。详见[测试指南](../../docs/testing.md)。
