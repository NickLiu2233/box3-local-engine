# Release & Version

本文说明源码如何进入测试与正式发行，以及版本、镜像和安装包如何对应。普通贡献者主要关注 PR 验证与 staging 测试；发布维护者还需检查版本固定、OSS 配置与目标平台产物。

“源码提交”“镜像构建”“安装包生成”“部署服务”是不同步骤。PR 通过检查不会自动替换用户的容器；测试安装包按当前提交生成时，也可能引用同版本的旧测试镜像。核对问题时应同时看源码提交、镜像清单与安装包来源。

## 分支与流水线

引擎与玩家启动器共用以下流程，版本号仍各自维护：

| 入口                     | 行为                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| Pull Request             | Verify：格式、Lint、类型、测试与工程检查；不打包、不上传 OSS     |
| `dev`、主题分支          | 日常开发；dev 推送与 PR 运行验证，不运行打包                     |
| `staging` 更新或手动运行 | 复用同版本测试镜像，生成部署启动器与玩家测试安装包，上传测试 OSS |
| 合并 PR 到 `release`     | 构建正式镜像与安装包，发布 GitHub Release 和正式 CDN             |
| `main`                   | 保持最新正式源码；正式发布成功后同步，不触发打包                 |

顺序为主题分支 → dev → staging → release → main。PR 创建、更新、重新打开和标记为可评审时自动验证。staging 允许直接提交、重复版本和手动重跑，不要求合并校验；release 仍须核对已合入目标分支的 PR 提交。dev 和 main 不打包，测试不创建发布 Tag。

合并到 release 即可正式发布，不需要手动打 Tag。配置校验通过后、构建开始前，流水线自动保留引擎 `v<根版本>` 和玩家启动器 `player-v<玩家版本>` 标签，避免失败构建的缓存被另一个提交复用；成功后发布 GitHub Release。标签只用于版本固定与追溯，不触发流水线。

## 版本与 OSS

- 引擎版本取根 package.json，后续采用 `YYYY.N.P`：年份、当年功能序号、补丁序号，如 `2026.1.0`。年份按 Asia/Shanghai 发布日期确定，功能序号从 1 开始、补丁从 0 开始。参考 [CalVer](https://calver.org/overview_zhcn.html)。
- 玩家启动器版本取 `apps/player-launcher/package.json`，公共包按各自 API 兼容性升级，不随引擎全部改成同一版本。
- 正式版本：合入 release 前更新本次发行的版本；两个正式流水线会同时启动，必须确保各自版本可发布。同一个正式版本号不允许指向另一个提交，相同提交的失败重跑可以复用缓存。
- 引擎测试：`local-engine-testing/vX.Y.Z/`，按版本与架构复用完整镜像缓存。缓存清单有效且六个镜像对象均存在时，不重新构建或拆包；缺失或无效时重新构建。测试镜像标签为 `test-vX.Y.Z-linux-<architecture>`。
- 测试部署启动器：同一测试目录下的 `launchers/<commit>/`，生成五个平台的轻量安装包，内嵌测试镜像清单与下载地址，从测试 OSS/CDN 获取镜像，不回退到正式镜像或自动升级为正式启动器。
- 玩家测试：`box-player-launcher-testing/<commit>/<run-id>-<attempt>/`。五个平台原生安装包带 `dev.<run-id>.<attempt>` 版本，保留桌面、缓存、签名和 SHA-256 检查。
- 引擎正式中间产物：`local-engine/vX.Y.Z/`，正式分发入口为 `local-engine/`；玩家正式安装包为 `box-player-launcher/player-vX.Y.Z/`。
- 测试不更新正式 latest、安装脚本或 GitHub Release。流水线使用已有 `ALIYUN_OSS_*` Secrets；Fork PR 不需要发布凭据。

同版本即使代码改变，也会沿用已有测试镜像，镜像清单保留原构建提交。要测试新引擎代码，升级版本或在 Test Build 手动运行时勾选 `rebuild_images`；启动器本身会按当前提交重新生成。强制重建不删除旧内容归档，已有测试启动器仍能下载其固定镜像。

现有 `assets.box3.fun` CDN 须能读取 `local-engine-testing/` 下的对象。测试仍保留架构、来源与 SHA-256 检查，只放宽版本复用和触发方式。

## 工作区依赖

例如在 VOXA 中统一更新本地依赖：

```sh
cd apps/voxa
node ../../common/scripts/install-run-rush.js add -p '@box/box-design@workspace:~1.0.6' -m
```

`workspace:` 使用本地包，`~` 表达补丁范围，`-m` 统一已有使用方。范围必须包含本地包实际版本，并提交清单与 Rush 锁文件。

## 如何选择测试方式

| 需要验证什么             | 推荐方式                                                  | 应核对的结果                             |
| ------------------------ | --------------------------------------------------------- | ---------------------------------------- |
| 网页或业务源码行为       | 本机开发栈与相关测试                                      | 运行进程加载的是本次源码与已重建依赖     |
| 测试部署管理器自身的变化 | staging 测试包                                            | 启动器提交是当前提交；引擎镜像可继续复用 |
| 测试新的引擎镜像实现     | 升级引擎测试版本，或手动 Test Build 勾选 `rebuild_images` | 镜像清单的来源提交与预期一致             |
| 测试玩家启动器原生行为   | 玩家 staging 安装包                                       | 平台、架构与带 `dev` 的测试版本正确      |
| 对用户正式分发           | 合并经过验证的 PR 到 release                              | 正式 Tag、校验值、安装包与分发入口一致   |

例如，在同版本下修改 VOXA 后直接推送 staging，完整镜像缓存有效时不会重建 VOXA。此时测试部署启动器可以是新的，但 VOXA 仍来自旧镜像提交；不要据此判断源码修复无效。强制重建测试镜像后再检查来源记录，或使用新的测试版本将两次产物区分开。

目前 staging 按版本与架构复用完整六镜像清单，缓存无效时执行全量构建。按业务指纹精确重建受影响镜像与按版本复用整套镜像是不同策略，不能把前者当成当前 staging 的默认行为。

## 维护者的发布步骤

1. **确定发行内容**：确认 dev 中的目标改动与验证结果，整理用户可见变化、配置与兼容性影响。
2. **准备版本**：更新引擎与玩家启动器各自版本；release 会启动两个正式流水线，因此分别检查版本是否可固定到本次提交。引擎相关同步项由 `scripts/sync-root-version.js` 维护，修改后运行 `npm run version:check`。
3. **在 staging 验证**：选择复用或重建镜像，安装目标平台测试包，核对清单来源、架构与 SHA-256。执行实际启动、登录、地图导入/游玩以及相关升级场景。
4. **通过 PR 合入 release**：确保完整验证通过并完成评审。正式流水线先核对已合并 PR，再校验版本与发布配置。直接推送 release 不能替代合并校验。
5. **查看发布结果**：检查 Actions 的各平台任务、GitHub Release 附件、OSS/CDN 分发入口和构建记录。不能因为一个构建 job 通过就宣布整套发布完成。
6. **确认部署与恢复**：升级前备份 `.env`、数据库、工程和地图数据；按部署工具的更新流程应用新版本，确认服务正常。正式发布成功后核对 main 的同步结果。

版本升级示例：

```sh
# 仓库根目录执行；版本仅为示例，按本次发行选择实际值。
npm version 2026.1.0 --no-git-tag-version
node scripts/sync-root-version.js
npm --prefix apps/player-launcher version 0.1.1 --no-git-tag-version
npm run version:check
npm run verify
```

检查版本同步产生的全部差异并提交，再按分支流程创建 PR。`--no-git-tag-version` 只更新版本，不创建 Tag；正式 Tag 由流水线自动生成，不手动推送 Tag 来触发发行。玩家签名、原生测试与产物校验细节见[玩家发布说明](../apps/player-launcher/docs/release.md)。

## 失败重跑与回滚

正式构建失败时，先检查失败步骤与实际上传结果。同一提交重跑可以复用已经有效的缓存；若需要修改源码、签名或发布脚本，应使用新版本走新的 release PR。正式版本在构建前已经固定，不能移动既有 Tag 或用另一提交覆盖同版本产物。

staging 同版本可重跑，也可强制重建镜像；测试目录与正式目录分离，测试不更新正式 latest。测试镜像归档保留固定下载来源，便于已有测试启动器继续取得其对应镜像。

回滚不能只回退安装包：还要确认旧镜像是否兼容现有配置与数据。如果本次包含不可逆的数据迁移，应按发布前的备份恢复方案处理。发布说明中记录升级要求与恢复边界，不以清空数据库或删除卷作为默认回滚方式。

## 配置与核对来源

发布流水线使用 `ALIYUN_OSS_BUCKET`、`ALIYUN_OSS_ENDPOINT`、`ALIYUN_OSS_ACCESS_KEY_ID` 与 `ALIYUN_OSS_ACCESS_KEY_SECRET`。Bucket 只填名称，Endpoint 不含协议或路径；值仅配置在官方仓库的 Secrets，不提交到 `.env` 示例、文档或 Fork。

引擎流程见 `.github/workflows/test-build.yml` 与 `.github/workflows/release.yml`；玩家流程见 `.github/workflows/player-launcher-test-build.yml` 与 `.github/workflows/player-launcher-release.yml`；质量检查见 `.github/workflows/verify.yml`。规则变化时同时更新这些说明与相关回归检查。
