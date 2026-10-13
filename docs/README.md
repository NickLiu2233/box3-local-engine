# BOX3 Local Engine 文档中心

整理日期：2026-10-13。当前源码 `0.3.0`，仓库已公开开源，欢迎 Fork 与 Pull Request；不是声明安装包或 CDN 已同步。

## 推荐阅读顺序

- 第一次参与项目：[公开源码与协作](./source-access.md) → [贡献指南](../CONTRIBUTING.md) → [开发手册](./developer-guide.md)。
- 部署试用包：[桌面启动器](./graphical-deployment-manager.md)或 [Linux 管理端](./linux-web-manager.md) → [配置](./configuration-reference.md) → [备份边界](./local-infrastructure.md)。
- 创作与运营：[地图与发布包](./projects.md) → [玩家管理](./player-identity.md) → [地图授权](./script-moderation.md)与[反作弊规则](./anticheat-toolkit.md)。
- 玩家连接与游玩：[玩家启动器](./player-launcher.md) → [资源缓存](./launcher-service-worker-cache.md) → [HTTP 兼容](./http-compatibility.md)。
- 修改和再分发：[MIT 与品牌边界](./open-source-licensing.md) → [发布检查](./public-repository-audit.md) → [构建与分发](./release-and-distribution.md)。

## 当前发行与安全边界

Player Admin 源码开发时独立运行，发行时并入 Player Service。完整离线包有六个官方镜像，不含内部迁移器或签发器。
程序不要求激活，但登录、管理权限、地图脚本授权、资源完整性校验仍然存在。客户端不保存秘密，DTS 不是安全沙箱。
公开源码与官方发布权限分开管理，贡献者不需要上游写入权限。运行数据和源码不混存，文件备份不替代 PostgreSQL 备份。

## 文档目录

当前指南优先用于操作；带日期的验收、技术记录和规划保留上下文，不作为当前版本通过证明。

### 源码与许可

- [公开源码与协作](./source-access.md)
- [当前版本与文档范围](./current-status.md)
- [开源许可说明](./open-source-licensing.md)
- [公开仓库检查记录](./public-repository-audit.md)

### 部署、配置与数据

- [安装与运维](./installation-and-operations.md)
- [图形化部署管理器](./graphical-deployment-manager.md)
- [启动器打包模式](./launcher-package-modes.md)
- [从纯 Linux 系统部署 BOX3 Engine](./linux-web-manager.md)
- [BOX3 Engine 云服务器快速部署](./cloud-server-quickstart.md)
- [配置参考](./configuration-reference.md)
- [Nginx 与公网证书配置（当前指南）](./https-certificate-management.md)
- [部署与联机](./deployment.md)
- [创作端部署](./creator-deployment.md)
- [游玩端部署](./play-deployment.md)
- [VOXA 本地模型编辑器](./voxa-deployment.md)
- [地图、地图组与发布包](./projects.md)
- [本地基础设施](./local-infrastructure.md)
- [PostgreSQL 数据空间](./postgresql-data-storage.md)
- [HTTP 访问兼容](./http-compatibility.md)
- [玩家启动器 Service Worker 资源缓存](./launcher-service-worker-cache.md)
- [玩家启动器使用与维护](./player-launcher.md)

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
- [Rush 工作区与统一入口](./rush-workspace.md)
- [可复用公共包](./reusable-packages.md)
- [系统架构](./architecture.md)
- [BOX Local Engine](./domain-model.md)
- [Local Engine API 与 Swagger](./local-engine-api.md)
- [Creator CLI 与 HTTP API（当前实现）](./creator-cli-http-api.md)
- [工程规范](./engineering.md)
- [自有代码风格与维护范围](./code-style.md)
- [启动器与玩家应用代码维护](./application-code-maintenance.md)
- [文档维护与有效范围](./documentation-maintenance.md)
- [公网路由工程说明](./public-routing-engineering.md)
- [与 boxes 的核心对齐基线](./boxes-parity.md)
- [构建与分发](./release-and-distribution.md)
- [安全边界](./security-audit.md)
- [内部工具接入](./internal-tools.md)
- [Use an immutable permanent map ID for storage identity](./adr/0001-stable-map-storage-identity.md)

### 技术记录与历史验收

- [访问配置冲突审查](./access-configuration-audit.md)
- [本地引擎反作弊发行说明](./anticheat-release.md)
- [反作弊验证记录](./anticheat-test-report.md)
- [本地引擎反作弊 API 详细设计书](./anticheat-api-design.md)
- [本地引擎 WebSocket 改造设计与测试记录](./ws-polling-audit.md)
- [WebSocket 新版镜像与启动器打包验证](./ws-package-release-20261006.md)
- [v0.3.0 更新日志与新版离线包交付记录](./v030-release-package-20261006.md)
- [工程整理：第一轮](./engineering-refactor.md)
- [图形化与 Web 启动器统一记录](./launcher-parity-audit.md)

#### 2026-10-08 启动器与 Nginx 历史记录

以下记录保留当时的设计和验证结论。共用地址、协议推导、默认 Nginx 来源与端口规则后续已调整，当前操作以 [Nginx 指南](./https-certificate-management.md)为准。

- [启动器启动修复](./launcher-startup-fix-20261008.md)
- [Nginx 接入启动器](./nginx-integrated-launcher-20261008.md)
- [Nginx 简化界面](./nginx-simplified-launcher-20261008.md)
- [外部 Nginx 检测](./nginx-detection-panel-20261008.md)
- [Nginx 延迟保存](./nginx-deferred-save-20261008.md)
- [Nginx 本机保存](./nginx-local-save-20261008.md)
- [独立配置阶段](./nginx-individual-configuration-20261008.md)
- [共用端口修复阶段](./nginx-shared-ports-fix-20261008.md)
- [统一 443 阶段](./nginx-443-domains-20261008.md)
- [SSL 折叠间距](./nginx-ssl-collapsed-spacing-20261008.md)
- [SSL 显示与校验](./nginx-ssl-visible-validation-20261008.md)
- [SSL 测试包](./ssl-launcher-package-20261008.md)
- [SSL 维护与 Redis 所有权](./ssl-maintenance-redis-owner-20261008.md)
- [SSL 标题状态](./ssl-title-status-20261008.md)

### 设计、规划与方案参考

- [ArenaPro CLI 接入 BOX Creator（历史设计背景）](./arenapro-cli-creator-adapter.md)
- [BOX3玩家启动器](./launcher-local-map-packs-design.md)
- [引擎核心性能评估与优化计划书](./engine-performance-optimization-plan.md)
- [BOX3 Engine 私服方案对比](./business-comparison.md)

## 维护规则

主题职责、文档类型和检查清单见[文档维护](./documentation-maintenance.md)。

服务、端口、配置、接口、权限、数据目录和发行入口变化时，同一提交更新对应指南与示例。历史记录不改写为新测试结果；原始数据不应带玩家身份或本机路径进入源码。命令和版本以脚本与清单为准。
