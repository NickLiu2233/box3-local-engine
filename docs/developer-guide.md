# 开发入门

## 环境与安装

使用 Node.js `22.17.x` 与 Docker Compose v2。Rust stable 和平台原生工具链仅在管理器测试、原生构建及完整验证时需要。

```sh
npm run install:all
cp .env.docker.example .env
npm run check:workspace
```

以上命令在仓库根目录执行，配置复制仅在首次初始化时进行。Rush 自动管理 pnpm 和锁文件；已安装匹配版本 Rush 时，也可直接使用 `rush install`。

## 启动

```sh
npm run dev:infra
```

此命令启动源码开发栈和开发基础服务。已有 PostgreSQL 时，配置 `.env` 后使用 `npm run dev`；Redis 可选。源码栈的默认地址见[根 README](../README.md)。

只启动一个界面：

```sh
npm run dev:admin
npm run dev:player-launcher
npm run dev:manager
```

后台需要可用的 Player Service。部署管理器的原生模式使用 `npm run dev:manager:native`。额外参数放在 `--` 后；如 `npm run dev -- --no-admin`。

## 常用命令

| 任务               | 根目录命令                                |
| ------------------ | ----------------------------------------- |
| 更新依赖与锁文件   | `npm run update:all`                      |
| 构建指定项目及依赖 | `npm run build -- --to @box/player-admin` |
| 格式化 / 检查      | `npm run format` / `npm run format:check` |
| 完整验证           | `npm run verify`（等价于 `rush verify`）  |
| 查看 API 文档      | `npm run api:docs`                        |
| 更新 API 契约产物  | `npm run api:generate`                    |
| 检查文档链接       | `node scripts/check-documentation.js`     |

新增项目登记到 `rush.json`，修改依赖后更新并提交 `common/config/rush/pnpm-lock.yaml`。单模块测试使用对应 package.json 的脚本，不绕过 Rush 安装工作区依赖。

## 找到代码

界面位于 `apps/`；工程存储与本地启动适配位于 `apps/local-engine/src/`；权威运行时位于 `services/game-server/`。公共能力优先从 `packages/` 与 `internals/` 复用，不跨应用直接导入源码。

HTTP 契约由 `@box/apis` 维护；共享权限、实时连接、部署路径分别由 `@box/player-policy`、`@box/realtime-client`、`@box/deployment-routing` 提供。

## 基本排障

- 端口占用：检查启动日志，先停止自己启动的旧进程。
- 后台连接失败：检查 Player Service 与 PostgreSQL，不只看前端。
- 公共包或权威运行时修改未生效：重新构建依赖并重启开发栈。
- 容器仍运行旧代码：源码与镜像独立，必须重新构建和部署。
- Rush 提示任务占用：等待当前任务，不删除锁文件。

验证失败必须记录具体原因；局部测试通过不代表全仓或目标平台验收通过。更多提交要求见[贡献指南](../CONTRIBUTING.md)。
