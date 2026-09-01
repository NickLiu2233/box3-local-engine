# 开发者手册

## 环境与启动

使用 Node.js `22.17.0`、pnpm `10.12.1` 和 Docker Compose v2：

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.docker.example .env
pnpm verify
```

常用入口：`pnpm dev`（Creator 开发）、`pnpm creator`、`pnpm play`、`pnpm voxa`、`pnpm player-service`。桌面启动器位于 `apps/deployment-manager/`。

## 代码边界

| 需求                  | 位置                                               |
| --------------------- | -------------------------------------------------- |
| Creator / Play 页面   | `apps/game/`                                       |
| 项目、发布包、运行时  | `apps/local-engine/src/`                           |
| 权威游戏与脚本运行时  | `services/game-server/src/`                        |
| 模型编辑              | `apps/voxa/`                                       |
| 启动器与 Linux 管理端 | `apps/deployment-manager/`、`apps/server-manager/` |

Creator 读取可编辑工程，Play 只读取发布快照。不要跨越这条边界，也不要把密钥、数据库凭据或权威规则放进客户端脚本。

## 提交前

```bash
pnpm verify
```

修改兼容接口、发布包、永久地图 ID、脚本 API 或运行时协议时，先阅读[系统架构](./architecture.md)和[对齐基线](./boxes-parity.md)，并补充回归测试。

## 协作规则

开始修改前检查工作区已有改动；不要覆盖其他协作者的数据或生成物。代码改动至少运行相关 lint/测试，跨服务、镜像或发行变更运行 `pnpm verify`。文档、配置样例和发布脚本应随行为变化同步更新。
