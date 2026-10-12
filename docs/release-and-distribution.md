# 构建与分发

当前项目版本为 `0.3.0`。公开发行必须来自干净、已验证且版本匹配的 Git Tag。Windows 公开包需要 Authenticode；macOS 公开包需要 Apple Developer ID 签名与公证。

## 邀请阶段的交付

源码访问按[邀请协作安排](./source-access.md)进行，安装包和 CDN 下载另行管理。
现有 Tag 工作流会创建 Release 并向 OSS/CDN 发布附件；它没有因为源码邀请制自动变成私有交付。
只给受邀者提供测试包时，使用维护者确认的受控渠道，并标明版本、校验值、候选状态和签名状态。
本文描述流水线配置，不声明当前 CDN 的 latest.txt 已指向源码 0.3.0。

## 本机构建

发布前先执行：

```bash
rush verify
rush-pnpm audit --prod --audit-level critical
```

支持精简发行和携带本地镜像的开发测试两种模式，详见[启动器打包模式](launcher-package-modes.md)。本地测试示例：

```sh
rush package-desktop --target macos-arm64 --mode local
rush package-web --architecture arm64 --mode local
```

本地模式只导出已有镜像，输出包带 `-local`，不覆盖精简包。

构建完整 Linux 镜像归档：

```bash
rush package-images --architecture <amd64|arm64>
```

构建桌面包或 Linux 无桌面服务器包：

```bash
rush package-desktop --target <target> [--archive 镜像归档.tar.gz或清单.json] [--mode slim|local]
rush package-web --architecture <amd64|arm64> [--archive 镜像归档.tar.gz或清单.json] [--mode slim|local]
```

桌面目标支持 `windows-amd64`、`windows-arm64`、`macos-amd64`、`macos-arm64`、`linux-amd64` 和 `linux-arm64`。桌面包必须在目标操作系统和 CPU 架构的原生构建机生成；当前公开流水线不构建 `macos-amd64`。

精简模式不传镜像归档时，`package-desktop` 和 `package-web` 会先构建六个发行镜像，再生成安装包。传入匹配版本与架构的完整归档时会跳过镜像重建：

```bash
rush package-desktop --target macos-arm64 \
  --archive apps/local-engine/dist/images/box-local-engine-images-v0.3.0-linux-arm64.tar.gz
```

已经在本机完成六个镜像构建、只想导出归档时使用：

```bash
rush export-images
```

该命令不会拉取或重建镜像，缺少任一发行镜像时会失败。单服务归档不能交给桌面或服务器打包器。

默认输出：

| 类型           | 路径                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| 镜像归档       | `apps/local-engine/dist/images/box-local-engine-images-v<version>-linux-<arch>.tar.gz` |
| 桌面包         | `apps/local-engine/dist/desktop-installers/BOX-Local-Engine-<version>-<target>.zip`    |
| Linux 服务器包 | `apps/local-engine/dist/server-packages/BOX3-Engine-Server-<version>-linux-<arch>.zip` |

默认精简模式的桌面启动器包只包含启动器程序和单镜像清单，不内置业务镜像。Linux 服务器 ZIP 只包含脚本、配置模板和清单；安装时从 OSS 下载 Server Manager 镜像，Creator、Play、VOXA、Player Service 和参考登录门户镜像会在首次启动对应服务时按需下载。PostgreSQL、Redis 和托管 Nginx 镜像也只在用户选择启用时下载。

## 本地增量测试包

只修改后台前端或 Player Service 时，可重建单个服务，再把它加入完整镜像归档。以下命令适用于 Apple Silicon macOS 本机测试：

```bash
rush package-images --architecture arm64 --service player-service
rush export-images
BOX_ALLOW_DIRTY_RELEASE=true rush package-desktop --target macos-arm64 \
  --archive apps/local-engine/dist/images/box-local-engine-images-v0.3.0-linux-arm64.tar.gz
```

`BOX_ALLOW_DIRTY_RELEASE=true` 仅用于包含未提交修改的本地测试包。打包器重建原生启动器、嵌入镜像归档并校验清单、校验和及 macOS 应用签名完整性。生成 ZIP 不会自动替换正在运行的容器。

导出时其他服务使用本机已有的同版本镜像，不会因为重新打包启动器而自动更新源码。修改 Game Server、脚本 API 或运行协议时，应先重建 Creator / Play；修改地图导入逻辑时应重建 Play。缺少相关服务的新镜像时，测试包不能验证那些改动。完整发行仍按上面的干净 Tag 构建流程执行。

## GitHub Actions

Verify 工作流在 Pull Request 和 `main` 推送时执行：

1. 安装锁定依赖；
2. 拒绝 critical 级生产依赖漏洞；
3. 校验 Compose 模板；
4. 执行 `rush verify`。

Release 工作流只在 `v*` Tag 推送时执行。它先确认发行应用与 Rust 管理器等受版本同步管理的项目与根 `package.json` 一致、Tag 严格等于 `v<version>`，并检查 OSS Secret，然后构建发行物。Release 工作流不会重复运行完整 Verify，因此创建 Tag 前必须确认对应提交的 Verify 已通过。

手动运行 `Package BOX3 Engine Server` 时，输入与当前源码一致的版本，选择 `all` 可构建两个服务器架构。流程检查 Web 管理端及五个业务镜像：版本、源码指纹和 OSS 归档均匹配时复用缓存，否则只重建发生变化的镜像。旧清单没有源码指纹时会先重建一次。镜像归档先上传，再生成新清单与精简服务器 ZIP；开启 `publish_stable` 后发布到稳定 CDN，最后更新安装版本指针。安装器会比较包内校验清单，同版本内容有变化时也会覆盖启动器，保留原配置和数据。

当前 Release 矩阵：

- Windows x64：`windows-amd64`；
- Windows ARM64：`windows-arm64`；
- Apple Silicon macOS：`macos-arm64`；
- Linux x64：`linux-amd64`；
- Linux ARM64：`linux-arm64`；
- Linux 服务器：`amd64`、`arm64`。

镜像在原生 Linux amd64/arm64 Runner 上各构建一次，并拆分为带 SHA-256 清单的单镜像归档上传到 OSS。桌面启动器只携带清单；Linux 服务器 ZIP 也只携带清单，安装脚本根据清单下载并校验 Server Manager，其余服务在运行时按需下载。安装包本身不携带 Docker 镜像。

## OSS 与 CDN

新源码仓库也可能沿用旧 OSS 前缀。创建新仓库不代表同版本缓存目录为空；正式发行前确认新版本/Tag 与对象路径，必要时使用隔离的前缀，不能把旧缓存当成新源码产物。

仓库需要以下 GitHub Actions Secrets：

| Secret                         | 内容                                           |
| ------------------------------ | ---------------------------------------------- |
| `ALIYUN_OSS_ACCESS_KEY_ID`     | 专用 RAM 用户的 AccessKey ID                   |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 对应 AccessKey Secret                          |
| `ALIYUN_OSS_BUCKET`            | Bucket 名称，不含 `oss://` 和路径              |
| `ALIYUN_OSS_ENDPOINT`          | OSS 公网 Endpoint 域名，不含 `https://` 和路径 |

流水线使用版本子目录和稳定根目录：

| OSS 路径              | 用途                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `local-engine/<tag>/` | 镜像、桌面包和服务器包的流水线中间交换目录，例如 `local-engine/v0.3.0/` |
| `local-engine/`       | 启动器更新检测和 Linux 一键安装器的稳定 CDN 源目录                      |

正式发布流水线使用 Tag 作为版本子目录，手动服务器打包流水线使用 `v<输入版本>`，两者保持一致。修改前缀不会删除旧的 `box-local-engine/<tag>/` 对象；旧路径下的缓存不会在新路径命中，首次运行可能需要重新构建。

`local-engine/` 最终包含：

```text
install.sh
latest.txt
latest.json
BOX-Local-Engine-<version>-<platform>.zip
BOX3-Engine-Server-<version>-linux-amd64.zip
BOX3-Engine-Server-<version>-linux-arm64.zip
```

这些对象通过 `https://assets.box3.fun/local-engine/` 下载。发布顺序为：

1. 收集五个桌面包和两个服务器包；
2. 创建 GitHub Release，归档发行物；安装器的版本信息和发行包仅从 CDN 获取，CDN 失败时提示错误并停止；
3. 上传五个桌面包和两个带版本号的服务器包；
4. 上传稳定名称 `install.sh`；
5. 更新启动器的 `latest.json`，然后最后更新 `latest.txt`。

### 启动器版本检测

桌面启动器每次启动自动请求 `https://assets.box3.fun/local-engine/latest.json`；侧栏更新图标可手动重试。仅当稳定版本号高于当前启动器版本时弹出更新日志，显示版本、发布日期与变更内容，并提供 CDN 安装包下载。检测超时为 10 秒，并发检测共用请求；启动检测失败静默，手动检测失败显示提示。离线启动不受影响。Linux Web 管理页登录后读取独立的 `latest-server.json`，缺少该清单时兼容读取 `latest.json`；确认更新后替换管理器，保留配置与数据，恢复原来运行的服务并清理旧镜像。更新完成后页面自动重新加载新界面。

`latest.json` 使用 `schemaVersion: 1`，包含 `version`（三段稳定版本号）、`date`（`YYYY-MM-DD` 发布日期）、`summary` 和 `sections`（每项含 `title`、字符串数组 `items`）。日志来自 `distribution/release-notes.json`，与关于页共用，新增版本时应追加到数组顶部并保留历史版本。发布流程用 `scripts/build-release-manifest.js` 按 Tag 选取日志、检查五个安装包齐全后生成清单，在全部安装包上传后发布，并设置 `Cache-Control: no-cache`。CDN 须允许跨域 GET（`Access-Control-Allow-Origin: *`）；启动器 CSP 仅放行该资源域名。

该代码变更不会直接上传 CDN 清单。首次部署此流程前，若 CDN 尚未提供 `latest.json`，启动器将按检测失败处理。

流水线只执行复制和同名覆盖，不删除 OSS 中的其他文件，也不会删除旧版本服务器包。同名 `install.sh`、`latest.txt` 和同版本 ZIP 会被更新。

镜像与桌面包检查只判断同一 Tag 的 OSS 对象是否存在。命中后可在失败重跑时跳过耗时构建；它不校验对象来自另一个提交。因此发布后的 Tag 不得移动或复用，新的代码必须提高版本并创建新 Tag。

## 构建元数据

正式构建向镜像和发行清单注入：

- `BOX_BUILD_VERSION`：版本；
- `BOX_BUILD_COMMIT`：Git 提交；
- `BOX_BUILD_DATE`：构建时间；
- `BOX_BUILD_SOURCE`：构建来源。

Play 的“关于”页面使用这些值显示版本与提交短号。服主不应在 `.env` 或管理器中手工伪造发行元数据。

## 发布验收

公开发布前至少验证：

1. 在干净机器导入完整离线包并校验 SHA-256；
2. 初始化 PostgreSQL，并分别验证不启用、内置和外部 Redis；
3. 启动 Creator、Play、VOXA、Player Service、登录门户和管理端；
4. 验证注册、登录、权限组、CLI Token、地图发布与 `.boxplay` 导入；
5. 验证共享 Node 与独立 Docker 地图运行时、资源组、重启和销毁；
6. 验证主地图、副地图、Teleport 私有房间和空闲回收；
7. 停止并重新启动服务，确认工程、地图库、数据库和配置仍可读取；
8. 从旧版本执行升级，确认 `.env`、地图、模型、备份和数据库卷未被覆盖；
9. 执行 `node scripts/verify-desktop-offline-package.js <解压目录>` 验证桌面包。

GitHub Release 和 OSS/CDN 只能包含发行物，不能包含 `.env`、真实密钥、用户地图、模型库、数据库、备份、日志或 Docker 卷。

## 开源许可随包分发

项目代码采用 MIT。发行包继续附带 `LICENSE.txt` 与第三方声明，不能把它们作为裁剪项删除。根目录 `LICENSE.md` 与 `distribution/LICENSE.txt` 必须一致；构建时会将发行协议复制到安装包元数据，并纳入 SHA-256 清单。

Docker 镜像的 `org.opencontainers.image.licenses` 使用 `MIT`。第三方组件已有的独立许可不随该标记变更。商用、修改和再分发的具体要求见[开源许可说明](./open-source-licensing.md)。
