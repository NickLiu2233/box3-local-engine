# BOX3 Local Engine 文档中心

根目录 [README](../README.md) 说明当前 `0.2.0` 产品范围、支持平台和最短启动方式。本目录按实际任务拆分专题；部署者不需要从头读完，也不要同时照着多份部署文档执行。

## 推荐阅读顺序

| 目标                         | 主文档                                                                 | 必要补充                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 桌面启动器首次部署           | [图形化部署管理器](./graphical-deployment-manager.md)                  | [配置参考](./configuration-reference.md)                                                                                                 |
| 无图形 Linux 服务器          | [Linux Web 管理端](./linux-web-manager.md)                             | [安装、部署与运维](./installation-and-operations.md)、[游玩端部署](./play-deployment.md)                                                 |
| 云服务器快速安装             | [云服务器快速部署](./cloud-server-quickstart.md)                       | [Linux Web 管理端](./linux-web-manager.md)、[部署与联机](./deployment.md)                                                                |
| 创建和发布地图               | [地图作品、地图组与发布包](./projects.md)                              | [创作端部署](./creator-deployment.md)                                                                                                    |
| 部署 Play 或公开服务器       | [游玩端部署](./play-deployment.md)                                     | [部署与联机](./deployment.md)                                                                                                            |
| 设计启动器本地地图包         | [启动器本地地图包与严格资源门禁](./launcher-local-map-packs-design.md) | [游玩端部署](./play-deployment.md)、[地图作品、地图组与发布包](./projects.md)                                                            |
| 部署 VOXA                    | [VOXA 部署](./voxa-deployment.md)                                      | [地图作品与资源边界](./projects.md)                                                                                                      |
| 接入登录、玩家账号或后台管理 | [玩家身份与后台管理](./player-identity.md)                             | [Player Service API](./player-service-api.md)、[管理后台开发说明](./player-admin-development.md)、[自建登录门户](./self-hosted-login.md) |
| 授权地图脚本及查询处罚       | [地图授权与脚本处罚 API](./script-moderation.md)                       | [玩家身份与后台管理](./player-identity.md)                                                                                               |
| 配置 PostgreSQL/Redis        | [配置参考](./configuration-reference.md)                               | [PostgreSQL 数据空间](./postgresql-data-storage.md)、[本地基础设施](./local-infrastructure.md)                                           |
| 开发或修复代码               | [开发者与协作手册](./developer-guide.md)                               | [系统架构](./architecture.md)、[工程规范](./engineering.md)                                                                              |
| 开发后台管理                 | [管理后台开发说明](./player-admin-development.md)                      | [后台管理复用索引](./player-admin-code.md)、[Local Engine API 与 Swagger](./local-engine-api.md)                                         |
| 查看、调用或新增 HTTP API    | [Local Engine API 与 Swagger](./local-engine-api.md)                   | [Player Service API](./player-service-api.md)、[Creator CLI HTTP API](./creator-cli-http-api.md)                                         |
| Fork、提交 PR 和构建贡献包   | [贡献者指南](../CONTRIBUTING.md)                                       | [开发者与协作手册](./developer-guide.md)、[构建、分发与 CI](./release-and-distribution.md)                                               |
| 构建镜像和发行包             | [构建、分发与 CI](./release-and-distribution.md)                       | [安全审计](./security-audit.md)                                                                                                          |
| 会议或业务介绍               | [业务方案对比](./business-comparison.md)                               | [系统架构](./architecture.md)                                                                                                            |
| 申请个人学习许可证           | [个人学习许可证](./licensing.md)                                       | [构建、分发与 CI](./release-and-distribution.md)                                                                                         |

## 文档职责

### 部署与使用

- [安装、部署与运维](./installation-and-operations.md)：硬件/软件要求、桌面包、无图形服务器、备份、升级和排障。
- [图形化部署管理器](./graphical-deployment-manager.md)：启动器页面、配置保存、启动范围、自动状态、性能与离线包结构。
- [Linux Web 管理端](./linux-web-manager.md)：无桌面服务器的浏览器配置、状态、日志、启停和安全访问。
- [配置参考](./configuration-reference.md)：环境变量来源、端口、数据库、容量、备份、安全项和修改后的生效方式。
- [部署与联机](./deployment.md)：本机、局域网、公网反向代理和服务暴露边界。
- [创作端部署](./creator-deployment.md)：Creator 工程目录、镜像、更新和排错。
- [游玩端部署](./play-deployment.md)：`.boxplay` 导入、地图开关、更新和公网部署；地图日常管理统一在后台管理完成。
- [VOXA 部署](./voxa-deployment.md)：模型工程、地图引用和本地数据备份。
- [地图作品、地图组与发布包](./projects.md)：主地图/副地图、`.boxproject`、`.boxplay` 和共享资源。
- [Creator CLI HTTP API](./creator-cli-http-api.md)：当前 Creator CLI Token、九项可授权能力和服务端调用契约。
- [ArenaPro CLI 接入设计](./arenapro-cli-creator-adapter.md)：保留的协议设计背景，不作为当前 `apc` 命令手册。

### 玩家身份与数据

- [玩家身份与后台管理](./player-identity.md)：玩家账号、预置皮肤、单设备会话、独立管理账号、权限组、游玩地图与容器管理边界。
- [管理后台开发说明](./player-admin-development.md)：后台前端模块地图、请求与权限 seam、页面开发约定和验收清单。
- [后台管理复用索引](./player-admin-code.md)：公共组件、地图目录、业务 Hook、各页面的唯一实现位置。
- [地图授权与脚本处罚 API](./script-moderation.md)：服主授权、单个/批量封禁、设备封禁、处罚查询和脚本安全记录。
- [Player Service API](./player-service-api.md)：认证与管理 API 的服务端接入契约。
- [自建登录门户](./self-hosted-login.md)：安全代理 API Key、Cookie 和登录回跳。
- [个人学习许可证](./licensing.md)：服主侧的申请、设备绑定和运行门禁，以及仅供运营方使用的本机离线签发器。
- [PostgreSQL 数据空间](./postgresql-data-storage.md)：账号与地图脚本数据的 schema、隔离、权限和备份。
- [本地基础设施](./local-infrastructure.md)：PostgreSQL、Redis、工程文件和运行时缓存的职责、卷与删除边界。

### 开发与兼容

- [系统架构](./architecture.md)：服务职责、请求链路和源码入口。
- [Local Engine API 与 Swagger](./local-engine-api.md)：统一 OpenAPI 契约、生成客户端、Swagger 调试、鉴权和接口开发流程。
- [领域模型](./domain-model.md)：地图组、地图资源、数据空间和管理权限的统一术语与约束。
- [开发者与协作手册](./developer-guide.md)：从获取代码、安装依赖、配置和启动源码，到模块开发、测试、镜像部署验证、故障排查及提交 PR 的完整流程。
- [贡献者指南](../CONTRIBUTING.md)：从 fork、分支、源码开发到测试、镜像和桌面 App 构建的完整流程。
- [工程规范](./engineering.md)：模块边界、测试策略和登记中的工程优化。
- [图形化与 Web 启动器统一记录](./launcher-parity-audit.md)：共用 Rust 核心、平台适配、修复与验证范围。
- [玩家启动器 Service Worker 资源缓存](./launcher-service-worker-cache.md)：通过同源 Service Worker 缓存公开静态地图资源；无自定义协议、无手动离线导入。
- [与 boxes 的核心对齐基线](./boxes-parity.md)：仅约束引擎兼容接口，不是用户部署手册。
- [稳定地图存储 ID 决策](./adr/0001-stable-map-storage-identity.md)：地图和地图组数据空间的架构决策。
- [业务方案对比](./business-comparison.md)：面向管理层的本地部署、在线平台、Unity 与 Minecraft 对比。
- [构建、分发与 CI](./release-and-distribution.md)：完整镜像归档、桌面 App、无图形服务器包和 Tag 流水线。
- [安全审计](./security-audit.md)：生产依赖审计范围与剩余风险。

## 当前发行边界

- 桌面启动器管理 Creator、Play、VOXA、Player Service 和玩家登录门户五个业务服务；完整镜像归档还包含 Linux Server Manager，共六个镜像。
- Apple Silicon 本地桌面构建产物位于 `apps/local-engine/dist/desktop-installers/`，文件名为 `BOX-Local-Engine-<version>-macos-arm64.zip`；解压后包含 `BOX3 Engine Launcher.app`。
- 无图形 Linux 服务器包包含 Creator、VOXA、Play、Player Service、玩家登录门户和 Rust Linux Web 管理端；不包含迁移器或 PostgreSQL/Redis 镜像，但管理端可按需拉取并维护内置基础服务。
- `apps/migrator/` 是内部迁移工具，不进入用户发行包，也不属于普通服主部署流程。
- `apps/license-server/` 是不连接数据库的内部本机签发器，不进入启动器、Linux Web 部署包、业务镜像或公开 Release；发行物只包含验签公钥和许可证校验能力。
- Creator 与 VOXA 默认仅本机访问。确需远程创作时可选择局域网或公网，但应使用 HTTPS、VPN/访问控制和创作者权限；Play 与登录门户仍是面向普通玩家的公开入口。
- 正常创作和游玩所需资源已本地化。选择“仅引用 OSS”发布模式时，地图会依赖发布者自己维护的对象存储；需要完全离线时必须选择“仅本地资源”。
- 桌面启动器和 Linux Web 管理端都可在用户确认后下载并管理内置 PostgreSQL/Redis，也可连接外部服务或不启用 Redis。
- 构建版本、提交短号、构建日期和来源来自镜像 `BOX_BUILD_*` 元数据；正式 Tag 构建应注入这些值，服主无需配置。
- 当前桌面发行目标为 Windows x64、Windows ARM64、Apple Silicon macOS、Linux x64 和 Linux ARM64。构建脚本支持 Intel macOS，但当前公开 Release 不构建该目标。
- 主分支和 Pull Request 的 Verify 工作流执行依赖审计、Compose 校验和 `rush verify`；Tag Release 工作流校验版本与 OSS 配置后构建发行包，不会重复执行完整 Verify。

## 当前脚本边界

- 客户端脚本运行在浏览器中，能使用运行环境提供的浏览器能力；编辑器的 DTS 只负责补全，不是安全沙箱。
- 服务端脚本在 game-server 隔离运行时中执行。账号、密钥、付费、奖励、权限和权威存档逻辑不得交给客户端决定。
- Local Engine 不使用 BOX 平台资源域名白名单，但仍校验危险 URL 协议，并保留登录 Origin、回跳地址和资源 CORS 等服务边界。
- 本地脚本 API 已移除在线平台专属的支付成功事件、社交统计、临时聊天、商城和分析能力；兼容范围以[对齐基线](./boxes-parity.md)为准。

## 文档维护规则

以下变化必须在同一提交更新文档和示例配置：

- 服务、端口、镜像、启动范围、数据目录或 Release 附件；
- 环境变量、默认值、启动器表单、Compose 传递或网络限制；
- 地图组、发布包、玩家身份、权限组、Cookie 或 API；
- 用户可见按钮、操作流程、错误信息和已删除功能。

文档只描述当前已实现行为。内部工具必须明确标注“内部”，测试预览必须明确标注“仅开发环境”，未来计划只能写入工程规划，不能混入用户操作步骤。文档不得出现真实密钥、Cookie、IP、数据库连接串或用户数据。
