# 独立玩家启动器发布

## 标签与版本

安装包发布只由推送 `player-v<版本号>` 标签触发，例如 `player-v0.1.0`、`player-v0.2.0-beta.1`。
标签版本必须与 `apps/player-launcher/package.json` 的 `version` 一致。它不依赖根目录或引擎版本，`sync-root-version.js` 不会修改玩家启动器版本。

发行安装包只通过玩家标签流水线生成，与 main/PR 检查隔离。
`.github/workflows/player-launcher-release.yml` 独立生成以下五个安装包：

| 目标          | 原生 runner      | 文件                                               |
| ------------- | ---------------- | -------------------------------------------------- |
| Windows AMD64 | windows-2022     | `BOX3-Player-Launcher-<版本>-windows-amd64.exe`    |
| Windows ARM64 | windows-11-arm   | `BOX3-Player-Launcher-<版本>-windows-arm64.exe`    |
| macOS ARM64   | macos-14         | `BOX3-Player-Launcher-<版本>-macos-arm64.dmg`      |
| Linux AMD64   | ubuntu-22.04     | `BOX3-Player-Launcher-<版本>-linux-amd64.AppImage` |
| Linux ARM64   | ubuntu-22.04-arm | `BOX3-Player-Launcher-<版本>-linux-arm64.AppImage` |

Linux 使用 AppImage，应用执行文件名为 `box3-player-launcher`。CI 安装 Electron/FUSE 运行依赖，并用 Xvfb 验证桌面交互和真实 Service Worker 缓存；打包后的测试也在 Xvfb 中执行。应用保持原有 sandbox 配置。

玩家 Release 设置 `make_latest: false`，不会覆盖引擎使用的 GitHub `releases/latest` 入口。预发布标签自动标记为 prerelease。

## OSS 与 Release

复用引擎 `release.yml` 已配置的 GitHub Secrets：

- `ALIYUN_OSS_BUCKET`：仅 Bucket 名称。
- `ALIYUN_OSS_ENDPOINT`：不带协议或路径的 OSS Endpoint。
- `ALIYUN_OSS_ACCESS_KEY_ID`
- `ALIYUN_OSS_ACCESS_KEY_SECRET`

产物存储在独立目录 `oss://<Bucket>/box-player-launcher/<player-v标签>/`，不与引擎的 `box-local-engine/` 目录混用。
使用 AWS CLI 的 OSS S3 兼容接口，与引擎流水线 Windows 步骤相同；固定 virtual-hosted 寻址，凭据只通过子进程环境传递。

安装包上传/下载使用高阶 `s3 cp`，超过 16 MiB 分块传输，分块大小 16 MiB，并发 4。输出实际字节/速率进度，并每 15 秒报告状态。连接超时 20 秒、读取超时 60 秒，整个传输最多 10 分钟；HEAD 最多 90 秒。上传后还会核对 OSS 对象大小和 SHA256 元数据，只有核对成功才报告完成。上传步骤另设 12 分钟上限。参见 [AWS CLI S3 配置](https://docs.aws.amazon.com/cli/latest/topic/s3-config.html)。

发布顺序：

1. 检查玩家标签、版本和 OSS 配置。
2. 每个平台在安装 Rush/Electron 依赖前检查 OSS 中的安装包。
3. 安装包已存在则复用；新上传对象自带版本/目标/提交/大小/SHA256 元数据，检查这些值一致后跳过依赖安装和构建。兼容前一次流程已上传、尚无对象元数据的安装包，不要求额外 JSON 或 SHA256 文件存在。
   macOS 例外：旧流程的包留下了失效签名。缺少当前签名校验版本标记的 macOS 对象会重新构建，Windows/Linux 缓存不受影响。
4. 缺失的安装包才重新构建；鉴权失败、网络失败或新对象的标签/提交不一致时直接报错。
5. 构建执行类型检查、回归测试、桌面与真实缓存测试；打包后检查应用二进制架构，并验证 app.asar 内的界面和资源。macOS 额外检查应用的完整嵌套签名、实际 Mach-O 执行、DMG 校验，以及从最终 DMG 只读挂载后验证应用签名。
6. OSS 只上传安装包，并在同一次上传中设置对象元数据；不上传独立 `.sha256`、`.json`、总校验文件或发布说明。
7. 汇总 job 从 OSS 下载五个目标的安装包，核对对象元数据中的大小和 SHA256，在本地生成校验文件及构建记录，然后创建/更新当前玩家标签的 GitHub Release。旧对象没有元数据时按实际下载内容生成 SHA256，并将记录中的来源提交标为未知。

GitHub Release 包含安装包、单文件 `.sha256`、`.build.json` 和 `SHA256SUMS.txt`。GitHub Actions artifact 服务不参与产物传递。

同一个发布标签对应同一个提交。需要修改源码、签名或版本时发布新标签，不移动已有标签。失败后可重跑工作流，已经完整上传的平台会被复用。
本机旧版本收藏/最近记录不会写入安装包，用户密码、账号 Cookie、地图资源缓存和网络诊断也不参与发行打包。

## 代码签名（可选配置）

Windows 未配置证书时保持未签名行为。macOS 未配置证书时使用完整的 ad-hoc 签名：在文件裁剪、应用改名等打包操作完成后，重新签署应用与嵌套组件，并关闭该预览签名的 hardened runtime/public notarization。这样可以修复失效的资源封印，但不代表通过 Apple 身份认证或公证。

下载后的应用仍受 Gatekeeper 检查。对普通玩家正式分发，需要 Developer ID Application 签名和 Apple 公证；本地 ad-hoc 签名不能替代这两者。参见 [Apple Developer ID 说明](https://developer.apple.com/developer-id/)。

| Secrets                                                                           | 用途                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------- |
| `PLAYER_WINDOWS_CSC_LINK` / `PLAYER_WINDOWS_CSC_KEY_PASSWORD`                     | Windows 签名证书及密码，传给 electron-builder |
| `PLAYER_MACOS_CSC_LINK` / `PLAYER_MACOS_CSC_KEY_PASSWORD`                         | macOS Developer ID 证书及密码                 |
| `PLAYER_APPLE_ID` / `PLAYER_APPLE_APP_SPECIFIC_PASSWORD` / `PLAYER_APPLE_TEAM_ID` | macOS 公证凭据                                |

这些可选值只传给构建步骤，不影响 OSS 缓存和普通 PR 检查。流水线不会自动申请证书。

发布脚本会清除未配置的空证书变量：electron-builder 将空 `CSC_LINK` 解释为当前目录而不是“未签名”，因此不能直接把空 Secrets 传给子进程。有效证书及其密码会保留；不提供证书时关闭自动证书发现。

## 发布操作

在仓库根目录更新启动器自己的版本、提交代码后打标签：

首次使用时，先将本次新增的工作流和发布脚本一并提交。下面的命令示例用于之后的版本升级。

```bash
npm --prefix apps/player-launcher version 0.1.1 --no-git-tag-version
git add apps/player-launcher/package.json
git commit -m "chore(player): release 0.1.1"
git tag player-v0.1.1
git push origin main
git push origin player-v0.1.1
```

以上版本号仅作操作示例。推送前运行 `npm --prefix apps/player-launcher run check` 和桌面/缓存测试。
查看 Actions 中 `Release BOX3 Player Launcher`，五个原生目标成功后，安装包会同时存在于 OSS 版本目录和当前标签的 Release。

## 发布代码职责

- `scripts/release-contract.mts`：标签/版本、文件名、元数据、SHA256 与应用架构校验。
- `scripts/release-cache.mts`：判断 OSS 是否有可复用的完整产物。
- `scripts/oss-client.mts`：跨平台 OSS 传输、错误分类与凭据隔离。
- `scripts/release.mts`：validate/probe/build/upload/download 命令编排。
- `scripts/signing-environment.mts`：可选签名环境变量的归一化。

脚本使用 Node 22 的 `--experimental-strip-types` 执行 TypeScript，因此 OSS 预检查不需要先安装项目依赖。测试随 `npm run check` 执行。

Electron 桌面与缓存冒烟测试通过 `scripts/run-smoke.mts` 启动。每次使用独立临时用户目录，断言完成后测试 Electron 明确退出，父进程确认退出后再清理文件；不在 `will-quit` 中删除仍被 Chromium 锁定的文件。单次冒烟测试最多 120 秒，超时会终止该测试进程及其子进程并返回失败。CI 测试步骤另有 6 分钟上限。

## 首次公开发布前

优先完成 Windows 两种架构的实际安装、启动和卸载验证，以及 macOS 拖入 Applications 后的启动验证。重点检查图标与名称、登录过期后重新登录、地图封面/音频、鼠标锁定，以及缓存清理后的再次游玩。
Linux 两种架构需要验证下载后的 AppImage 可执行权限与启动；下载后可运行 `chmod +x BOX3-Player-Launcher-<版本>-linux-<架构>.AppImage`，再打开文件。FUSE 依赖问题可参考 [AppImage 官方说明](https://docs.appimage.org/user-guide/troubleshooting/fuse.html)。
正式分发建议配置代码签名，并用新发布标签验证一次 OSS 上传、失败后重跑复用缓存和 GitHub Release 附件。
自动更新、导出脱敏诊断适合下一版本；当前版本已经具备基础游玩和缓存管理流程。

参考：[GitHub 原生 runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)、[OSS S3 兼容接口](https://help.aliyun.com/en/oss/developer-reference/compatibility-with-amazon-s3)、[electron-builder NSIS](https://www.electron.build/v26/docs/nsis/)。
