# 构建与分发

当前 `0.1.1` 为发布候选版本。公开分发前需要 Windows Authenticode 签名，以及 Apple Developer ID 签名和 macOS 公证。

## 发布流程

```bash
pnpm verify
pnpm audit --prod --audit-level=high
pnpm package:images <amd64|arm64>
pnpm package:desktop <target> [镜像归档.tar.gz]
pnpm package:web <amd64|arm64> [镜像归档.tar.gz]
```

`package:desktop` 和 `package:web` 会先顺序构建 Creator、Play、VOXA、玩家服务、登录门户和 Linux Web 管理端，并通过 `docker image save` 导出当前 `package.json` 版本对应的完整镜像归档，再生成目标发行包。桌面命令的目标格式为 `windows-amd64`、`windows-arm64`、`macos-amd64`、`macos-arm64`、`linux-amd64` 或 `linux-arm64`；Web 命令的架构为 `amd64` 或 `arm64`。开发时可附加服务名执行 `pnpm package:images arm64 player-service`，只构建并导出单个镜像；桌面包必须在目标系统和 CPU 架构的原生构建机生成。

如果镜像已经由本机的构建命令生成、只需要交给启动器导入，不要再次构建。使用根目录命令 `pnpm export:images` 将当前版本的六个本地服务镜像打包为 `.tar.gz`；它会在缺少任一镜像时明确失败，绝不会偷偷拉取或重建。启动器必须导入完整归档，不能以单个服务镜像归档替代：

```bash
pnpm export:images
```

输出使用启动器的规范名称：`apps/local-engine/dist/images/box-local-engine-images-v<version>-linux-<arch>.tar.gz`。命令默认查找同名的启动器镜像标签；只有在明确设置 `BOX_IMAGE_TAG` 时才会覆盖。这个归档可直接交给 `pnpm package:desktop`，由桌面发行流程生成与归档 SHA-256 绑定的 `BOX-OFFLINE-IMAGE.json`。

默认输出位置：

- 镜像归档：`apps/local-engine/dist/images/box-local-engine-images-v<version>-linux-<arch>.tar.gz`
- macOS 桌面包：`apps/local-engine/dist/desktop-installers/BOX-Local-Engine-<version>-macos-arm64.zip`
- Linux Web 包：`apps/local-engine/dist/server-packages/BOX3-Engine-Server-<version>-linux-<arch>.zip`
- Linux 一键安装入口：Release 附件 `install.sh`

Apple Silicon 本地构建：

```bash
pnpm package:desktop macos-arm64
```

已有匹配版本和架构的镜像归档时，可以跳过镜像重建：

```bash
pnpm package:desktop macos-arm64 \
  apps/local-engine/dist/images/box-local-engine-images-v0.1.1-linux-arm64.tar.gz
```

解压后启动器位于 `BOX-Local-Engine-<version>-macos-arm64/BOX3 Engine Launcher.app`。VOXA standalone 输出不是桌面 App。

公开发行只能从干净工作区的 `v*` Tag 构建。Tag CI 会运行验证，并构建 Windows x64、Apple Silicon macOS、Linux x64 桌面包，以及 Linux amd64/arm64 服务器包和镜像归档。发布任务还会把 `distribution/server/bootstrap.sh` 作为固定名称 `install.sh` 上传，因此 `releases/latest/download/install.sh` 始终指向当前发行版本的一键安装入口。CI 必须同时注入本节的 `BOX_BUILD_*` 构建元数据。不得把本机测试包、未提交改动构建或使用 `BOX_ALLOW_DIRTY_RELEASE=true` 构建的包上传到公开 Release。

桌面离线包包含启动器与所需镜像；Linux 无图形包包含 Creator、VOXA、Play、Player Service、登录门户和 Rust Web 管理端，不包含迁移器。Web 管理端可以按需拉取并维护内置 PostgreSQL/Redis，也可以连接服主提供的外部服务；两种内置基础服务镜像不包含在离线归档中。Release 不得包含 `.env`、地图、项目、备份、数据库卷、日志或真实密钥。

发布前应在干净环境解压完整包，导入镜像并完成以下验收：

1. 执行生产依赖审计；存在 high 或 critical 漏洞时不得发布，除非已完成风险评估和缓解。
2. 初始化 PostgreSQL；分别验证不启用、内置和外部 Redis 配置。
3. 启动 Creator、Play、VOXA、Player Service 和登录门户；完成注册开关、登录、创作者权限和地图进入验证。
4. 在启动器的“工程运行时”页确认 Creator/Play 状态、主地图/副地图分组，以及空闲运行时的 CPU、内存和回收行为。
5. 停止并再次启动服务，确认工程、地图库、数据库和配置仍可读取。
6. 校验离线包 SHA-256，并执行 `node scripts/verify-desktop-offline-package.js <解压目录>`。

升级测试还应确认旧 `box-play-storage` 不再被引用，新的 `box-play-runtime-cache` 可以重建。

## 版本与签名

同一离线包中的 App、镜像归档和清单必须来自同一构建。GitHub Release 只上传发行物和校验信息，不上传用户数据。Windows 公开分发使用 Authenticode；macOS 使用 Developer ID 签名和公证，否则系统可能提示未知开发者或阻止启动。

发行 CI 应在镜像中写入 `BOX_BUILD_VERSION`、`BOX_BUILD_COMMIT`、`BOX_BUILD_DATE` 和 `BOX_BUILD_SOURCE`。Play 游戏内“关于”使用这些值显示 `版本-local · 提交短号`；缺少有效提交号时只显示版本。发布前核对 App、镜像归档和该显示信息均来自同一个 Tag 构建。
