# Rust Web 部署管理器

这个 Axum/Tokio 服务为 Linux 无桌面部署提供管理 HTTP API、静态管理界面与事件连接。它是[部署管理界面](../deployment-manager/README.md)的 Web 后端，通过 Docker Compose 控制应用，并管理受控地图子运行时。服务控制、配置与备份规则复用 [manager-core](../manager-core/README.md)。

普通开服优先使用 [Linux 服务器发行包](../../distribution/server/README.md)。本服务可访问 Docker Socket，管理入口需要服主身份和受保护的访问范围；它不是玩家游玩页面。

## 代码入口

| 目录/文件           | 职责                                         |
| ------------------- | -------------------------------------------- |
| `src/main.rs`       | 启动配置、共享依赖与路由接线                 |
| `src/http/`         | 命令传输、静态页面、归档上传下载和 WebSocket |
| `src/platform/`     | 配置文件、备份、监控与安全数据适配           |
| `src/runtime/`      | 镜像目录、运行时创建/回收、运行配置          |
| `src/operations.rs` | 长操作状态和进度                             |
| `src/tests.rs`      | Web 适配与行为回归                           |

## 配置与启动边界

| 环境变量                                              | 用途 / 默认                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `BOX_SERVER_MANAGER_ROOT`                             | 部署根目录；默认 `/workspace`                                       |
| `BOX_SERVER_MANAGER_COMPOSE_FILE`                     | Compose 文件；默认根目录 `compose.yml`，源码根 Compose 需要显式指定 |
| `BOX_SERVER_MANAGER_ENV_FILE`                         | 部署配置文件；默认根目录 `.env`                                     |
| `BOX_SERVER_MANAGER_PUBLIC_DIR`                       | 预构建静态管理界面；默认 `/app/public`                              |
| `BOX_SERVER_MANAGER_HOST` / `BOX_SERVER_MANAGER_PORT` | 原生服务监听；默认 `0.0.0.0:3130`                                   |
| `BOX_SERVER_MANAGER_TOKEN`                            | Web 管理登录令牌；启动时检查强度                                    |
| `BOX_RUNTIME_MANAGER_TOKEN`                           | 内部运行时管理密钥；独立于登录令牌                                  |

Compose 的宿主机绑定地址由 `BOX_SERVER_MANAGER_BIND_IP` 控制，与原生进程的 `HOST` 不同。令牌留空或太短会导致启动失败；安装器负责准备部署文件与随机密钥，直接 `cargo run` 不会自动生成完整安装包或业务镜像。运行时需要 Docker CLI、Compose 插件、可访问的 Socket 和管理界面构建产物。

## 开发检查

安装 Rust stable 和宿主平台编译工具。无桌面服务不依赖 Tauri/WebKitGTK；发行镜像工具链见 `apps/server-manager/Dockerfile`。从仓库根执行：

```sh
cargo check --manifest-path apps/server-manager-rust/Cargo.toml
cargo test --manifest-path apps/server-manager-rust/Cargo.toml
node scripts/check-headless-rust-manager.js
```

根验证包含这些编译/测试或接线检查，不会自动启动完整 Docker 业务栈。修改命令、Token 校验、镜像或备份逻辑后，额外在独立数据目录验收安装、登录、服务启动/停止、进度、断线和恢复，见[测试指南](../../docs/testing.md)。不要把部署 `.env`、管理令牌或诊断归档提交仓库。
