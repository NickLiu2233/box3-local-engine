# 桌面启动器打包、分发与 CI 发布手册

本文面向仓库维护者和发布协作者，说明 BOX3 Engine 图形化启动器的交付物、构建边界、校验方式和 CI 触发规则。

服主如何使用已发布的软件，请看[图形化部署管理器](./graphical-deployment-manager.md)；服务器仅使用 Docker Compose 时，请看[安装、部署与使用手册](./installation-and-operations.md)。

## 1. 发布物与支持范围

桌面启动器负责导入 BOX 业务镜像、保存服主配置，并启动 Creator、Play、VOXA、玩家管理和登录门户。它**不会**安装 PostgreSQL 或 Redis；两者都是服主可选的远程服务。

每个桌面离线包由下列内容构成：

| 内容                                      | 用途                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| Windows `.exe` 或 macOS `.app`            | 图形化部署管理器本体                                    |
| 五服务 Docker 镜像归档                    | Creator、Play、VOXA、Player Service、Player Auth Portal |
| `BOX-OFFLINE-IMAGE.json`                  | 镜像归档名称、镜像标签、Linux 架构和 SHA-256            |
| `BUILD-INFO.json`                         | 版本、源提交、构建时间和构建来源                        |
| `LICENSE.txt`、`THIRD-PARTY-NOTICES.json` | 许可证与第三方依赖说明                                  |
| `SHA256SUMS`                              | 包内文件校验清单                                        |

Windows 包要求 `.exe`、镜像归档和 `BOX-OFFLINE-IMAGE.json` 始终处于同一目录。macOS 解压目录只包含 `.app`；镜像归档、清单、许可证、构建信息与校验文件均嵌入 APP 的 Resources 目录，因此可把 APP 单独移入“应用程序”目录。

当前 CI 只发布三种面向普通用户的原生桌面目标：

| 发布目标        | 构建机              | Docker 镜像架构 |
| --------------- | ------------------- | --------------- |
| `windows-amd64` | Windows x64         | `linux/amd64`   |
| `macos-arm64`   | Apple Silicon macOS | `linux/arm64`   |
| `linux-amd64`   | Linux x64           | `linux/amd64`   |

业务服务始终以 Linux 容器运行，桌面系统不改变 Docker 镜像。因此一次发行只会在 CI 内部生成两份五服务镜像归档：`linux/amd64` 和 `linux/arm64`。三个桌面启动器各自携带对应 CPU 架构的那一份归档；不会为 Windows、macOS、Linux 重复构建相同镜像，也不会把 `.tar.gz` 额外显示在 GitHub Release 附件中。

Windows ARM、Intel macOS、Linux ARM64 并非当前默认发行目标。如确有需要，维护者仍可在对应原生设备上用 `pnpm build:desktop-installer` 手动构建，不应把这些实验性包混入普通用户下载列表。

无图形界面的 Linux 服务器通常使用 Compose 离线包/镜像归档直接部署，不依赖桌面 GUI；Linux 桌面包用于需要图形化部署管理器的 Linux 工作站。

## 2. 构建前条件

正式发行只允许从干净工作区构建：

```bash
git status --short
pnpm verify
```

第一条必须没有输出；第二条必须成功。`pnpm verify` 包含格式、lint、类型检查、项目/地图组/传送/迁移器回归、Windows 安装器检查和桌面启动器检查。

构建机还必须具备：

- 与目标匹配的原生操作系统与 CPU 架构；
- Docker Desktop 或 Docker Engine，且能运行目标 Linux 架构镜像；
- Node.js 与 pnpm（以仓库 `.node-version` 和 `packageManager` 为准）；
- macOS 发行时的 Xcode Command Line Tools；Windows 发行时的 Rust/MSVC 工具链。

`BOX_ALLOW_DIRTY_RELEASE=true` 只用于本地验证。它会把 `BUILD-INFO.json` 标记为 `local-dirty`，构建器也会明确警告；这种包不得上传 Release 或分发给用户。

## 3. 构建顺序

### 3.1 先生成同版本、同架构的五服务镜像归档

离线安装器不自行构建镜像；它只把已验证的镜像归档封装进桌面包。镜像归档按 **Linux CPU 架构** 生成，而不是按桌面操作系统重复生成：

```text
box-local-engine-images-<版本>-linux-<amd64|arm64>.tar.gz
```

归档内必须包含且仅使用同一个镜像标签的五个应用镜像：

```text
box-local-engine-creator:<标签>
box-local-engine-play:<标签>
box-local-engine-voxa:<标签>
box-local-engine-player-service:<标签>
box-local-engine-player-auth-portal:<标签>
```

镜像标签必须与归档内五项服务一致，例如 `v0.1.0-linux-arm64`。离线归档名称、归档内五项镜像 tag、`BOX-OFFLINE-IMAGE.json` 的 `imageTag`、以及启动器编译时的 `BOX_MANAGER_IMAGE_TAG` 必须完全一致。启动器会读取归档内的真实镜像标签；Windows on ARM、macOS Apple Silicon 和 Linux ARM64 都可以使用同一份 `linux-arm64` 业务镜像归档。不要把 PostgreSQL、Redis、开发镜像、数据库数据卷、`.env`、密钥或任何用户地图打进归档。

构建归档后，应在干净 Docker 环境中执行 `docker load -i`，并确认五个镜像均能被 `docker image inspect` 找到、架构为目标 `linux/amd64` 或 `linux/arm64`。

### 3.2 构建桌面离线包

在**对应原生构建机**执行：

```bash
pnpm build:desktop-installer <目标> <五服务镜像归档.tar.gz>
```

示例：

```powershell
pnpm build:desktop-installer windows-amd64 C:\release\box-local-engine-images-v0.1.0-linux-amd64.tar.gz
```

```bash
pnpm build:desktop-installer macos-arm64 /release/box-local-engine-images-v0.1.0-linux-arm64.tar.gz
```

构建器会：

1. 拒绝脏工作区的正式构建；
2. 编译原生 Tauri 程序；
3. 写入镜像 SHA-256 与架构清单；
4. 生成构建信息、许可证、第三方清单和包内校验文件；
5. 在压缩前执行离线包完整性校验；
6. 输出 ZIP 与 ZIP 的 SHA-256。

输出目录为 `apps/local-engine/dist/desktop-installers/`。不要重新压缩、改名镜像归档或单独替换 APP/EXE，否则启动器会拒绝加载不匹配的镜像。

### 3.3 发布前独立复核

对每个解压后的包执行：

```bash
node scripts/verify-desktop-offline-package.js \
  apps/local-engine/dist/desktop-installers/BOX-Local-Engine-<版本>-<目标>
```

该命令会检查包级 SHA-256、元信息、许可证和镜像归档 SHA-256。构建完成后还应执行：

- Windows：解压到一个没有源码的新目录，启动 EXE，确认首次导入镜像与保存配置正常；
- macOS：在一台没有源码的新账户或虚拟机中启动 APP，确认离线镜像可导入；
- 两个平台：分别验证“仅游玩端”“创作端（含 VOXA）”“全部服务”的启动/停止；
- 对外地址：验证 Play/玩家服务可按配置公开，而 Creator 与 VOXA 只接受本机或私网地址；
- 升级：用旧包创建数据后安装新包，确认 `.env`、`.runtime.env`、项目和备份不会丢失。

## 4. 签名、公证与发布安全

构建成功不等于可以公开分发。

- Windows 正式包必须使用组织的 Authenticode 证书签名，并在干净 Windows 主机上验证 SmartScreen 与签名链；
- macOS 正式包必须使用 Apple Developer ID 签名、启用 Hardened Runtime、完成 notarization 并 stapler；
- 签名必须发生在 APP/EXE、镜像归档、元信息和 ZIP 都生成完成之后；任何后续改包都会使签名或 SHA 失效；
- 发行私钥、Apple ID/应用专用密码、Windows 代码签名证书只能放在 CI Secret 或受控签名机，绝不能放在仓库、`.env`、离线包或构建日志中。

可以在 macOS 复核时开启强制签名检查：

```bash
BOX_DESKTOP_REQUIRE_SIGNING=true node scripts/verify-desktop-offline-package.js <解压后的包目录>
```

该开关会拒绝 ad-hoc 签名和没有 Team Identifier 的 APP。

## 5. CI 触发与职责

当前仓库的 `.github/workflows/verify.yml` 会在以下场景触发：

- 所有 Pull Request；
- 推送到 `main`。

它执行依赖安装、生产依赖 critical 漏洞检查、Compose 模板校验和 `pnpm verify`。此工作流是合并前门禁，不发布任何二进制文件。

当前仓库已启用 `.github/workflows/release.yml`。向远端推送 `v*` Tag 会触发校验、镜像、桌面包和 GitHub Release 工作流：

| 触发                       | 用途                                       | 创建 GitHub Release |
| -------------------------- | ------------------------------------------ | ------------------- |
| Pull Request / `main` push | 源码、依赖、Compose 与回归验证             | 否                  |
| 推送标签 `v*`              | 校验、构建镜像、构建桌面 ZIP、创建 Release | 是                  |

发布 Tag 应与根 `package.json` 版本一致，例如版本为 `0.1.0` 时使用 `v0.1.0`：

```bash
git status --short
pnpm verify
git tag -a v0.1.0 -m "BOX3 Engine v0.1.0"
git push origin v0.1.0
```

工作流先在原生 Linux x64 与 Linux ARM64 Runner 上各构建一次五项服务镜像；每项架构只生成一份对应的离线归档。每个服务按顺序构建，归档后清理 BuildKit 中间层，避免导出大镜像时耗尽 Docker 磁盘。随后对应原生 Runner 使用匹配 CPU 架构的归档构建 Windows、macOS 和 Linux 桌面包。安装器从归档读取实际 Docker tag，并在构建前验证文件存在。该契约由 `scripts/check-release-workflow.js` 保护。

它依赖 `windows-2022`、`windows-11-arm`、`macos-13`、`macos-14`、`ubuntu-22.04` 与 `ubuntu-24.04-arm` Runner 可用；仓库所在组织若没有某个 Runner 的访问权限，对应矩阵任务会失败，Release 也不会发布。

当前工作流**不包含** Windows Authenticode 签名、macOS Developer ID 签名或 notarization。它产出的自动 Release 适用于内部测试或明确标注为未签名的分发；公开正式发行前必须先补充签名和公证步骤，不能把“Tag 构建成功”等同于“可公开正式发布”。

当前 Tag 工作流顺序：

```text
vX.Y.Z tag
  → pnpm verify
  → 原生 Linux x64 / ARM64 Runner 分别顺序构建五服务镜像，并生成两个 CPU 架构归档
  → 各原生 Runner 构建三个桌面 ZIP
  → verify-desktop-offline-package
  → GitHub Release 上传三个 ZIP
```

正式公开发行时，在上述流程后补充：签名 / macOS 公证 → 下载后复核 SHA-256 → 发布签名与校验说明。

Release job 只会使用 Tag 对应提交进行构建。上传前需确认工作流中的 `pnpm verify` 已成功，并检查 Release 产物没有 `source=local-dirty` 标记。

## 6. GitHub Release 附件约定

当前 Tag 工作流会上传：

```text
BOX-Local-Engine-<版本>-windows-amd64.zip
BOX-Local-Engine-<版本>-macos-arm64.zip
BOX-Local-Engine-<版本>-linux-amd64.zip
```

普通用户只需按系统下载一个 ZIP：Windows 下载 `windows-amd64.zip`，搭载 Apple 芯片的 Mac 下载 `macos-arm64.zip`，x64 Linux 下载 `linux-amd64.zip`。每个桌面 ZIP 已包含相应镜像归档，无需再下载 `.tar.gz`。

Release 说明中应写明：版本号、提交号、支持的系统/CPU、Docker 前置条件、升级注意事项、已知限制、下载文件的 SHA-256、是否已签名，以及 Creator/VOXA 不支持公网暴露的安全边界。

不要上传：Docker Desktop 安装包、PostgreSQL/Redis、用户 `.env`、用户项目、`play-worlds`、VOXA 数据、备份、日志、Docker 卷或任何真实密钥。

## 7. 协作者检查清单

- [ ] 工作区干净，Tag 指向已审查的提交。
- [ ] `pnpm verify` 通过。
- [ ] 每种 CPU 架构的五服务镜像都通过导入与 inspect。
- [ ] 每个 ZIP 通过 `verify-desktop-offline-package.js`。
- [ ] 若为公开正式发行：Windows Authenticode 与 macOS Developer ID/notarization 已完成。
- [ ] SHA-256 已发布且从下载后的文件重新计算过。
- [ ] 在没有源码、没有既有 Docker 镜像的干净机器上完成启动 smoke test。
- [ ] Release 不含用户数据、密钥或内部构建凭据。

## 8. 发生问题时

| 现象                   | 先检查什么                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| 启动器拒绝导入镜像     | `BOX-OFFLINE-IMAGE.json`、镜像归档 SHA-256、镜像标签和 CPU 架构是否来自同一构建                         |
| Windows 找不到离线镜像 | EXE、`.tar.gz` 与清单是否仍在同一目录                                                                   |
| macOS 无法打开         | Developer ID 签名、公证状态、Gatekeeper 提示；不要让用户关闭系统安全策略作为常规方案                    |
| 保存配置失败           | Docker 是否已启动、数据目录是否可写、端口是否重复；Windows 请使用最新启动器以处理已有 `.env` 的安全替换 |
| Tag 没有发布包         | 检查 Tag 是否匹配 `v*`、对应原生 Runner 是否可用，以及前置 `verify`、镜像或桌面矩阵任务是否失败         |
