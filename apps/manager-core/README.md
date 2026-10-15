# 管理器共享核心

`box-manager-core` 是 Rust 库，为 Tauri 桌面部署管理器和 Rust Web 管理器共享部署规则。它不是可单独启动的应用；HTTP、Tauri、窗口、Docker 进程和平台路径的适配留在调用方。

## 主要模块

| 模块                                                      | 职责                                               |
| --------------------------------------------------------- | -------------------------------------------------- |
| `configuration`、`configuration_migration`、`environment` | 配置校验、迁移、`.env` 解析与运行环境推导          |
| `services`                                                | 服务目录、启用条件、启动/控制/停止规则与运行时接口 |
| `backup`、`backup_store`                                  | 归档创建、校验、导入、列表与恢复规则               |
| `map_runtime_profiles`                                    | 地图运行时配置校验与资源设置                       |
| `auth_portal`、`ssl`、`access_settings`                   | 门户镜像、证书和公开访问配置的共享处理             |
| `operation`                                               | 管理修改操作的并发保护                             |

先读 `src/lib.rs` 确认公开模块，再从具体入口与其测试查看使用约束。添加共享行为时同时检查桌面和 Web 调用点，避免只修改一端的规则。

## 备份范围

归档覆盖 `apps/local-engine/projects`、`apps/local-engine/dist`、`apps/local-engine/play-worlds` 和 `apps/voxa/data`，可带根 `.env`。默认恢复保留当前 `.env`，显式选择时才替换归档内配置。归档允许的条目、大小、路径和回滚行为由 `backup` 校验；不要绕过校验直接解压上传文件。

它不导出外部 PostgreSQL/Redis 数据库，也不把整个仓库或 Docker 卷打进作品备份。归档可能含密钥和用户作品，必须私密保存。恢复时调用方需在验证后停止实际写入者，共享锁不能阻止任意外部进程写数据。

## 验证

在仓库根使用 Rust stable 执行：

```sh
cargo test --manifest-path apps/manager-core/Cargo.toml
cargo check --manifest-path apps/server-manager-rust/Cargo.toml
node scripts/check-desktop-deployment-manager.js
node scripts/check-headless-rust-manager.js
```

这些检查由按需执行的 `npm run test` / `npm run check` 调度，不属于基础 `npm run verify`。它们覆盖共享行为与两端接线，仍需实际备份/恢复和目标平台验收；Tauri 编译依赖见[部署管理器](../deployment-manager/README.md)，覆盖边界见[测试指南](../../docs/testing.md)。
