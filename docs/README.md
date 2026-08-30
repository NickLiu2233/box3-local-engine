# BOX3 Engine 文档中心

根目录 [README](../README.md) 说明当前产品、支持平台和最短启动方式。本目录按实际任务拆分专题；部署者不需要从头读完，也不要同时照着多份部署文档执行。

## 推荐阅读顺序

| 目标                   | 主文档                                                | 必要补充                                                                                       |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 桌面启动器首次部署     | [图形化部署管理器](./graphical-deployment-manager.md) | [配置参考](./configuration-reference.md)                                                       |
| 无图形 Linux 服务器    | [安装、部署与运维](./installation-and-operations.md)  | [游玩端部署](./play-deployment.md)                                                             |
| 创建和发布地图         | [地图作品、地图组与发布包](./projects.md)             | [创作端部署](./creator-deployment.md)                                                          |
| 部署 Play 或公开服务器 | [游玩端部署](./play-deployment.md)                    | [部署与联机](./deployment.md)                                                                  |
| 部署 VOXA              | [VOXA 部署](./voxa-deployment.md)                     | [地图作品与资源边界](./projects.md)                                                            |
| 接入登录和玩家账号     | [自建登录门户](./self-hosted-login.md)                | [Player Service API](./player-service-api.md)、[玩家身份与权限](./player-identity.md)          |
| 配置 PostgreSQL/Redis  | [配置参考](./configuration-reference.md)              | [PostgreSQL 数据空间](./postgresql-data-storage.md)、[本地基础设施](./local-infrastructure.md) |
| 开发或修复代码         | [开发者与协作手册](./developer-guide.md)              | [系统架构](./architecture.md)、[工程规范](./engineering.md)                                    |
| 构建镜像和发行包       | [构建、分发与 CI](./release-and-distribution.md)      | [安全审计](./security-audit.md)                                                                |

## 文档职责

### 部署与使用

- [安装、部署与运维](./installation-and-operations.md)：硬件/软件要求、桌面包、无图形服务器、备份、升级和排障。
- [图形化部署管理器](./graphical-deployment-manager.md)：启动器页面、配置保存、启动范围、自动状态、实时日志和离线包结构。
- [配置参考](./configuration-reference.md)：环境变量来源、端口、数据库、容量、备份、安全项和修改后的生效方式。
- [部署与联机](./deployment.md)：本机、局域网、公网反向代理和服务暴露边界。
- [创作端部署](./creator-deployment.md)：Creator 工程目录、镜像、更新和排错。
- [游玩端部署](./play-deployment.md)：`.boxplay` 导入、地图开关、只读模式、更新和公网部署。
- [VOXA 部署](./voxa-deployment.md)：模型工程、地图引用和本地数据备份。
- [地图作品、地图组与发布包](./projects.md)：主地图/副地图、`.boxproject`、`.boxplay` 和共享资源。

### 玩家身份与数据

- [玩家身份与权限](./player-identity.md)：玩家账号、预置皮肤、单设备会话、独立管理账号、权限组和服主边界。
- [Player Service API](./player-service-api.md)：认证与管理 API 的服务端接入契约。
- [自建登录门户](./self-hosted-login.md)：安全代理 API Key、Cookie 和登录回跳。
- [PostgreSQL 数据空间](./postgresql-data-storage.md)：账号与地图脚本数据的 schema、隔离、权限和备份。
- [本地基础设施](./local-infrastructure.md)：仓库内 PostgreSQL/Redis profile 与状态检查。

### 开发与兼容

- [系统架构](./architecture.md)：服务职责、请求链路和源码入口。
- [开发者与协作手册](./developer-guide.md)：开发环境、UI 预览、测试和提交要求。
- [工程规范](./engineering.md)：模块边界、测试策略和登记中的工程优化。
- [与 boxes 的核心对齐基线](./boxes-parity.md)：仅约束引擎兼容接口，不是用户部署手册。
- [稳定地图存储 UUID 决策](./adr/0001-stable-map-storage-identity.md)：地图和地图组数据空间的架构决策。
- [构建、分发与 CI](./release-and-distribution.md)：五镜像归档、桌面 App、无图形服务器包和 Tag 流水线。
- [安全审计](./security-audit.md)：生产依赖审计范围与剩余风险。

## 当前发行边界

- 桌面离线包包含 Creator、Play、VOXA、Player Service 和参考登录门户五个 Linux 镜像。
- 无图形 Linux 服务器包只包含 Play、Player Service 和参考登录门户；不包含 Creator 或 VOXA。
- `apps/migrator/` 是内部迁移工具，不进入用户发行包，也不属于普通服主部署流程。
- Creator 与 VOXA 只允许本机或可信局域网；公网只应暴露 Play、登录门户，以及受反向代理保护的 Player Service 必要接口。
- 正常创作和游玩所需资源已本地化。选择“仅引用 OSS”发布模式时，地图会依赖发布者自己维护的对象存储；需要完全离线时必须选择“仅本地资源”。
- 桌面启动器不安装 PostgreSQL 或 Redis。Player Service 必须使用 PostgreSQL；Redis 可选。
- 当前桌面发行目标为 Windows x64、Apple Silicon macOS 和 Linux x64。Windows ARM、Intel macOS 与 Linux ARM64 桌面 App 不是默认 Release 目标。

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
