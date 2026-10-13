# 公开源码与协作

BOX3 Local Engine 已全面开源，官方公开仓库为 [ifishcool/box-local-engine](https://github.com/ifishcool/box-local-engine)。任何人都可以浏览、克隆、Fork 和提交 Pull Request，不需要邀请或访问申请。

## 获取源码

只阅读、开发或运行源码时，可以直接克隆官方仓库：

```bash
git clone https://github.com/ifishcool/box-local-engine.git
cd box-local-engine
npm run install:all
cp .env.docker.example .env
npm run dev:infra
```

后台开发还需另开终端运行 `cd apps/player-admin && npm run dev`，访问 8000 端口。环境准备与验证限制见[开发手册](./developer-guide.md)和[当前状态](./current-status.md)。

## Fork 与 Pull Request

1. 在官方仓库点击 Fork，创建自己的副本。
2. 克隆自己的 Fork，`origin` 指向自己的仓库；将官方仓库添加为 `upstream`。
3. 从最新上游 `main` 创建主题分支，修改代码、测试和对应文档。
4. 验证后推送主题分支到自己的 `origin`，向官方 `main` 提交 Pull Request。
5. 根据评审修改，并在上游更新后重新验证。

完整命令、提交要求与依赖约定见[贡献指南](../CONTRIBUTING.md)。Fork 不授予上游写入或发布权限，提交贡献也不需要这些权限。

## 反馈与安全

普通问题可通过 [Issues](https://github.com/ifishcool/box-local-engine/issues)反馈，附源码或应用版本、系统、复现步骤、预期结果与实际结果。较大的功能先讨论范围，避免重复开发。

不要在公开 Issue、PR、截图或日志中提供密码、访问令牌、Cookie、数据库连接串、玩家资料或他人的作品。安全漏洞先使用维护者提供的私下渠道沟通，不公开利用步骤与真实凭据。提交前执行 `node scripts/check-public-repository.js --staged`，并人工复核暂存内容。

## 许可与发行

项目代码采用 [MIT](../LICENSE.md)，使用、修改与再分发须遵循适用版权与许可声明。第三方组件、素材和品牌另有边界，见[许可说明](./open-source-licensing.md)。

安装包见 [GitHub Releases](https://github.com/ifishcool/box-local-engine/releases)，构建与分发见[发行指南](./release-and-distribution.md)。公开源码不等于某个安装包、容器或 CDN 已更新到最新提交，测试记录也不能代替当前版本验收。

运行程序不需要激活，但服务器登录、账户权限与地图脚本授权仍然存在。内部迁移器及签发工具不属于引擎公共源码和发行包；缺少这些工具不影响普通开发与构建。
