# 公网路由工程说明

更新日期：2026-10-09。

公网访问配置有一个前端输入模块和一个 Rust 核心模块。前端负责表单状态、证书选择和预览；`apps/manager-core/src/public_access.rs` 负责把草稿解析为显式服务端点、保存双模式草稿和生成运行时视图。Nginx 配置在 `apps/manager-core/src/ssl/` 内按职责组织：

- `plan.rs`：读取已保存或待应用路由，生成 Compose 端口投影、上游过渡和路径能力检查。
- `apply.rs`：校验输入、创建配置修订、应用路由并协调失败恢复。
- `proxy.rs`：生成内置 Nginx 容器参数与监听端口集合；外部上游端口由 `apply.rs` 分配。
- `certificates.rs`：读取已保存证书、删除服务或共用证书，并清理无效路由。
- `runtime.rs`：保存状态、调用 Docker/OpenSSL、生成运行时 URL 和提供旧命令兼容入口。

`https/provider` 是来源选择的唯一持久状态：`managed` 表示内置 Nginx，`external` 表示本机外部 Nginx。缺少记录和旧 `disabled` 值都按 managed 展示；只有明确保存的 external 才按 external 展示。状态页和草稿路由共用同一个 provider 解析函数，避免 UI 与 Compose 端口投影分叉。

地址草稿与应用地址分开保存。`*_INDEPENDENT_PUBLIC_ADDRESS`、`BOX_SHARED_PUBLIC_ADDRESS` 和 `*_PUBLIC_PATH` 保留用户输入；`*_PUBLIC_ADDRESS_OVERRIDE` 是当前模式的完整地址。裸地址由证书状态推导协议，显式协议和端口优先。服务端和前端都执行路径字符、长度和保留段校验。

内置模式让 Nginx 接管公网监听端口，并移除相关上游容器的公网映射；外部本机模式为 Nginx 接入分配 loopback 上游端口，保留服务端口作为内部端口。服务切换只作用于当前项目已经运行的目标服务，失败时使用运行快照恢复。

## 验证入口

```sh
node --test scripts/deployment-manager-ui.test.js scripts/deployment-manager-transport.test.js
cargo test --manifest-path apps/manager-core/Cargo.toml --offline
cargo test --manifest-path apps/deployment-manager/src-tauri/Cargo.toml --offline
cargo test --manifest-path apps/server-manager-rust/Cargo.toml --offline
node scripts/check-deployment-manager-structure.js
node scripts/check-public-routing-structure.js
node scripts/check-documentation.js
```

需要监听本地端口的测试在受限环境中可能得到 `listen EPERM`，应在允许本地监听的环境补跑。Docker/Nginx 真实验收还需要 Docker Desktop、证书和可用端口；它们不由纯 Rust 单元测试替代。

结构检查和界面回归已接入仓库 integration-check 流程。完整仓库验证仍使用 `rush verify`；上述命令用于单独验证公网配置改动，不能代替整个仓库验收。

## 本轮验证记录

2026-10-09：110 项核心测试、52 项界面及通信测试、28 项桌面测试和 33 项 Web 测试通过。额外执行真实 Nginx HTTPS/WSS、证书替换和失败回滚验收通过。界面生产构建、桌面/Web 契约检查、公网 Rust 格式与结构检查、70 份 Markdown 的索引及链接检查通过。

这次整理未运行全仓 `rush verify`，未重新生成镜像或安装包，也不代表实际公网 DNS、防火墙、Windows 界面和多玩家场景已经验收。
