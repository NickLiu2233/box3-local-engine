# 玩家启动器发布

分支总流程见[发布与版本](../../../docs/release-and-version.md)。玩家版本独立取自本模块 `package.json`，不由 `sync-root-version.js` 同步。

## 触发与产物

| 入口                      | 行为                                                                     |
| ------------------------- | ------------------------------------------------------------------------ |
| 更新 `staging` / 手动测试 | 五平台测试包，版本带 `dev.<run-id>.<attempt>`，仅上传测试 OSS            |
| PR 合入 `release`         | 固定 `player-v<版本>` 标签，构建或复用安装包，发布 OSS 和 GitHub Release |
| `dev`、`main`、普通 PR    | 不打包玩家启动器；Verify 只做基础检查                                    |

正式流水线会核对合并提交和版本，同版本不允许指向另一提交，不需要手动打 Tag。玩家 Release 设置 `make_latest: false`，不覆盖引擎的 latest；预发布版本会标记 prerelease。

| 目标          | Runner             | 安装包后缀             |
| ------------- | ------------------ | ---------------------- |
| Windows AMD64 | `windows-2022`     | `windows-amd64.exe`    |
| Windows ARM64 | `windows-11-arm`   | `windows-arm64.exe`    |
| macOS ARM64   | `macos-14`         | `macos-arm64.dmg`      |
| Linux AMD64   | `ubuntu-22.04`     | `linux-amd64.AppImage` |
| Linux ARM64   | `ubuntu-22.04-arm` | `linux-arm64.AppImage` |

文件名前缀为 `BOX3-Player-Launcher-<版本>-`。Linux AppImage 需可执行权限和 FUSE 支持，见 [AppImage 说明](https://docs.appimage.org/user-guide/troubleshooting/fuse.html)。

## 发布前操作

在仓库根目录执行，示例版本按实际替换：

```sh
npm --prefix apps/player-launcher version 0.1.1 --no-git-tag-version
npm --prefix apps/player-launcher run check
npm run verify
```

提交后按 `dev → staging → release` 推进；实际验证登录、地图、缓存与目标平台安装。合入 release 同时启动引擎发布，也需确认引擎版本可用于本次提交。

## 缓存与重跑

| 阶段     | 规则                                                       |
| -------- | ---------------------------------------------------------- |
| 构建前   | 先检查 OSS 中的安装包，存在且来源/架构/大小/校验一致时复用 |
| 缺失产物 | 仅构建缺失平台；鉴权、网络或提交不一致直接失败             |
| 新上传   | 安装包附版本、目标、提交、大小和 SHA256 对象元数据         |
| 汇总     | 下载五个平台安装包，生成校验与构建记录，再发布 Release     |
| 失败重跑 | 同提交复用有效产物；改源码或签名时使用新版本               |

兼容无元数据的旧安装包，按下载内容生成校验，来源提交记为未知。旧 macOS 包缺少当前签名校验标记时重建。

OSS 仅保存安装包；单文件 `.sha256`、`.build.json` 和 `SHA256SUMS.txt` 在汇总阶段生成并附到 GitHub Release，不经 Actions artifact 中转。

## 配置与签名

OSS 密钥统一见[发布配置](../../../docs/release-and-version.md)。正式目录为 `box-player-launcher/player-v<版本>/`，测试目录为 `box-player-launcher-testing/<commit>/<run-id>-<attempt>/`。

| 可选 Secrets                                                                      | 用途                    |
| --------------------------------------------------------------------------------- | ----------------------- |
| `PLAYER_WINDOWS_CSC_LINK` / `PLAYER_WINDOWS_CSC_KEY_PASSWORD`                     | Windows 证书与密码      |
| `PLAYER_MACOS_CSC_LINK` / `PLAYER_MACOS_CSC_KEY_PASSWORD`                         | macOS Developer ID 证书 |
| `PLAYER_APPLE_ID` / `PLAYER_APPLE_APP_SPECIFIC_PASSWORD` / `PLAYER_APPLE_TEAM_ID` | Apple 公证              |

未配置时 Windows 保持未签名，macOS 使用完整 ad-hoc 签名；后者不代表 Developer ID 或 Apple 公证。正式面向普通用户分发时按 [Apple Developer ID](https://developer.apple.com/developer-id/) 配置身份签名。空证书变量由脚本清理，避免被 electron-builder 当成路径。

## 维护与验收

| 文件                                                | 职责                                 |
| --------------------------------------------------- | ------------------------------------ |
| `scripts/release-contract.mts`、`release-cache.mts` | 版本、文件名、元数据、校验与缓存判断 |
| `scripts/oss-client.mts`、`release.mts`             | OSS 传输和发布编排                   |
| `scripts/signing-environment.mts`                   | 签名环境归一化                       |
| `scripts/run-smoke.mts`                             | 临时 profile、超时控制与测试退出     |

构建执行类型、回归、桌面/缓存测试和最终应用架构检查。macOS 额外检查嵌套签名、执行与 DMG。日志不包含玩家 Cookie、密码或缓存资料。

首次发布检查 Windows 安装/卸载、macOS 拖入 Applications 后启动、Linux 两架构 AppImage，并试一次失败重跑。桌面与缓存测试使用独立临时目录，单次最多 120 秒。日常代码与缓存边界见[维护说明](maintenance.md)。
