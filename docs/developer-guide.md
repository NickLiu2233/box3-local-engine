# 开发者与协作手册

本文面向第一次参与 BOX3 Local Engine 开发的贡献者，说明如何获取代码、安装依赖、准备基础服务、启动源码、定位模块、验证修改、构建部署包并提交 Pull Request。用户只想安装和使用发行版时，请从根目录 [README](../README.md) 选择桌面版或服务器版安装文档。

## 1. 开发环境

必须准备：

- Git；
- Node.js `22.17.x`，版本记录在根目录 `.node-version`；
- Docker Engine 或 Docker Desktop，并支持 Docker Compose v2；
- 至少可用的 PostgreSQL；Redis 可选；
- Rust stable，仅在修改 Rust 管理器、运行 Rust 测试或构建桌面 App 时需要；
- 对应平台的原生构建工具，仅在生成桌面发行包时需要。

仓库使用 Rush `5.156.0` 管理所有 JavaScript/TypeScript 项目。Rush 会自动使用仓库锁定的 pnpm `10.12.1`，不需要全局安装 pnpm。推荐全局安装 Rush，未安装时也可以使用根 `package.json` 中的 npm 命令，它们会调用仓库自带的 Rush 启动器。

```bash
npm install --global @microsoft/rush@5.156.0
node --version
rush --version
docker version
docker compose version
```

Node 版本不一致时，先通过 nvm、fnm 或其他版本管理器切换到 `22.17.x`。不要通过修改 `package.json` 的 `engines` 绕过检查。

## 2. 获取代码与创建分支

首次参与时先 Fork 仓库，再克隆自己的 Fork：

```bash
git clone https://github.com/<your-account>/box-local-engine.git
cd box-local-engine
git remote add upstream https://github.com/ifishcool/box-local-engine.git
git fetch upstream
```

每项工作从最新主分支创建独立分支：

```bash
git switch main
git pull --ff-only upstream main
git switch -c codex/<short-description>
git status --short
```

不要直接在 `main` 开发，也不要覆盖工作区中不属于自己的改动。分支名应说明范围，例如 `codex/player-permissions`、`codex/linux-installer` 或 `codex/voxa-model-card`。

## 3. 安装仓库依赖

首次克隆或普通拉取后执行：

```bash
rush install
```

也可以从根目录执行等价命令：

```bash
npm run install:all
```

Rush 的项目清单是 `rush.json`，唯一的 JavaScript 依赖锁文件是 `common/config/rush/pnpm-lock.yaml`。不要重新创建根目录的 `pnpm-workspace.yaml`、`pnpm-lock.yaml` 或工作区 `.npmrc`。

| 命令           | 使用时机                                      | 是否更新锁文件           |
| -------------- | --------------------------------------------- | ------------------------ |
| `rush install` | 克隆仓库、切换分支、安装已锁定依赖            | 否，锁文件不一致时会失败 |
| `rush update`  | 修改 `package.json`、新增 Rush 项目或调整依赖 | 是                       |

修改依赖后的正确流程：

```bash
rush update
git diff -- common/config/rush/pnpm-lock.yaml
rush check
```

新增项目时还必须把项目登记到 `rush.json`。不要绕过 Rush 直接调用 pnpm 的依赖安装命令，否则其他贡献者和 CI 无法复现结果。

## 4. 配置开发环境

复制环境变量模板：

```bash
cp .env.docker.example .env
```

`.env` 只保存在本机，禁止提交。使用已有 PostgreSQL 和 Redis 时，至少核对：

```env
BOX_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

开发环境可以不启用 Redis；涉及会话、限流、构建协调或多进程行为时，应使用 Redis 验证。数据库必须是开发或测试数据库，不要连接生产数据库。

环境变量的完整说明、默认值和生效范围见[配置参考](./configuration-reference.md)。任何新增或改名的环境变量，都要同步更新模板、启动器表单、Compose 传递和配置文档。

## 5. 第一次启动

已有可用 PostgreSQL/Redis 时，启动完整源码开发栈：

```bash
rush dev
```

没有基础服务时，让开发命令同时启动仓库提供的 PostgreSQL/Redis：

```bash
rush dev --infra
```

对应 npm 别名为 `npm run dev` 和 `npm run dev:infra`。

| 服务            | 地址                     | 用途                 |
| --------------- | ------------------------ | -------------------- |
| Creator         | `http://127.0.0.1:3127/` | 地图工程、编辑和发布 |
| Play            | `http://127.0.0.1:3121/` | 地图大厅、房间和游玩 |
| VOXA            | `http://127.0.0.1:3123/` | 模型、皮肤和动画编辑 |
| Player Service  | `http://127.0.0.1:3124/` | 登录与玩家管理 API   |
| 参考登录门户    | `http://127.0.0.1:3125/` | 注册、登录和回跳示例 |
| Creator Runtime | `9966/9967`              | Creator 游戏运行时   |
| Play Runtime    | `9971`                   | Play 游戏运行时      |

`rush dev` 直接运行源码，不会构建或启动业务镜像；只有显式传入 `--infra` 才会管理开发 PostgreSQL/Redis。停止开发命令时，不要顺手删除数据库卷。

只修改 Creator 相关功能时可以减少启动范围：

```bash
rush dev-creator
# 或同时启动基础设施
rush dev-creator --infra
```

### 玩家管理后台前端

玩家管理的 Umi 前端为了保持独立热更新，不包含在 `rush dev` 进程中。先保持 Player Service 和 PostgreSQL 运行，再另开终端：

```bash
cd apps/player-admin
npm run dev
```

浏览器打开 `http://127.0.0.1:8000/`。开发服务器把 `/api` 代理到 `http://127.0.0.1:3124`。如果页面显示“玩家管理服务暂时不可用”，先查看 Player Service 日志；最常见原因是 PostgreSQL 未启动、`.env` 中的账号不匹配，或开发 schema 尚未初始化。没有外部数据库时应使用 `rush dev --infra` 或 `rush dev-creator --infra`。

发行构建会把 `apps/player-admin` 的静态产物装入 Player Service，因此部署环境直接访问 Player Service 管理地址，不运行 8000 端口。

前端页面通常支持热更新。`apps/local-engine/src/`、`services/game-server/src/`、公共包或运行时子进程变化后，通常需要停止并重新执行开发命令。Creator、Play 和 Player Service 使用独立 `.next-*` 与临时 tsconfig，不要手工提交这些生成目录。

## 6. 找到需要修改的模块

| 功能                                           | 主要目录                    |
| ---------------------------------------------- | --------------------------- |
| Creator、Play、Player Service 页面与引擎客户端 | `apps/game/`                |
| 玩家管理后台                                   | `apps/player-admin/`        |
| 工程、地图组、发布包和运行时生命周期           | `apps/local-engine/src/`    |
| 权威游戏服务器与脚本运行时                     | `services/game-server/src/` |
| VOXA 模型、皮肤和动画编辑                      | `apps/voxa/`                |
| 桌面启动器                                     | `apps/deployment-manager/`  |
| 桌面/Web 共用管理核心                          | `apps/manager-core/`        |
| Linux 管理服务                                 | `apps/server-manager-rust/` |
| 玩家登录与注册门户                             | `apps/player-auth-portal/`  |
| 内部迁移工具                                   | `apps/migrator/`            |

Creator 编辑可变 `.boxproject` 工程，Play 只运行发布后的只读 `.boxplay` 快照。地图 ID、地图组、Blob/hash、脚本 API、发布清单、MuDB 和运行时协议属于兼容接口，修改前应阅读[系统架构](./architecture.md)和[与 boxes 的对齐基线](./boxes-parity.md)。

玩家管理菜单和服务端 API 必须使用同一套 capability。增加页面、按钮或写操作时，要同时完成：

1. 前端菜单和控件可见性；
2. API 服务端授权；
3. 权限组中的查看/编辑分类；
4. 拒绝访问和越权测试；
5. API 与管理后台文档更新。

HTTP API 统一由 `internals/apis` 维护。开发接口前先阅读 [Local Engine API 与 Swagger](./local-engine-api.md)，并使用以下命令更新契约：

```bash
npm run api:generate
npm run api:check
npm run api:build
```

`openapi/openapi.json`、`src/generated/openapi.ts` 和 `src/generated/client.ts` 是生成结果，不应手工修改。调用端使用 `ApiClient` 或 `createApiClient` 及其生成方法，不要复制请求/响应 interface，也不要为单个应用再建一套通用 API 封装。Swagger 页面只在开发环境开放，正式构建不会携带 Swagger UI 资源和 OpenAPI JSON。

不能只隐藏前端按钮。账号、权限、付费、奖励和权威存档也不能交给客户端脚本决定。

## 7. Rush 日常开发命令

在仓库根目录执行跨项目命令：

```bash
rush build
rush build --to @box/player-admin
rush build --to @box/voxa
rush build --from @box/script-api
```

- `--to` 构建目标项目及其上游依赖，适合验证一个应用；
- `--from` 构建指定项目及所有受它影响的下游项目，适合修改公共包后验证影响面。

执行单个项目自己的脚本时，进入项目目录使用 `rushx`：

```bash
cd apps/player-admin
rushx build

cd ../../services/game-server
rushx test
```

根 `package.json` 提供容易发现的 npm 别名，底层仍使用 Rush：

| npm 命令              | Rush 行为          |
| --------------------- | ------------------ |
| `npm run install:all` | `rush install`     |
| `npm run update:all`  | `rush update`      |
| `npm run dev`         | `rush dev`         |
| `npm run dev:infra`   | `rush dev --infra` |
| `npm run build`       | `rush build`       |
| `npm run format`      | `rush format`      |
| `npm run lint`        | `rush lint`        |
| `npm run typecheck`   | `rush typecheck`   |
| `npm test`            | `rush test`        |
| `npm run verify`      | `rush verify`      |

自定义参数放在 `--` 后：

```bash
npm run build -- --to @box/player-admin
npm run package:images -- --architecture arm64 --service player-service
```

Rush 同一仓库通常只允许一个会修改公共安装状态或使用全局命令锁的任务运行。出现“另一个 Rush 进程正在运行”时，先检查是否已有安装、验证或打包任务，等待它完成；不要删除锁文件，也不要在不清楚用途时终止其他贡献者的进程。

## 8. 开发与验证流程

一个普通功能修改建议按以下顺序进行：

1. 启动所需开发服务并复现问题；
2. 修改最小相关模块；
3. 运行模块自己的测试或构建；
4. 在浏览器中验证正常、空数据、错误和无权限状态；
5. 更新测试、文档和配置示例；
6. 执行完整仓库验证。

快速反馈命令：

```bash
rush format-check
rush lint
rush typecheck
rush build --to @box/player-admin
```

Node 服务或运行时修改可执行：

```bash
cd apps/local-engine && rushx test
cd services/game-server && rushx test
```

提交前必须回到仓库根目录执行：

```bash
rush verify
```

`rush verify` 会执行格式检查、Lint、类型检查、Node 回归、发行边界检查、文档检查和 Rust 测试。涉及 Compose、Dockerfile、安装器、数据库 schema、权限、地图组、地图 ID、`.boxproject`/`.boxplay`、脚本 API 或管理器时，局部测试不能代替完整验证。

## 9. 构建镜像并验证部署

构建完整 Linux 镜像归档：

```bash
rush package-images --architecture arm64
# 或 amd64
rush package-images --architecture amd64
```

只重建一个服务用于快速验证：

```bash
rush package-images --architecture arm64 --service player-service
```

完整归档输出到：

```text
apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-<architecture>.tar.gz
```

镜像构建成功不代表部署流程完整。至少还要验证：

1. 镜像能导入并由启动器或 Compose 启动；
2. 健康检查通过，页面和 API 可访问；
3. 登录、权限、地图导入、Creator、Play 和 VOXA 的相关改动可用；
4. 容器重启后 PostgreSQL、地图、模型和配置仍存在；
5. 升级不会覆盖 `.env`、许可证或业务数据；
6. 日志中没有密钥、Cookie、数据库密码和用户隐私。

已有当前版本、架构和全部镜像时，可只导出归档：

```bash
rush export-images
```

## 10. 构建桌面版和服务器版

桌面包必须在目标操作系统上构建。例如 Apple Silicon macOS：

```bash
rush package-desktop --target macos-arm64
```

支持 `windows-amd64`、`windows-arm64`、`macos-amd64`、`macos-arm64`、`linux-amd64` 和 `linux-arm64`。当前公开流水线不构建 Intel macOS 包。

已有镜像归档时可以避免重复构建：

```bash
rush package-desktop --target macos-arm64 \
  --archive apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-arm64.tar.gz
```

构建无桌面 Linux 服务器包：

```bash
rush package-web --architecture arm64
```

桌面包输出在 `apps/local-engine/dist/desktop-installers/`，服务器包输出在 `apps/local-engine/dist/server-packages/`。版本发布、签名、公证、OSS/CDN 和 Tag 流水线规则见[构建、分发与 CI](./release-and-distribution.md)。普通功能 PR 不应提交本地生成的镜像、压缩包、`.next*`、`dist/` 或 Rust `target/`。

## 11. 提交代码

提交前先整理并检查改动：

```bash
git status --short
git diff --check
git diff
rush verify
```

只暂存属于当前工作的文件：

```bash
git add <files>
git diff --cached
git commit -m "feat: describe the change"
git push -u origin codex/<short-description>
```

不要用 `git add .` 顺带提交本机 `.env`、日志、数据库、地图、模型、构建缓存或其他人的改动。一个提交应形成可验证的完整修改：代码、测试、配置和文档应一起更新。

创建 Pull Request 时至少写明：

1. 原问题与目标；
2. 修改了哪些模块；
3. 数据、协议、权限和兼容性是否变化；
4. 执行过的命令及结果；
5. UI 修改前后截图或录屏；
6. 镜像或发行改动的目标平台与架构；
7. 已知风险、迁移方式和回滚方式。

评审修改后，在自己的分支同步主分支并重新验证：

```bash
git fetch upstream
git rebase upstream/main
rush install
rush verify
git push --force-with-lease
```

只有在已 rebase 且确实需要更新远端分支时使用 `--force-with-lease`，不要使用无保护的 `--force`。

## 12. 常见问题

### 依赖或锁文件不一致

如果只拉取了其他人的依赖变化，运行 `rush install`。如果是自己修改了 `package.json` 或 `rush.json`，运行 `rush update` 并提交 `common/config/rush/pnpm-lock.yaml`。不要绕过 Rush 直接安装依赖。

### 端口已占用

检查 3121、3123、3124、3125、3127、8000、9966、9967 和 9971。使用 `--infra` 时还要检查 5432 和 6379。先确认端口属于哪个进程，不要直接终止未知服务。

### 页面更新但运行时行为未更新

浏览器页面通常热更新，Local Engine、Game Server 和公共包构建产物不一定会被现有子进程重新加载。停止开发栈，确认旧进程退出后重新执行 `rush dev`。

### 数据库连接失败

核对 `.env` 的 `BOX_DATABASE_URL`、数据库是否存在、用户权限和端口。`rush dev` 会使用 `.env` 中已有的连接；`rush dev --infra` 会启动开发 PostgreSQL，并强制源码进程使用对应的本机连接，避免桌面部署的 Compose 主机名或旧账号覆盖开发配置。使用 `--infra` 时确认 Docker 正常运行且 5432 未被其他 PostgreSQL 占用。

停止源码服务不会删除开发数据库。只停止基础设施可执行：

```bash
docker compose --profile infra stop postgres redis
```

除非明确要清空测试数据，否则不要添加 `-v`，也不要执行 `docker compose down -v`。

### Rush 提示已有任务运行

仓库可能正在安装、验证或打包。检查现有终端和进程，等待任务结束。不要删除 Rush 锁来强行并发运行。

### 格式检查失败

```bash
rush format
rush format-check
```

检查格式化后的 diff，确保没有改动与当前任务无关的文件。

### Docker 中仍是旧代码

源码开发服务和 Docker 镜像互不自动同步。修改源码后需要重新构建对应镜像，并重新创建使用该镜像的容器；只刷新浏览器或重启旧容器不会更新镜像内容。

## 13. 安全与数据边界

- 禁止提交真实密钥、许可证私钥、数据库 URL、Cookie、Token、用户数据、地图工程、模型库、备份、Docker 卷和日志；
- 禁止将 Docker Socket、PostgreSQL、Redis 或管理端直接暴露到不受信任公网；
- 禁止用删除卷、清空数据库或删除地图目录作为普通排障方法；
- 高风险删除、封禁、Token 撤销和容器操作必须保留服务端授权、二次确认和审计；
- 客户端脚本可被玩家查看和修改，不能存放秘密或执行权威判定；
- 发布和升级测试必须验证核心数据可保留，并准备可执行的回滚方式。

更短的贡献清单见根目录[贡献者指南](../CONTRIBUTING.md)。系统行为或命令变化后，应在同一提交同步 README、相关专题文档、环境模板和测试。
