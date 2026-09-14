# ArenaPro CLI 接入 BOX Creator 设计

> 状态：提案（Draft）  
> CLI 仓库：`/Users/viyrs/Desktop/boxCode/arenapro-cli`  
> 现有命令：`apc`  
> 接入命名空间：`apc creator`

## 1. 决策

不新建 `box-cli`。在成熟的 ArenaPro CLI（`apc`）中增加 Creator Adapter，让它通过 Creator API 管理本地或远程 BOX 工程。

    apc creator ...
            │
            ▼
    Creator API v1
            │
            ▼
    Local Engine / Creator / Player Service

ArenaPro 现有的神岛命令继续保持原样：

    apc login
    apc list
    apc upload
    apc resource

BOX Creator 相关能力进入独立命名空间，避免凭据、接口和语义混在一起：

    apc creator profile ...
    apc creator login ...
    apc creator project ...
    apc creator script ...
    apc creator asset ...

## 2. 已确认的可复用基础

ArenaPro CLI 已经提供：

- 基于 `cac` 的命令注册；
- 全局 `--json`、结构化输出和语义化退出码；
- HTTP 请求、multipart 上传、文件流处理所需依赖；
- 浏览器登录命令；
- `env-paths` 全局配置目录；
- 地图列表、脚本上传、资源同步等成熟命令模式；
- TypeScript ESM 编译结构。

对应源码入口：

    cli/index.ts              命令注册和 JSON 模式
    cli/core.ts               输出、错误和退出码
    cli/env.ts                当前全局配置
    cli/auth.ts               当前神岛登录
    cli/arena.ts              神岛命令注册
    cli/cli-arena/*.ts        具体命令

Creator Adapter 应复用命令框架、输出约定和 HTTP 依赖；不复用神岛的 DAO3 endpoint、Token 格式或 `.env` 写入方式。

## 3. 新模块结构

建议在 ArenaPro CLI 中新增：

    cli/
    ├── creator.ts                         # registerCreatorCommands
    ├── creator/
    │   ├── client.ts                      # Creator HTTP Client
    │   ├── profile-store.ts               # 多服务器 Profile 元数据
    │   ├── credential-store.ts            # token 的安全存储接口
    │   ├── device-auth.ts                 # Creator Device Authorization Flow
    │   ├── authorization.ts               # CLI 侧权限错误映射
    │   ├── types.ts                       # Creator API v1 类型
    │   └── target-runner.ts               # 多 Profile fan-out
    └── cli-creator/
        ├── cmd-profile.ts
        ├── cmd-login.ts
        ├── cmd-status.ts
        ├── cmd-project.ts
        ├── cmd-script.ts
        ├── cmd-asset.ts
        └── cmd-workspace.ts

并在 `cli/index.ts` 中增加：

    import { registerCreatorCommands } from './creator.js';
    registerCreatorCommands(cli);

这样 Creator Adapter 是一个清晰的模块：CLI 调用方只需要理解命令；Creator HTTP Client 隐藏 token 刷新、错误转换、文件上传、版本检查和重试。

## 4. 多服务器 Profile

现有 `cli/env.ts` 的 `auth.json` 只保存一套 DAO3 Token/User-Agent，不能用于 Creator。Creator 必须单独使用 Profile 列表，不能覆盖或读取神岛凭据。

配置文件建议：

    <env-paths("arenapro-cli").config>/creator-profiles.json

示例：

    {
      "formatVersion": 1,
      "defaultProfile": "local",
      "profiles": {
        "local": {
          "endpoint": "http://127.0.0.1:3127",
          "serverInstanceId": "creator-local-01",
          "issuer": "http://127.0.0.1:3127",
          "accountId": "user-123",
          "tokenReference": "keychain:arenapro-cli/creator/local"
        },
        "production": {
          "endpoint": "https://creator.example.com",
          "serverInstanceId": "creator-prod-cn-01",
          "issuer": "https://identity.example.com",
          "accountId": "user-456",
          "tokenReference": "keychain:arenapro-cli/creator/production"
        }
      }
    }

Profile 规则：

- 名称只允许小写字母、数字和连字符；
- 每个 Profile 独立保存 endpoint、账户、服务器身份、能力缓存和 token 引用；
- access token / refresh token 不写进 `creator-profiles.json`；
- token 不能进入项目 `.env`、Git 或 CLI JSON 输出；
- endpoint 更换、`serverInstanceId` 或 issuer 变化后，CLI 必须拒绝复用旧 token 并要求重新登录；
- 本机/局域网 IPv4 与 `[::1]` 可以省略协议并默认 `http://`；公网 IP 和域名必须显式使用 `https://`，防止 token 被意外发送到不安全连接；
- `--profile` 可重复，用于多服务器操作；
- 未指定时使用 `defaultProfile`；`BOX_CLI_PROFILE` 仅作为 CI 的 profile 选择，不保存秘密。

命令：

    apc creator profile add local --endpoint 127.0.0.1:3127
    apc creator profile add production --endpoint https://creator.example.com
    apc creator profile list
    apc creator profile use production
    apc creator profile remove staging

## 5. 登录和凭据

Creator 登录使用独立的 Device Authorization Flow，而不是沿用 `cli/auth.ts` 的 DAO3 回调协议：

    apc creator login --profile production
             │
             ▼
    POST /api/creator/v1/auth/device/start
             │
             ▼
    浏览器登录 Creator 并确认 CLI 授权
             │
             ▼
    POST /api/creator/v1/auth/device/poll
             │
             ▼
    Profile 专属 access token / refresh token

接口：

    POST /api/creator/v1/auth/device/start
    POST /api/creator/v1/auth/device/poll
    POST /api/creator/v1/auth/refresh
    POST /api/creator/v1/auth/revoke
    GET  /api/creator/v1/auth/me

必须新增 `CredentialStore` 接口：

    interface CredentialStore {
      read(profileName: string): Promise<CreatorCredentials | undefined>
      write(profileName: string, credentials: CreatorCredentials): Promise<void>
      remove(profileName: string): Promise<void>
    }

优先实现：

    macOS Keychain
    Windows Credential Manager
    Linux Secret Service

若没有可用系统凭据库，才允许受限文件降级：单 Profile 独立文件、0600 权限、无 token 日志。

现有 `cli/auth.ts` 不适合用于 Creator：它服务 DAO3 授权协议，且当前实现包含特定 RSA 回调处理。Creator Adapter 必须拥有自己的 `device-auth.ts`，避免两个身份体系相互耦合。

## 6. Creator API 必须提供的接口

统一前缀：

    /api/creator/v1

### 6.1 无凭据服务发现

    GET /health

返回：

    {
      "apiVersion": "v1",
      "engineVersion": "0.1.1",
      "serverInstanceId": "creator-prod-cn-01",
      "issuer": "https://identity.example.com"
    }

Profile 创建、登录与 endpoint 变更时调用它。CLI 不能把 token 发送给未经确认的新 server instance。

### 6.2 登录、权限和能力

    GET /auth/me
    GET /capabilities

`auth/me` 返回当前账号、CLI 状态和 scope；`capabilities` 返回 API/引擎版本、脚本/DTS/资源/发布支持情况。

### 6.3 工程

    GET  /projects
    GET  /projects/:projectId
    GET  /projects/:projectId/maps
    GET  /projects/:projectId/export?scope=map|group
    POST /projects/import
    GET  /projects/:projectId/releases
    POST /projects/:projectId/publish
    POST /projects/:projectId/releases/:version/package

导出使用文件流，导入使用 multipart/form-data。Creator 服务端复用现有 Local Engine 的 `.boxproject`、地图组和发布模块，CLI 不接触 Blob。

### 6.4 脚本和 DTS

    GET    /projects/:projectId/scripts
    GET    /projects/:projectId/scripts/:side/:entry
    PUT    /projects/:projectId/scripts/:side/:entry
    DELETE /projects/:projectId/scripts/:side/:entry
    POST   /projects/:projectId/scripts/check
    GET    /projects/:projectId/scripts/types?side=client|server

脚本以可读内容和路径交互：

    {
      "content": "export function onStart() {}",
      "expectedRevision": "42"
    }

`side` 只能为 `client` 或 `server`。引擎仍可在内部生成 hash/Blob，但 hash 不成为 CLI 输入。

### 6.5 资源和变更集

    GET    /projects/:projectId/assets
    POST   /projects/:projectId/assets
    PUT    /projects/:projectId/assets/:assetPath
    DELETE /projects/:projectId/assets/:assetPath
    POST   /projects/:projectId/changes/preview
    POST   /projects/:projectId/changes/apply

所有多文件同步必须先校验、再 staged import、最后提交项目 head。系统已取消自动备份，因此不得依赖快照实现同步回滚。

## 7. 服务端权限模型

每个 Creator API 请求都必须执行：

    Bearer Token 有效？
      → 当前账号允许使用 CLI？
      → 是否有本操作 scope？
      → 是否有目标地图/地图组 ACL？
      → 执行操作并记录审计

首版 scope：

    cli.use
    projects.view
    projects.export
    projects.import
    projects.edit
    projects.publish
    projects.delete
    scripts.view
    scripts.edit
    assets.view
    assets.edit
    runtime.preview

项目级 ACL：

    viewer | editor | publisher | owner

例如：用户可以使用 production Profile 登录，但仍可能只拥有 `lobby` 的 editor 权限；服务器必须每次请求重新检查，不能相信 CLI 参数，也不能只在登录时检查。

常见响应：

    401 AUTH_REQUIRED / TOKEN_EXPIRED
    403 CLI_ACCESS_REQUIRED
    403 PERMISSION_DENIED
    403 PROJECT_ACCESS_DENIED
    409 REVISION_CONFLICT
    422 SCRIPT_SYNTAX_ERROR / PUBLISH_VALIDATION_FAILED

## 8. apc 命令设计

    apc creator
    ├── profile add|list|use|remove|rename
    ├── login|logout|whoami|status
    ├── project list|info|maps|import|export|publish|releases
    ├── script list|pull|push|delete|check|types
    ├── asset list|upload|update|delete
    └── workspace init|connect|pull|check|diff|push

例子：

    apc creator project list --profile production
    apc creator script push lobby ./scripts/server/index.js       --side server       --profile staging
    apc creator project export lobby       --scope group       --profile production       --out ./world.boxproject

`apc --json` 继续使用现有全局 JSON 输出约定；Creator 命令的成功数据必须包含 profile，便于 CI 和 AI 判断目标。

## 9. 多服务器 fan-out

只读命令可并发执行：

    apc creator project list       --profile local       --profile staging       --profile production       --parallel

写入命令必须显式声明多目标，交互式终端要求确认；CI 额外要求 `--yes`：

    apc creator script push lobby ./scripts/server/index.js       --side server       --profile staging       --profile production       --fanout       --yes

多服务器操作不是分布式事务。每个服务器独立认证、ACL、revision 和审计；失败不回滚已成功的服务器。输出必须逐 Profile 返回结果：

    {
      "operation": "creator.script.push",
      "results": [
        { "profile": "staging", "status": "success", "revision": "43" },
        { "profile": "production", "status": "failed", "code": "REVISION_CONFLICT" }
      ]
    }

对于正式上线，推荐“推 staging → 验证 → 单独推 production”，不要把 fan-out 当成原子发布。

## 10. 适配顺序

### Phase 1：框架、Profile 和安全登录

- 在 ArenaPro CLI 增加 `registerCreatorCommands`；
- 实现 `CreatorProfileStore`、`CredentialStore` 和 `CreatorHttpClient`；
- 增加 `apc creator profile`、`login`、`status`；
- Creator 实现 `health`、`auth/me`、`capabilities`；
- Creator 服务端实现 `cli.use` 与项目 ACL 检查；
- CLI 不再需要新建 `box-cli` 项目。

### Phase 2：只读与工程包

- 实现 project list/info/maps；
- 实现 `.boxproject` 导入导出；
- 打通逐 Profile 审计和错误输出；
- 增加 API 契约测试。

### Phase 3：脚本与 DTS

- 实现普通文本脚本读取、更新、删除和诊断；
- 自动获取 `client.d.ts`、`server.d.ts`；
- 实现 revision 冲突和 Change Set。

### Phase 4：资源、工作区和多服务器发布

- 图片/音频上传、替换、删除；
- 工作区同步；
- read-only 并行、write fan-out 与逐目标结果；
- CI/AI 使用 `--json`、`--yes`、`dry-run`。

## 11. 验收标准

- 安装 ArenaPro CLI 后，无需安装第二个 CLI；
- `apc creator profile list` 不泄露 token；
- 同一用户可登录多个 Creator 服务器，凭据互不覆盖；
- endpoint 改指向新服务器后旧 token 不会被发送；
- 未登录、无 CLI scope、无项目 ACL 都被服务端拒绝；
- CLI 可以导入导出、管理脚本、下载 DTS 和发布；
- 多服务器写入返回逐目标结果；
- CLI 和 Creator 服务端都不直接操作内部 Blob；
- 发布不会自动创建备份。

## 12. 最终建议

ArenaPro CLI 是已经存在的、真实可运行的 CLI 基座；BOX 的工作应是增加一个 `Creator Adapter`，不是重新发明命令框架。

最先打通的纵向链路：

    apc creator profile add local --endpoint 127.0.0.1:3127
      → apc creator login --profile local
      → Creator Device Auth
      → cli.use + projects.view + 项目 ACL
      → apc creator project list --profile local
      → 审计事件

它稳定后再增加工程包、脚本、DTS、资源和多服务器发布。
