# 构建与分发

当前项目版本为 `0.2.0`。公开发行必须来自干净、已验证且版本匹配的 Git Tag。Windows 公开包需要 Authenticode；macOS 公开包需要 Apple Developer ID 签名与公证。

## 本机构建

发布前先执行：

```bash
rush verify
rush-pnpm audit --prod --audit-level critical
```

构建完整 Linux 镜像归档：

```bash
rush package-images --architecture <amd64|arm64>
```

构建桌面包或 Linux 无桌面服务器包：

```bash
rush package-desktop --target <target> [--archive 镜像归档.tar.gz]
rush package-web --architecture <amd64|arm64> [--archive 镜像归档.tar.gz]
```

桌面目标支持 `windows-amd64`、`windows-arm64`、`macos-amd64`、`macos-arm64`、`linux-amd64` 和 `linux-arm64`。桌面包必须在目标操作系统和 CPU 架构的原生构建机生成；当前公开流水线不构建 `macos-amd64`。

不传镜像归档时，`package-desktop` 和 `package-web` 会先构建六个发行镜像，再生成安装包。传入匹配版本与架构的完整归档时会跳过镜像重建：

```bash
rush package-desktop --target macos-arm64 \
  --archive apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-arm64.tar.gz
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

Linux 服务器包包含 Creator、Play、VOXA、Player Service、参考登录门户和 Rust Server Manager，不包含迁移器或 PostgreSQL/Redis 镜像。选择内置数据库或 Redis 时，管理端会在用户确认后联网下载基础镜像。

## 本地增量测试包

只修改后台前端或 Player Service 时，可重建单个服务，再把它加入完整镜像归档。以下命令适用于 Apple Silicon macOS 本机测试：

```bash
rush package-images --architecture arm64 --service player-service
rush export-images
BOX_ALLOW_DIRTY_RELEASE=true rush package-desktop --target macos-arm64 \
  --archive apps/local-engine/dist/images/box-local-engine-images-v0.2.0-linux-arm64.tar.gz
```

`BOX_ALLOW_DIRTY_RELEASE=true` 仅用于包含未提交修改的本地测试包。打包器重建原生启动器、嵌入镜像归档并校验清单、校验和及 macOS 应用签名完整性。生成 ZIP 不会自动替换正在运行的容器。

导出时其他服务使用本机已有的同版本镜像，不会因为重新打包启动器而自动更新源码。修改 Game Server、脚本 API 或运行协议时，应先重建 Creator / Play；修改地图导入逻辑时应重建 Play。缺少相关服务的新镜像时，测试包不能验证那些改动。完整发行仍按上面的干净 Tag 构建流程执行。

## GitHub Actions

Verify 工作流在 Pull Request 和 `main` 推送时执行：

1. 安装锁定依赖；
2. 拒绝 critical 级生产依赖漏洞；
3. 校验 Compose 模板；
4. 执行 `rush verify`。

Release 工作流只在 `v*` Tag 推送时执行。它先确认所有项目版本与根 `package.json` 一致、Tag 严格等于 `v<version>`，并检查 OSS Secret，然后构建发行物。Release 工作流不会重复运行完整 Verify，因此创建 Tag 前必须确认对应提交的 Verify 已通过。

当前 Release 矩阵：

- Windows x64：`windows-amd64`；
- Windows ARM64：`windows-arm64`；
- Apple Silicon macOS：`macos-arm64`；
- Linux x64：`linux-amd64`；
- Linux ARM64：`linux-arm64`；
- Linux 服务器：`amd64`、`arm64`。

镜像在原生 Linux amd64/arm64 Runner 上各构建一次。桌面与服务器任务复用同一架构归档，避免重复构建 Docker 镜像。Server Manager 只在 Linux 服务器运行；桌面安装包仍携带完整镜像集合，以保持统一离线包格式。

## OSS 与 CDN

仓库需要以下 GitHub Actions Secrets：

| Secret                         | 内容                                           |
| ------------------------------ | ---------------------------------------------- |
| `ALIYUN_OSS_ACCESS_KEY_ID`     | 专用 RAM 用户的 AccessKey ID                   |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 对应 AccessKey Secret                          |
| `ALIYUN_OSS_BUCKET`            | Bucket 名称，不含 `oss://` 和路径              |
| `ALIYUN_OSS_ENDPOINT`          | OSS 公网 Endpoint 域名，不含 `https://` 和路径 |

流水线使用两个互不混淆的目录：

| OSS 路径                  | 用途                                       |
| ------------------------- | ------------------------------------------ |
| `box-local-engine/<tag>/` | 镜像、桌面包和服务器包的流水线中间交换目录 |
| `local-engine/`           | Linux 一键安装器的稳定 CDN 源目录          |

`local-engine/` 最终包含：

```text
install.sh
latest.txt
BOX3-Engine-Server-<version>-linux-amd64.zip
BOX3-Engine-Server-<version>-linux-arm64.zip
```

这些对象通过 `https://assets.box3.fun/local-engine/` 下载。发布顺序为：

1. 收集五个桌面包和两个服务器包；
2. 创建 GitHub Release，确保 CDN 失败时可回退；
3. 上传两个带版本号的服务器包；
4. 上传稳定名称 `install.sh`；
5. 最后更新 `latest.txt`。

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
