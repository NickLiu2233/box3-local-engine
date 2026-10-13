# Release & Version

## 分支与流水线

引擎与玩家启动器共用以下流程，版本号仍各自维护：

| 入口                 | 行为                                                         |
| -------------------- | ------------------------------------------------------------ |
| Pull Request         | Verify：格式、Lint、类型、测试与工程检查；不打包、不上传 OSS |
| `dev`、主题分支      | 日常开发；dev 推送与 PR 运行验证，不运行打包                 |
| 合并 PR 到 `staging` | 构建测试镜像及玩家启动器测试安装包，上传独立 OSS 目录        |
| 合并 PR 到 `release` | 构建正式镜像与安装包，发布 GitHub Release 和正式 CDN         |
| `main`               | 保持最新正式源码；正式发布成功后同步，不触发打包             |

顺序为主题分支 → dev → staging → release → main。PR 创建、更新、重新打开和标记为可评审时自动验证。流水线从 staging/release 的更新事件启动，再核对当前提交是否为合入目标分支的 PR 结果；直接推送、未合并 PR、dev、main 和手动推送 Tag 都不会进入打包阶段。

合并到 release 即可正式发布，不需要手动打 Tag。配置校验通过后、构建开始前，流水线自动保留引擎 `v<根版本>` 和玩家启动器 `player-v<玩家版本>` 标签，避免失败构建的缓存被另一个提交复用；成功后发布 GitHub Release。标签只用于版本固定与追溯，不触发流水线。

## 版本与 OSS

- 引擎版本取根 package.json，后续采用 `YYYY.N.P`：年份、当年功能序号、补丁序号，如 `2026.1.0`。年份按 Asia/Shanghai 发布日期确定，功能序号从 1 开始、补丁从 0 开始。参考 [CalVer](https://calver.org/overview_zhcn.html)。
- 玩家启动器版本取 `apps/player-launcher/package.json`，公共包按各自 API 兼容性升级，不随引擎全部改成同一版本。
- 合入 release 前更新本次发行的版本；两个正式流水线会同时启动，必须确保各自版本可发布。同一个版本号不允许指向另一个提交；相同提交的失败重跑可以复用缓存，不移动已发布 Tag。
- 引擎测试：`local-engine-testing/<commit>/<run-id>-<attempt>/<architecture>/`。测试镜像标签包含 commit，仅生成 amd64/arm64 六服务归档、SHA-256 与构建信息，不生成从正式 CDN 下载镜像的轻量安装包。
- 玩家测试：`box-player-launcher-testing/<commit>/<run-id>-<attempt>/`。五个平台原生安装包带 `dev.<run-id>.<attempt>` 版本，保留桌面、缓存、签名和 SHA-256 检查。
- 引擎正式中间产物：`local-engine/vX.Y.Z/`，正式分发入口为 `local-engine/`；玩家正式安装包为 `box-player-launcher/player-vX.Y.Z/`。
- 测试不更新正式 latest、安装脚本或 GitHub Release。流水线使用已有 `ALIYUN_OSS_*` Secrets；Fork PR 不需要发布凭据。

当前 `0.3.0` 未在本轮修改。修改引擎版本后运行：

```sh
node scripts/sync-root-version.js
npm run update:all
node scripts/sync-root-version.js --check
npm run verify
```

## 仓库设置

维护者创建 dev、staging、release 分支，为它们和 main 设置 PR 审核、必需 Verify 与禁止强推规则；正式分发前完成目标平台验收。完整验证失败时不得合并；打包成功不代表代码质量检查通过。

仅正式发布任务拥有写入 Release/Tag 的权限；仓库规则须允许发布自动化创建版本标签。本文只修改仓库内流水线，不自动设置 GitHub 分支保护、远端分支或 Secrets。Package Server 的手动正式补包流程仍供维护者使用，不是测试入口。

## 工作区依赖

例如在 VOXA 中统一更新本地依赖：

```sh
cd apps/voxa
node ../../common/scripts/install-run-rush.js add -p '@box/box-design@workspace:~1.0.6' -m
```

`workspace:` 使用本地包，`~` 表达补丁范围，`-m` 统一已有使用方。范围必须包含本地包实际版本，并提交清单与 Rush 锁文件。
