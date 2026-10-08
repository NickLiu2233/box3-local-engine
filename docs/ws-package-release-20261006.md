# WebSocket 新版镜像与启动器打包验证

> 历史技术/验收记录：结论只对应文中日期、源码和测试环境，不表示当前版本全量验收通过。当前状态见[版本说明](./current-status.md)。本机原始报告与候选包不随源码分发。

日期：2026-10-06。目标：macOS ARM64 启动器，内置 Linux ARM64 六服务离线镜像。

## 交付产物

- 启动器离线包：`BOX-Local-Engine-0.3.0-ws-rc-20261006-macos-arm64.zip`，约 589 MiB；位置 `apps/local-engine/dist/release-candidates/ws-20261006/`。
- 单独镜像归档：`box-local-engine-images-v0.3.0-linux-arm64.tar.gz`，约 585 MiB；旧归档已另存于 `apps/local-engine/dist/release-candidates/ws-20261006/`。
- 完整构建与验证证据：候选目录中的 `BUILD-EVIDENCE.json`。
- 校验值：候选目录中的 `SHA256SUMS`；第二项旧镜像归档现位于同一候选目录。

ZIP SHA-256：`b16d61e2aeba2a4d8a129ade6b9eac1319f4a1e874f7273230069d03f2e801e9`。

镜像归档 SHA-256：`0f95a0e6b3abbaddf6b9032fdd01fba5e6961f8979b72776b4183710bdfd6bfc`。

## 包内内容

六个服务均已重新构建：Player Service、登录门户、Web 管理器、Creator、Play、VOXA。统一标签 `v0.3.0-linux-arm64`，架构均为 ARM64，版本、源码提交基点与构建标记一致。构建开始至六镜像完成，工作区源码内容指纹未改变。

基点提交：`0c8a2b1613c2fc435985c76fca80ef9339a06c9b`。包含未提交改动，标记为 `local-dirty`；这不是声称该 Git 提交已包含全部 WS 改动。

源码内容指纹：`9489f80a200a17ba88d898327fe5baf7f5fbf504a4b53bb20cd1bd54e27a3aa8`。

管理器使用本机已缓存的 `rust:1.93.0-bookworm` ARM64 工具链，复用环境后重新编译源码。六服务均使用仓库原有 Dockerfile；没有用旧管理器二进制替代编译。

启动器重新构建为 `Mach-O 64-bit executable arm64`，APP 内包含全部六镜像归档。此前 anticheat-20261006 候选目录保留，当前运行中的业务容器未被替换。

## 实际验证

| 验证 | 结果 |
| --- | --- |
| 六镜像构建与导出 | 通过，构建/导出退出码 0 |
| 六镜像版本、架构、源码基点、构建标签 | 通过 |
| 镜像归档与 APP 中 IMAGE-INFO 的配置摘要、文件系统层、标签一致性 | 通过；Docker 的 OCI manifest ID 与配置 ID 分别记录，不混为同一种摘要 |
| Creator、Play、Player Service 的实时 bootstrap 路由与 WS 依赖加载 | 从最终镜像内检查通过 |
| Creator、Play 的新撤销同步宿主代码 | 存在新的 realtime bootstrap，无旧撤销轮询 URL |
| 生产宿主测试脚本清理 | Creator、Play 中 game-server/scripts 不存在 |
| Web 管理器实际启动与健康检查 | 独立临时工作区通过；未连接真实地图或数据库 |
| 管理器 WS 认证 | 正确令牌收到 ready；错误令牌关闭码 1008 |
| 启动器构建 | Tauri release 编译及 APP 打包通过 |
| 标准桌面离线包验证 | 通过 |
| 新 ZIP 解压后重新验证 | 通过，确认内置 6 镜像 |
| macOS 签名完整性 | 通过，签名类型 ad-hoc，TeamIdentifier 未设置 |
| 打包自动化测试 | 8 项通过 |
| Player Service 裁剪回归 | 2 项通过；新增实时 API 保留在文件和路由清单中 |
| 本地引擎回归 | 15 组通过 |

打包前的 WS、权限、重连、数据库提交通知与反作弊回归详见 [WebSocket 设计与测试记录](ws-polling-audit.md)。临时镜像检查脚本、容器及解压目录已删除；仓库中的自动化回归保留。

## 已知验证限制

整仓静态检查 `scripts/check-standalone.js` 有一条既有规则未通过：它要求上传接口在 index.ts 内联调用 `runtimeApi().postBlockRaw`，当前实现已委托给 `uploadLocalResource` helper。检查脚本及对应业务代码均与当前 HEAD 相同，此项不是本次 WS 改动引入，也没有将它记为通过。本次打包补充了最终镜像内容、原生程序和解压 ZIP 验证。

本包是未提交源码生成的本地候选，macOS 仅有 ad-hoc 签名，尚未完成 Developer ID 签名与 Apple 公证。未执行公开发布，也未替换现有服务。正式地图的多人、延迟与长时间断线容量验收仍不能用这些构建检查代替。

后续精简更新日志和 HTTPS/WSS 补齐后的重新打包产物，见 [v0.3.0 新包交付记录](v030-release-package-20261006.md)。本记录的旧候选 ZIP、旧归档和校验值均保留。
