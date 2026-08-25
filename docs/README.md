# BOX3 Engine 文档中心

本目录是 BOX3 Engine 的唯一文档入口。它面向两类人：部署、运营引擎的服主，以及维护代码、镜像和发行包的协作者。

先从目标出发阅读，不需要一次看完所有文档。

## 选择你的入口

| 你要做什么                        | 首先阅读                                              | 然后阅读                                                                                       |
| --------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 第一次在桌面电脑部署              | [图形化部署管理器](./graphical-deployment-manager.md) | [配置参考](./configuration-reference.md)                                                       |
| 在 Linux 服务器部署               | [安装、部署与运维](./installation-and-operations.md)  | [部署与联机](./deployment.md)、[游玩端部署](./play-deployment.md)                              |
| 创建、导入、发布或恢复地图        | [作品、地图组与发布包](./projects.md)                 | [创作端部署](./creator-deployment.md)、[游玩端部署](./play-deployment.md)                      |
| 使用远程 PostgreSQL 或 Redis      | [配置参考](./configuration-reference.md)              | [PostgreSQL 数据空间](./postgresql-data-storage.md)、[本地基础设施](./local-infrastructure.md) |
| 自己制作玩家登录页                | [自建登录门户](./self-hosted-login.md)                | [Player Service API](./player-service-api.md)、[玩家身份与权限](./player-identity.md)          |
| 修复功能、写测试或改界面          | [开发者与协作手册](./developer-guide.md)              | [系统架构与源码入口](./architecture.md)、[工程开发规范](./engineering.md)                      |
| 构建镜像、离线包或 GitHub Release | [构建、分发与 CI](./release-and-distribution.md)      | [图形化部署管理器](./graphical-deployment-manager.md)                                          |
| 对照原始 boxes 行为               | [boxes 对齐基线](./boxes-parity.md)                   | [地图存储 UUID 决策](./adr/0001-stable-map-storage-identity.md)                                |

## 文档地图

### 给服主和运营者

- [安装、部署与运维](./installation-and-operations.md)：源码 Compose 部署、端口、局域网/公网、日常排障与恢复。
- [图形化部署管理器](./graphical-deployment-manager.md)：桌面启动器的配置、镜像导入、服务控制、备份和数据目录。
- [配置参考](./configuration-reference.md)：配置的来源、优先级、常用变量、安全变量和端口说明。
- [创作端部署](./creator-deployment.md)、[游玩端部署](./play-deployment.md)、[VOXA 部署](./voxa-deployment.md)：各服务的专项说明。
- [作品、地图组与发布包](./projects.md)：工程包、发布快照、游玩包、共享资源和备份的边界。

### 给接入方

- [Player Service API](./player-service-api.md)：玩家认证和服主管理 API。
- [自建登录门户](./self-hosted-login.md)：如何安全地替换参考登录页。
- [玩家身份与权限](./player-identity.md)：角色、封禁、会话撤销和游戏脚本可见字段。
- [PostgreSQL 数据空间](./postgresql-data-storage.md)：玩家身份和地图脚本数据的 schema、隔离与备份。

### 给开发者和发行协作者

- [开发者与协作手册](./developer-guide.md)：从克隆仓库到提交 PR 的实际工作流。
- [系统架构与源码入口](./architecture.md)：服务职责、数据流、核心概念和需求定位表。
- [工程开发规范](./engineering.md)：代码、测试、安全和兼容约束。
- [构建、分发与 CI](./release-and-distribution.md)：镜像、桌面包、Tag 工作流和发布检查。
- [安全审计](./security-audit.md)：依赖审计范围与已知风险。

## 当前产品边界

BOX3 Engine 包含 ARENA（Creator）、Play、VOXA、Player Service、参考登录门户、云端迁移器和 Tauri 部署管理器。

- Creator 保存可编辑工程；发布后生成不可变快照；Play 只运行该快照。
- Creator 与 VOXA 仅支持本机或可信局域网，不能作为公网服务发布。
- Play、Player Service 与自建登录门户可按部署配置对外提供服务；公网必须使用 HTTPS、反向代理和防火墙。
- 桌面启动器不安装 PostgreSQL 或 Redis：当前启动器要求服主提供可访问的 PostgreSQL，Redis 可不填。
- 仓库的 Compose 模板仍可启动内置 PostgreSQL/Redis，适合源码开发或自管部署；这和桌面启动器的“远程数据库”产品策略是两条不同路径。

## 文档更新要求

把文档视为产品接口的一部分。以下任一变化必须在同一提交中更新对应文档：

- 服务、端口、镜像、离线包结构、启动命令或 GitHub Actions；
- `.env` 变量、默认值、配置来源、数据目录或网络暴露规则；
- 地图、模型、脚本、发布包、备份、身份、权限或迁移的可见行为；
- 外部 API、登录回跳、Cookie、安全限制或错误信息。

文档不得包含真实密钥、Cookie、令牌、IP、数据库连接串、用户数据或生产地址；也不要把尚未实现的想法写成当前能力。
