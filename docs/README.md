# 文档导航

这里说明如何启动源码、理解项目边界、遵循开发规则，以及提交和发布改动。面向第一次接触项目的开发者，也供维护者日常查阅；模块专用接口和操作步骤留在对应模块 README，避免同一规则维护多份。

## 按目标阅读

| 你要做什么               | 从哪里开始                                    | 读完应能完成什么                                       |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------ |
| 了解产品和各个应用       | [项目介绍](../README.md)                      | 区分编辑器、玩家启动器与部署管理器，选择源码或安装包   |
| 第一次运行源码           | [开发入门](./developer-guide.md)              | 安装依赖、配置数据库、启动与停止开发服务、定位常见故障 |
| 理解模块和数据流         | [架构指南](./architecture.md)                 | 找到应用、运行时、身份、作品存储与共享契约的职责边界   |
| 从零做出可游玩的作品     | [首个作品教程](./first-project.md)            | 初始化服主、授权创作、预览、导出工程与导入游玩包       |
| 验证改动和定位测试失败   | [测试指南](./testing.md)                      | 选择 runner，区分默认 CI、真实数据库与人工验收         |
| 修改实现或公共接口       | [代码规范](./code-style.md)                   | 确定格式、模块边界、契约和测试要求                     |
| 向项目提交改动           | [贡献指南](../CONTRIBUTING.md)                | Fork、同步、验证、提交 Pull Request 并回应评审         |
| 测试安装包或准备正式版本 | [Release & Version](./release-and-version.md) | 理解分支、版本固定、测试缓存与发行产物                 |

新贡献者建议按“项目介绍 → 开发入门 → 首个作品教程 → 架构指南 → 测试指南 → 贡献指南”的顺序阅读。只想安装或开服时，可直接使用下面的用户入口，无需先学习整个工作区。

## 模块与部署入口

- [本地引擎控制层](../apps/local-engine/README.md)：Creator/Play、作品格式、数据目录与运行边界。
- [部署管理器](../apps/deployment-manager/README.md)：桌面部署入口、开发和原生构建。
- [VOXA](../apps/voxa/README.md)：模型服务、工程格式、权限与检查。
- [玩家后台](../apps/player-admin/README.md)：服主、管理员和玩家身份的区别与首次授权。
- [Rust Web 管理器](../apps/server-manager-rust/README.md)：服务器管理适配、运行配置与检查。
- [管理器共享核心](../apps/manager-core/README.md)：桌面与 Web 共用的配置、服务控制和备份规则。
- [HTTP API 契约](../internals/apis/README.md)：OpenAPI 与生成客户端的维护。
- [Linux 服务器包](../distribution/server/README.md)：无桌面服务器的安装与管理。
- [Play 分发模板](../distribution/play/README.md)：独立游玩服务的配置与部署。
- [玩家启动器](../apps/player-launcher/README.md)：连接服务器、账号、地图和本机缓存。
- [玩家启动器发布说明](../apps/player-launcher/docs/release.md)：原生安装包、签名与发布检查。

HTTP API 文档通过根目录的 `npm run api:docs` 启动，实际地址以日志为准。生成契约与客户端的流程见开发入门。

`apps/local-engine/data/blobs/` 整个目录纳入源码与 Docker 构建输入，资源更新方式见[贡献指南](../CONTRIBUTING.md)。项目、上传、缓存和备份目录仍排除在构建上下文之外。

## 文档维护

修改公共命令、配置默认值、接口或发布行为时，在同一个 PR 中更新相关说明。示例应注明执行目录、前置条件和执行后的结果；凭据只使用占位值，不能粘贴本机真实配置。

文档只描述当前可用行为，不把待实现方案写成现有能力。专用细节以模块 README、`package.json` 与实现为核对来源；历史讨论、设计草案与验收记录不放入这套基础文档。

修改后在仓库根目录运行 `node scripts/check-documentation.js` 和 `git diff --check`，并检查 Markdown 格式。前者检查本地链接与基础入口，不验证远程网站可用性，也不代替实际运行命令。
