# 开发入门

本文面向要修改源码的开发者。仅安装、创作或开服，请先看[项目 README](../README.md)中的安装入口。下面的根目录命令统一调度 Rush 工作区；首次安装会下载工具与依赖，首次启动会构建公共包。

## 1. 准备环境

| 工具    | 要求                                | 使用场景                            |
| ------- | ----------------------------------- | ----------------------------------- |
| Git     | 可正常克隆与切换分支                | 获取源码、同步和提交                |
| Node.js | `22.17.x`，与 `.node-version` 一致  | 仓库脚本与 JS/TS 开发               |
| Docker  | Docker Engine/Desktop 与 Compose v2 | `dev:infra`、镜像构建及部署         |
| Rust    | stable 与对应平台原生工具链         | 管理器原生开发、Rust 检查与完整验证 |

macOS 原生构建需要 Xcode Command Line Tools；Windows 需要适用的 C++ 构建工具和 WebView2；Linux 原生管理器需要 Tauri 对应的系统开发库。具体原生依赖与命令见[部署管理器 README](../apps/deployment-manager/README.md)。只修改网页时可以先运行局部检查，但提交前的完整验证仍可能需要 Rust。

```sh
node --version
docker --version
docker compose version
```

确认 Node 版本匹配、Docker 已启动。无需另行安装任意版本的 Rush/pnpm，仓库启动脚本会准备 `rush.json` 锁定的工具版本。

## 2. 安装依赖与配置

获取源码后，在仓库根目录执行：

```sh
npm run install:all
cp .env.docker.example .env
npm run check:workspace
```

`install:all` 按已提交锁文件安装所有 Rush 项目的依赖；`check:workspace` 检查主要项目登记与工作区依赖。Windows PowerShell 使用 `Copy-Item .env.docker.example .env` 复制配置。已有 `.env` 时跳过复制，避免覆盖数据库连接和密钥。

不要在各应用目录独立安装工作区依赖，也不要另建一份根目录锁文件。依赖安装问题先检查 Node 版本、网络和 Rush 日志，而不是删除共享锁文件。

### 选择数据库来源

Player Service 必须使用 PostgreSQL；Redis 可选。地图脚本 storage 的本地回退不代表玩家身份服务可以省略 PostgreSQL。

| 方式                 | 操作                                                   | 注意事项                                                   |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| 使用仓库开发基础服务 | `npm run dev:infra`                                    | 启动 Compose 的 `postgres`、`redis`，数据库端口仅绑定本机  |
| 使用已有数据库       | 在 `.env` 填写 `BOX_DATABASE_URL` 后运行 `npm run dev` | 数据库必须可由宿主机进程访问，账号应具有所需 schema 的权限 |

已有 PostgreSQL 的配置示例：

```dotenv
# 替换为自己的开发库与凭据，不使用生产数据库。
BOX_DATABASE_URL=postgresql://<user>:<password>@127.0.0.1:5432/<database>
BOX_DATABASE_SCHEMA=box_engine
BOX_IDENTITY_DATABASE_SCHEMA=box_identity
```

连接串中的特殊字符需要 URL 编码。源码开发进程运行在宿主机，不能直接使用仅在 Docker 网络中解析的 `postgres` 主机名。`dev:infra` 会根据 `BOX_POSTGRES_*` 设置生成本机连接串；没有指定开发密码时采用开发默认值，不用于正式部署。已有持久卷的数据库密码不会因为修改 `.env` 自动改变。

### 理解开发配置

开发脚本读取根目录 `.env`，统一为服务设置本地配置路径、访问地址与内部身份密钥。没有配置密钥时会生成进程间共用的开发密钥；重新启动可能更换这些值，因此旧会话可能需要重新登录。

默认源码栈固定使用本机开发端口，不能仅通过修改 Compose 的 `BOX_*_PORT` 就改变整套源码栈。`.env.docker.example` 同时包含部署选项，完整字段说明以模板注释为准。Redis 配置留空时业务使用内存/本地回退；启动 Redis 容器不等于业务已经连接 Redis，连接时还需配置 `REDIS_HOST` 等字段。

## 3. 启动并确认服务

```sh
npm run dev:infra
```

脚本先按依赖关系构建公共项目，然后启动基础服务与源码栈。日志以服务名称区分；首次编译页面与地图运行时可能耗时，等待对应服务就绪后再访问。

| 入口           | 默认地址               | 用途                     |
| -------------- | ---------------------- | ------------------------ |
| 登录门户       | http://127.0.0.1:3125/ | 创建测试账号、登录与注册 |
| Creator        | http://127.0.0.1:3127/ | 编辑、预览与发布作品     |
| Play           | http://127.0.0.1:3121/ | 游玩已导入的发布地图     |
| VOXA           | http://127.0.0.1:3123/ | 模型、皮肤和动画编辑     |
| Player Service | http://127.0.0.1:3124/ | 玩家身份与管理接口       |
| 玩家后台       | http://127.0.0.1:8000/ | 玩家与游玩地图管理       |

先确认 Player Service 没有数据库错误，再通过登录门户创建测试账号，随后进入 Creator。管理功能需要相应权限，不能把普通注册账号当作管理员；权限问题应检查服务端授权与模块说明。Play 的地图来自导入的 `.boxplay`，没有导入作品时不会自动展示 Creator 的全部工程。

源码开发数据通常保存在 `apps/local-engine/projects/`、`play-worlds/`、`data/` 和 `backups/`；身份数据在 PostgreSQL 中。桌面管理器使用自己的系统应用数据目录，与源码目录独立。更详细的数据格式见[本地引擎 README](../apps/local-engine/README.md)。

### 缩小启动范围

| 命令                          | 启动内容                          | 前提                         |
| ----------------------------- | --------------------------------- | ---------------------------- |
| `npm run dev`                 | 完整源码栈，不启动基础容器        | 已有可用 PostgreSQL          |
| `npm run dev:creator:infra`   | 创作栈及基础容器，不启动独立 Play | Docker 可用                  |
| `npm run dev -- --no-admin`   | 完整源码栈，跳过玩家后台前端      | 已有可用 PostgreSQL          |
| `npm run dev:admin`           | 玩家后台前端及依赖准备            | 另有运行中的 Player Service  |
| `npm run dev:manager`         | 部署管理器网页开发界面            | 原生容器操作仍需 Tauri 环境  |
| `npm run dev:manager:native`  | 部署管理器 Tauri 原生开发         | Rust、平台工具链与 Docker    |
| `npm run dev:player-launcher` | 玩家启动器 Electron 开发模式      | 有可连接的服务器用于业务调试 |

额外参数放在 `--` 后。不要同时运行完整栈与占用同一端口的单界面命令；开发栈默认已包含玩家后台。

### 停止服务

在启动源码栈的终端按 Ctrl+C，脚本会结束其子服务。`dev:infra` 启动的数据库容器会继续运行，需要时单独停止：

```sh
docker compose --profile infra stop postgres redis
```

停止容器保留数据；不要使用删除卷的方式处理一般启动故障。也不要停止同一机器上与本项目无关的服务。

## 4. 修改、构建与验证

| 任务                     | 根目录命令                                            | 说明                                           |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------- |
| 根据清单更新依赖与锁文件 | `npm run update:all`                                  | 修改依赖后执行，检查并提交锁文件差异           |
| 构建指定项目及依赖       | `npm run build -- --to @box/player-admin`             | 使用 Rush 项目名，而非目录名                   |
| 格式化 / 检查            | `npm run format` / `npm run format:check`             | 写入格式化会影响仓库范围，执行后检查差异       |
| Lint / 类型 / 测试       | `npm run lint` / `npm run typecheck` / `npm run test` | 分阶段定位问题                                 |
| 集成与分发检查           | `npm run check`                                       | 仓库级检查入口，不等同于启动完整业务栈         |
| 完整验证                 | `npm run verify`                                      | 依次检查格式、Lint、类型与测试，测试含工程检查 |
| API 文档                 | `npm run api:docs`                                    | 文档服务器地址以启动日志为准                   |
| 更新 / 检查 API 契约     | `npm run api:generate` / `npm run api:check`          | 修改契约后生成，并检查产物同步                 |
| 文档链接                 | `node scripts/check-documentation.js`                 | 检查本地文档链接与基础入口                     |

单模块检查使用对应 `package.json` 的脚本。例如 `npm --prefix apps/player-launcher run check` 检查玩家启动器；局部成功不等于完整验证或目标平台安装验证通过。公共包与权威运行时修改后可能需要重新构建并重启，不能假设所有修改都热更新。

新增项目登记到 `rush.json`，修改依赖后执行 `npm run update:all`，提交相关清单与 `common/config/rush/pnpm-lock.yaml`。HTTP 契约由 `@box/apis` 维护；不要手工修改生成客户端来绕过契约更新。

## 5. 定位代码与排障

界面优先从 `apps/` 找起；工程存储与启动适配位于 `apps/local-engine/src/`；权威运行时位于 `services/game-server/`。共享权限、实时连接与部署路径分别由 `@box/player-policy`、`@box/realtime-client`、`@box/deployment-routing` 提供。可复用能力通过公共包入口共享，不跨应用直接导入源码。

| 现象                     | 优先检查                                    | 处理方向                                    |
| ------------------------ | ------------------------------------------- | ------------------------------------------- |
| 找不到 Docker 或连接失败 | Docker 是否已启动、Compose v2 是否可用      | 启动 Docker；已有数据库时改用 `npm run dev` |
| 数据库连接拒绝或认证失败 | Player Service 日志、地址、端口、密码与旧卷 | 修正连接或数据库账号；不要删除卷            |
| 端口占用                 | 启动日志中的端口与进程                      | 停止自己启动的旧开发进程，避免重复启动      |
| 登录或后台请求失败       | Player Service、登录门户、浏览器请求响应    | 先解决后端/数据库错误，再检查账号权限与会话 |
| 修改公共包后行为未变     | 对应包是否重新构建、运行时是否重启          | 构建受影响依赖并重启开发栈                  |
| 容器或安装包仍是旧实现   | 实际镜像/安装包来源与版本                   | 重新构建部署；staging 同版本可能复用旧镜像  |
| Rush 提示已有任务占用    | 其他终端是否有安装、更新或构建任务          | 等待任务结束，不删除锁文件                  |

报告故障时附上操作系统与架构、Node/Docker 版本、执行命令、相关服务的首个错误，以及预期与实际结果。隐藏 Cookie、Token、数据库密码和用户数据。提交要求见[贡献指南](../CONTRIBUTING.md)，测试与正式构建规则见[Release & Version](./release-and-version.md)。
