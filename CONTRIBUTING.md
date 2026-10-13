# 贡献指南

项目采用 [MIT](LICENSE.md) 许可，任何人都可以 Fork 并提交 Pull Request。较大改动先开 Issue 确认范围，保留原作者与第三方许可声明。

## 获取与同步源码

先 Fork [官方仓库](https://github.com/ifishcool/box-local-engine)，再克隆自己的副本：

```sh
git clone https://github.com/<your-account>/box-local-engine.git
cd box-local-engine
git remote add upstream https://github.com/ifishcool/box-local-engine.git
git fetch upstream
git switch -c codex/<short-description> upstream/dev
```

`origin` 指向自己的 Fork，`upstream` 指向官方仓库。不要覆盖他人的未提交改动或向共用分支强制推送。

## 开发

环境、安装和启动见[开发入门](docs/developer-guide.md)，统一规则见[代码规范](docs/code-style.md)。

```sh
npm run install:all
cp .env.docker.example .env
npm run dev:infra
```

已有本地配置时不要再次复制覆盖。修改依赖或新增 Rush 项目后执行 `npm run update:all` 并提交锁文件。

## 验证与提交

```sh
npm run verify
node scripts/check-public-repository.js --staged
git diff --check
```

只暂存本次修改。代码、测试、契约和相关基础说明在同一提交更新；不要提交真实凭据、运行数据或本机构建产物。仅修改文档时，运行 `node scripts/check-documentation.js` 与 `git diff --check`。

推送主题分支到自己的 Fork，通常向官方 `dev` 提交 Pull Request。PR 自动运行格式、Lint、类型和测试检查，不打包或上传 OSS。说明：

- 问题、修改范围和兼容性影响。
- 实际运行的验证命令与结果，明确失败及未执行项。
- 界面改动的截图；发行改动的目标平台与构建来源。
- 涉及数据、权限或部署时的风险与回滚方式。

源码改动不会自动更新现有容器或安装包。维护者合并到 staging 后测试打包，合并到 release 后正式打包并自动生成版本标签；成功发布后同步 main。Fork 不需要官方发布密钥，合并前须通过完整验证。

测试构建与正式发布的触发方式、OSS 路径和版本约定见 [Release & Version](docs/release-and-version.md)。

请通过 [Issues](https://github.com/ifishcool/box-local-engine/issues)反馈问题，日志与截图中不要包含 Cookie、Token、数据库凭据或用户数据。
