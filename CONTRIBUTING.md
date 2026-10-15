# 贡献指南

感谢你参与 BOX3 本地引擎的改进。项目采用 [MIT](LICENSE.md) 许可，任何人都可以 Fork 并提交 Pull Request（PR）。保留原作者与第三方许可声明；项目品牌与商标不由 MIT 授权。

文档修正、可复现的 Bug 报告、测试、界面改进与实现都可以贡献。较大功能、公共接口变化、数据格式或部署方式调整，建议先开 Issue 说明场景与范围，以便尽早发现兼容性和维护成本问题。

## 1. 确定改动范围

先阅读[项目介绍](README.md)、[开发入门](docs/developer-guide.md)与相关模块 README，确认要修改哪一个应用或公共包。第一次接触引擎时，用[首个作品教程](docs/first-project.md)走一遍实际操作。提交前搜索已有 Issue/PR，避免重复实现；一个 PR 尽量解决一个清楚的问题。

Bug 报告应包括复现步骤、预期结果、实际结果、系统与架构、引擎版本或提交，以及脱敏后的首个错误日志。功能建议应说明谁遇到什么困难、期望怎样操作，而不只列出实现方案。不要在公开 Issue 中粘贴密钥或真实用户数据。

## 2. Fork、克隆与创建分支

先 Fork [官方仓库](https://github.com/box3lab/box3-local-engine)，再克隆自己的副本。下方 `<your-account>` 和 `<short-description>` 需要替换为自己的 GitHub 账号与简短分支名：

```sh
git clone https://github.com/<your-account>/box3-local-engine.git
cd box3-local-engine
git remote add upstream https://github.com/box3lab/box3-local-engine.git
git fetch upstream
git switch -c dev/<short-description> upstream/dev
```

`origin` 指向自己的 Fork，用于推送主题分支；`upstream` 指向官方仓库，用于同步。一般贡献从官方 `dev` 创建分支，并向 `dev` 提交 PR；发布分支由维护者安排。`dev/` 是这里的示例前缀，分支名应能表达改动，例如 `fix/map-import`。

开发期间如需同步最新 dev，先确保改动已提交或妥善保存，再在自己的主题分支执行：

```sh
git fetch upstream
git merge upstream/dev
```

出现冲突时逐个核对双方意图，解决后重新验证。不要覆盖他人的未提交改动、重置共享分支或向共用分支强制推送。

## 3. 安装与开发

根目录执行：

```sh
npm run install:all
cp .env.docker.example .env
npm run check:workspace
npm run dev:infra
```

使用 Node.js `22.17.x`，先启动 Docker。Windows PowerShell 用 `Copy-Item .env.docker.example .env`；已有本地配置时跳过复制。已有 PostgreSQL 的开发者可配置 `BOX_DATABASE_URL` 后使用 `npm run dev`。原生开发与 Rust 专项测试需要 Rust 和平台工具链，详细步骤见[开发入门](docs/developer-guide.md)。

遵循[代码规范](docs/code-style.md)，先复用现有组件与公共包。修改依赖或新增 Rush 项目后执行 `npm run update:all`，检查并提交相关 `package.json`、`rush.json` 与锁文件差异。普通依赖安装使用 `install:all`，不为了安装失败而随意更新整个锁文件。

修改 API 时同步契约与生成客户端；修改权限、数据格式、实时协议或兼容行为时补充有意义的回归测试。用户操作、命令或配置发生变化时，在同一个 PR 中更新文档。避免夹带无关格式化、依赖升级和大范围重构。

## 4. 提交前验证

代码修改完成后，在根目录执行基础检查：

```sh
npm run verify
git diff --check
```

`verify` 只运行格式与 ESLint，检查语法和代码风格，不构建应用、不运行类型检查或业务测试，也不要求 Rust、Docker 和数据库运行环境。需要验证具体实现时，按[测试指南](docs/testing.md)手动运行相关模块命令；全套回归使用 `npm run test`，类型检查使用 `npm run typecheck`。PR 中如实说明实际执行项和结果。

## 5. 暂存、提交与推送

先查看工作区，只暂存本次改动。下面以文档修改为例，代码修改时换成实际文件：

```sh
git status --short
git diff -- README.md CONTRIBUTING.md docs/
git add README.md CONTRIBUTING.md docs/
git diff --cached --check
git diff --cached --stat
git commit -m "docs: clarify development and contribution workflow"
git push -u origin HEAD
```

提交信息应描述改了什么，例如 `fix: handle missing map metadata` 或 `docs: explain staging image reuse`。代码、相关测试、契约和说明一起提交，让评审者能理解并验证同一行为。

## 6. 创建 Pull Request 与回应评审

在 GitHub 为自己的主题分支创建 Pull Request，通常选择官方仓库的 `dev` 为目标。尚未完成的改动可先开 Draft PR；准备好后标记为可评审。

PR 说明至少包含：

- **问题与结果**：原来在什么条件下发生什么问题，改后怎样表现；关联 Issue。
- **范围与兼容性**：涉及的应用/公共包、接口或数据格式影响，是否需要额外配置。
- **验证证据**：实际执行的命令与结果，明确失败、未执行项和原因。
- **用户可见变化**：界面截图或操作步骤；发行改动说明目标平台与产物来源。
- **风险与回滚**：涉及权限、持久数据、部署或迁移时说明备份与恢复方案。

PR 创建、更新、重新打开和标记为可评审时，Verify 只运行格式、语法和代码风格检查，不运行业务回归、依赖漏洞审计、Compose 校验或安装包检查。PR 本身不打包、不上传 OSS，Fork 贡献者无需配置官方发布密钥。具体功能和目标平台的验证由维护者按改动范围另行执行。

评审要求修改时，继续提交到同一个主题分支即可更新 PR；说明关键调整并重新运行受影响检查。合并由维护者决定，合并后可以删除自己的主题分支，下次贡献重新从最新 dev 创建。

## 7. 理解开发与发布的区别

源码改动不会自动更新已有容器或安装包。日常改动先进入 dev，再到 staging 测试，最后由已合并到 release 的 PR 触发正式发行；发布成功后同步 main。

staging 允许直接提交与手动测试打包，同版本默认复用已有镜像，因此新测试安装包不一定包含新引擎代码。验证新的镜像实现时需升级版本，或由维护者手动运行 Test Build 并启用 `rebuild_images`。正式版本由流水线自动固定 Tag，同版本不能指向另一个提交。

具体分支、OSS 目录、版本更新和失败重跑规则见 [Release &amp; Version](docs/release-and-version.md)。普通贡献者提交源码与验证结果即可，不需要自行上传官方发行产物。

问题与讨论通过 [Issues](https://github.com/box3lab/box3-local-engine/issues)进行；附件和截图应先移除 Cookie、Token、数据库凭据与用户信息。
