# BOX3 Local Engine 文档中心

整理日期：2026-10-08。当前源码 `0.3.0`，先通过邀请参与开发；不是声明安装包或 CDN 已同步。

## 推荐阅读顺序

- 第一次拿到源码：[邀请与访问](./source-access.md) → [贡献指南](../CONTRIBUTING.md) → [开发手册](./developer-guide.md)。
- 部署试用包：[桌面启动器](./graphical-deployment-manager.md)或 [Linux 管理端](./linux-web-manager.md) → [配置](./configuration-reference.md) → [备份边界](./local-infrastructure.md)。
- 创作与运营：[地图与发布包](./projects.md) → [玩家管理](./player-identity.md) → [地图授权](./script-moderation.md)与[反作弊规则](./anticheat-toolkit.md)。
- 修改和再分发：[MIT 与品牌边界](./open-source-licensing.md) → [发布检查](./public-repository-audit.md) → [构建与分发](./release-and-distribution.md)。

## 当前发行与安全边界

Player Admin 源码开发时独立运行，发行时并入 Player Service。完整离线包有六个官方镜像，不含内部迁移器或签发器。
程序不要求激活，但登录、管理权限、地图脚本授权、资源完整性校验仍然存在。客户端不保存秘密，DTS 不是安全沙箱。
邀请制控制官方仓库访问，不收回已经按 MIT 交付的代码使用权。运行数据和源码不混存，文件备份不替代 PostgreSQL 备份。

## 文档目录

当前指南优先用于操作；带日期的验收、技术记录和规划保留上下文，不作为当前版本通过证明。

### 开始、访问与许可

- [邀请制源码访问与协作](./source-access.md)
- [当前版本与文档范围](./current-status.md)
- [开源许可说明](./open-source-licensing.md)
- [公开仓库检查记录](./public-repository-audit.md)

### 部署、配置与数据

- [安装与运维](./installation-and-operations.md)
- [图形化部署管理器](./graphical-deployment-manager.md)
- [从纯 Linux 系统部署 BOX3 Engine](./linux-web-manager.md)
- [BOX3 Engine 云服务器快速部署](./cloud-server-quickstart.md)
- [配置参考](./configuration-reference.md)
- [部署与联机](./deployment.md)
- [创作端部署](./creator-deployment.md)
- [游玩端部署](./play-deployment.md)
- [VOXA 本地模型编辑器](./voxa-deployment.md)
- [地图、地图组与发布包](./projects.md)
- [本地基础设施](./local-infrastructure.md)
- [PostgreSQL 数据空间](./postgresql-data-storage.md)
- [HTTP 访问兼容](./http-compatibility.md)
- [玩家启动器 Service Worker 资源缓存](./launcher-service-worker-cache.md)

### 账号、管理与地图脚本

- [玩家身份与后台管理](./player-identity.md)
- [后台管理开发说明](./player-admin-development.md)
- [后台管理复用索引](./player-admin-code.md)
- [Player Service API](./player-service-api.md)
- [从零做一个自己的 BOX3 登录门户](./self-hosted-login.md)
- [地图授权与脚本处罚 API](./script-moderation.md)
- [地图反作弊监听](./script-anticheat.md)
- [给地图写自己的反作弊规则](./anticheat-toolkit.md)
- [地图反作弊示例](./examples/README.md)
- [可配置的移动与攻击校验](./examples/anticheat-policy.md)

### 开发、架构与接口

- [开发者与协作手册](./developer-guide.md)
- [系统架构](./architecture.md)
- [BOX Local Engine](./domain-model.md)
- [Local Engine API 与 Swagger](./local-engine-api.md)
- [Creator CLI 与 HTTP API（当前实现）](./creator-cli-http-api.md)
- [工程规范](./engineering.md)
- [与 boxes 的核心对齐基线](./boxes-parity.md)
- [构建与分发](./release-and-distribution.md)
- [安全边界](./security-audit.md)
- [内部工具接入](./internal-tools.md)
- [Use an immutable permanent map ID for storage identity](./adr/0001-stable-map-storage-identity.md)

### 技术记录与历史验收

- [本地引擎反作弊发行说明](./anticheat-release.md)
- [反作弊验证记录](./anticheat-test-report.md)
- [本地引擎反作弊 API 详细设计书](./anticheat-api-design.md)
- [本地引擎 WebSocket 改造设计与测试记录](./ws-polling-audit.md)
- [WebSocket 新版镜像与启动器打包验证](./ws-package-release-20261006.md)
- [v0.3.0 更新日志与新版离线包交付记录](./v030-release-package-20261006.md)
- [工程整理：第一轮](./engineering-refactor.md)
- [图形化与 Web 启动器统一记录](./launcher-parity-audit.md)

### 设计、规划与方案参考

- [ArenaPro CLI 接入 BOX Creator（历史设计背景）](./arenapro-cli-creator-adapter.md)
- [BOX3玩家启动器](./launcher-local-map-packs-design.md)
- [引擎核心性能评估与优化计划书](./engine-performance-optimization-plan.md)
- [BOX3 Engine 私服方案对比](./business-comparison.md)

## 维护规则

服务、端口、配置、接口、权限、数据目录和发行入口变化时，同一提交更新对应指南与示例。历史记录不改写为新测试结果；原始数据不应带玩家身份或本机路径进入源码。命令和版本以脚本与清单为准。
