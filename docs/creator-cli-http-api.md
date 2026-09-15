# Creator CLI 与 HTTP API（当前实现）

本文记录当前可用的 Creator HTTP 接口、CLI Token 权限模型，以及 CLI 适配器应遵守的协议。它描述的是**已经实现**的能力；`[ArenaPro CLI 接入设计](./arenapro-cli-creator-adapter.md)` 中的设备登录、工程导入导出、资源同步等内容仍是后续设计，不应当被当作当前 API 合约。

## 1. 适用范围与术语

- **Creator 服务**：编辑工程的 HTTP 服务。开发模式默认是 `http://127.0.0.1:3127`。
- **Player Service**：玩家、Creator 权限和 CLI Token 的身份服务。开发模式默认是 `http://127.0.0.1:3124`。
- **本地工程 ID**：项目目录 key，例如 `my-map`；可用于 Local Engine 管理接口。
- **永久地图 ID**：创建地图时生成、不会因目录或公开名称变化而改变的 ID。外部 CLI 配置应优先保存它。
- **CLI Token**：以 `bxc_` 开头的长期 Bearer Token。只在玩家管理中显示一次，服务端仅保存其 HMAC，不保存明文。

`@box-local/cli`（`packages/cli`）是协议契约包：它定义 API 前缀、权限、脚本路径、输入校验和 20 MiB 上限。它不保存 Token、不发 HTTP 请求，也不绑定某个命令行程序。

## 2. 多服务器 CLI Profile

CLI 应把每台 Creator 服务器保存为独立 Profile。Profile 可以使用服务器名称而不是在项目中硬编码 IP：

```json
{
  "defaultProfile": "local",
  "profiles": {
    "local": { "endpoint": "http://127.0.0.1:3127" },
    "staging": { "endpoint": "https://creator.staging.example.com" }
  }
}
```

建议：

- Profile 元数据和 Token 分开保存；Token 使用系统凭据库或 CLI 的全局私密配置，绝不写入工程 `.env`、`dao3.config.ts`、Git 或命令输出。
- 首次添加或 endpoint 变化时先请求 `GET /api/creator/v1/health`，核对 `serverInstanceId` 与 `issuer`。
- 本机或受控局域网可用 HTTP；公网 endpoint 必须使用 HTTPS，避免将 Bearer Token 发送到明文链路。
- 命令的 `--profile <name>` 只选择服务器；项目文件只保存永久地图 ID 与 Profile 名称，不保存 Token。

## 3. 权限与 Token

Creator 权限由服主或管理员在“玩家管理”中授予。创建 CLI Token 时，Token scope 不能超过该玩家已有的 Creator 权限。

| Scope | 用途 |
| --- | --- |
| `projects.view` | 查看 Creator 工程；这是有 Creator Access 的账号的基础能力 |
| `projects.create` | 创建主地图或副地图 |
| `projects.edit` | 修改地图、运行时配置与脚本 |
| `projects.delete` | 删除地图或地图组 |
| `projects.import` | 导入工程（预留） |
| `projects.export` | 导出工程（预留） |
| `models.manage` | 管理 VOXA 模型（预留） |

### 3.1 在玩家管理中签发／撤销

以下是 Player Service 的管理接口，供玩家管理 UI 或受信任的管理客户端调用；普通 Creator CLI 不需要持有服主管理凭据。

```http
POST /api/play-admin/players/:subjectId
Cookie: box_local_admin_session=...
X-Box-Admin-CSRF: ...
Content-Type: application/json

{"action":"create-cli-token","name":"CI deploy","scopes":["projects.create","projects.edit"]}
```

成功时只返回一次明文 Token：

```json
{
  "id": "18 位十六进制 token id",
  "name": "CI deploy",
  "scopes": ["projects.create", "projects.edit"],
  "token": "bxc_..."
}
```

撤销使用同一路由：

```json
{"action":"revoke-cli-token","tokenId":"..."}
```

Token 无需频繁登录，但应在机器丢失、人员离开、权限下调或 CI 密钥轮换时立即撤销。不要把服主 Token 暴露给 CLI；CLI 只使用 `bxc_...`。

## 4. 服务发现

```http
GET /api/creator/v1/health
```

无需认证，返回：

```json
{
  "apiVersion": "v1",
  "engineVersion": "0.1.1",
  "serverInstanceId": "local-engine",
  "issuer": "local-engine",
  "deploymentMode": "creator"
}
```

响应中的实例身份用于 Profile 校验，不可把它当作权限证明。

## 5. 已实现的工程接口

这些接口由 Creator 服务提供，均使用：

```http
Authorization: Bearer bxc_...
```

| Method | Path | 最低 scope | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/local-projects` | `projects.view` | 列出本地工程 |
| `POST` | `/api/local-projects` | `projects.create` | 创建工程；body 至少含 `id`、`name` |
| `PATCH` | `/api/local-projects/:localId` | `projects.edit` | 更新工程元数据 |
| `DELETE` | `/api/local-projects/:localId` | `projects.delete` | 删除工程 |
| `GET` | `/api/local-projects/:localId/runtime` | `projects.view` | 查询 edit/play 运行时状态 |
| `POST` | `/api/local-projects/:localId/runtime` | `projects.edit` | 启动运行时；body 为 `{"mode":"edit"}` 或 `{"mode":"play"}` |

创建工程示例：

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $BOX_CREATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"id":"demo-map","name":"Demo map"}' \
  http://127.0.0.1:3127/api/local-projects
```

响应 `project.permanentMapId` 是后续脚本接口应长期保存的地图身份。

## 6. 脚本上传与覆盖

```http
PUT /api/creator/v1/projects/:projectId/scripts/:side/:entry
Authorization: Bearer bxc_...
Content-Type: application/json

{"content":"export const onStart = () => {};\n"}
```

参数规则：

| 字段 | 规则 |
| --- | --- |
| `projectId` | 推荐永久地图 ID；当前服务也兼容本地工程 ID |
| `side` | 仅 `server` 或 `client` |
| `entry` | 1–160 个 `[A-Za-z0-9._-]` 字符；不允许路径分隔符或 `..` |
| `content` | UTF-8 文本，最大 **20 MiB** |

Next 请求体限制已配置为 22 MiB，为 JSON 包装预留空间；最终业务限制始终是内容本身的 20 MiB。

成功响应：

```json
{
  "entry": "gameplay.js",
  "side": "server",
  "revision": "...",
  "hash": "Qm...",
  "shared": true
}
```

- 对同一 `side`、`entry` 再次 `PUT` 即为**覆盖**；请求无需先删除。
- `hash` 是服务端生成的内容地址，CLI 不需要生成、传入或保存它。
- 除 `index.js` 与 `clientIndex.js` 外，上传脚本默认 `shared: true`：其索引存入主地图的地图组共享状态，组内地图可读取同一共享脚本。
- 两个入口脚本保持地图本地资源，响应为 `shared: false`。
- 引擎可继续生成/刷新其 DTS 文件；CLI 上传的是可读源文本，不操作 Blob 或 DTS。

上传本地文件：

```bash
jq -Rs '{content: .}' server/gameplay.js | curl --fail-with-body -X PUT \
  -H "Authorization: Bearer $BOX_CREATOR_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @- \
  "http://127.0.0.1:3127/api/creator/v1/projects/$PERMANENT_MAP_ID/scripts/server/gameplay.js"
```

生产 CLI 应使用 HTTP 客户端的 JSON streaming/文件读取能力，避免把大脚本放进 shell 参数或日志。上例只用于说明请求结构。

## 7. 状态码与错误码

| 状态 | 常见 code / message | 处理建议 |
| --- | --- | --- |
| `401` | 身份验证失败 | 检查 Token 是否遗漏、失效或已撤销 |
| `403` | `CREATOR_ACCESS_REQUIRED` | 玩家尚未开启 Creator Access |
| `403` | `CREATOR_PERMISSION_DENIED` | Token 缺少所需 scope；重新签发最小必要权限 Token |
| `404` | 路由或工程不存在 | 检查 endpoint、永久地图 ID 与脚本路径 |
| `405` | 仅允许 `PUT` | 使用正确 HTTP method |
| `422` | `SCRIPT_SIDE_INVALID` | `side` 不是 `client`/`server` |
| `422` | `SCRIPT_ENTRY_INVALID` | 文件名含路径、`..` 或非法字符 |
| `422` | `SCRIPT_CONTENT_REQUIRED` | `content` 不是字符串 |
| `422` | `SCRIPT_CONTENT_TOO_LARGE` | UTF-8 内容超过 20 MiB |
| `422` | `SCRIPT_WRITE_FAILED` | 本地工程状态未初始化、工程不存在或写入失败 |

CLI 应把 JSON 错误中的 `code` 当作机器可读字段，把 `message` 当作面向人的提示；不可据此打印 Authorization header、Token 或完整工程内容。

## 8. 网络与安全要求

- Creator API 仅在 Creator 部署模式启用；非 Creator 服务拒绝这些接口。
- 服务端检查允许的 Host，并拒绝浏览器跨站修改请求；CLI 使用 Bearer Token，不依赖 Cookie 或 CSRF 豁免技巧。
- 每个写入请求都重新验证 Token、Creator Access 与 `projects.edit`，不能只在登录时验证。
- 路由参数会进行 URL 编码，服务端进一步拒绝 `..` 和路径字符；不要拼接未经编码的 entry 名称。
- CLI Token 只授予必要 scope。只需要上传脚本的自动化应仅使用 `projects.edit`（以及创建/删除临时工程所需的 scope）。
- 服务器应通过反向代理提供 HTTPS、访问日志与速率限制；不要把 Creator 端口直接暴露到不受信任公网。
- 工程脚本文本可能含敏感信息。发布前仍需遵守 Local Engine 的敏感内容检查；API 不会替 CLI 自动脱敏日志。

## 9. 开发与验证

```bash
pnpm dev --infra
```

开发服务地址：Creator `3127`、Player Service `3124`。`--infra` 会启动开发 PostgreSQL 与 Redis；它不会构建 Creator 镜像。

协议包测试：

```bash
pnpm --filter @box-local/cli test
```

手动验证时应始终使用临时玩家、临时 CLI Token 与临时工程，并在 `finally` 中撤销 Token、停止运行时、删除工程。这样能同时覆盖权限、网络输入校验、共享脚本索引与覆盖写入，而不污染真实地图。
