# BOX 图形化部署管理器

BOX 图形化部署管理器是 Creator、Play、玩家管理、登录门户和 VOXA 的统一安装与运维入口。它只负责 BOX 业务服务，不会安装 PostgreSQL 或 Redis。

## 给服主的使用方式

1. 安装并启动 Docker Desktop，保持 Linux containers 模式。
2. 解压对应系统与架构的离线包。
3. Windows 双击 `box-local-engine-manager.exe`；macOS 双击 `BOX3 Engine.app`。
4. 填写远程 PostgreSQL（必填）；Redis 可留空。
5. 点击“保存配置”。管理器会检查 PostgreSQL 和已填写的 Redis 端点并生成安全配置，但不会启动容器。
6. 回到“总览”，选择“全部服务”“创作端”或“游玩端”。此时才会导入需要的离线镜像并启动对应服务。

当所有已启用服务都在运行时，总览只显示“停止”，不再显示多余的“启动”。创作端会同时启动 Creator、VOXA、玩家管理和登录门户；游玩端会启动 Play、玩家管理和登录门户。

PostgreSQL 是启动器的必填配置，用于玩家、权限和地图脚本数据；未填写或连接不可达时，管理器会拒绝保存和启动。Redis 仍是可选缓存；未配置时不启用 Redis 缓存。

“服主与安全”中的三项服主密钥在首次保存配置时自动生成，无需手动填写。需要接入外部 API 或排障时，可点击“查看密钥”仅在本机当前页面显示；切换页面或点击“隐藏密钥”会清除显示内容，请勿截图、转发或提交到仓库。

配置、地图、模型、备份和其他持久化数据保存在系统应用数据目录，不写入只读程序目录。升级程序或替换镜像归档不会覆盖这些数据。

## 主题与性能监控

侧栏底部可以选择“跟随系统”“亮色”或“暗色”，选择会保存在当前电脑。独立的“性能监控”页面集中展示 Creator、Play、玩家管理、登录门户和 VOXA 的运行状态、CPU、内存与进程数量，因此 Creator/Play 作品中心不再提供重复的运行状态入口。

性能数据只在打开该页面时每 5 秒批量采样一次，离开页面即停止；也可以点击“刷新”手动采样。它使用 `docker stats --no-stream` 的单次快照，不会在后台启动持续监控任务。

## 离线包内容

macOS 离线包解压后只显示一个 `BOX3 Engine.app`，可直接拖入“应用程序”。镜像、完整性清单、构建信息、许可证和第三方清单均封装在 APP 内部；启动器会在导入镜像前自动校验 SHA-256、镜像标签和 CPU 架构。

Windows 为避免把数 GB 的镜像嵌入 EXE，仍需保持 `.exe`、架构匹配的五服务镜像归档和 `BOX-OFFLINE-IMAGE.json` 在同一目录。许可证、构建信息和校验文件随包保留，但不影响日常使用。

PostgreSQL 和 Redis 镜像不进入离线包，也不会被部署管理器安装、启动、停止或删除。服主必须提供可访问的远程 PostgreSQL；Redis 可不填，管理器会使用本地缓存回退能力。

## 构建离线包

Windows AMD64 示例：

```powershell
pnpm build:desktop-installer windows-amd64 C:\release\box-local-engine-images-0.1.0-windows-amd64.tar.gz
```

Apple Silicon macOS 示例：

```bash
pnpm build:desktop-installer macos-arm64 /release/box-local-engine-images-0.1.0-macos-arm64.tar.gz
```

原生桌面程序必须在对应系统和 CPU 架构的构建机生成。最终 ZIP 位于 `apps/local-engine/dist/desktop-installers/`。

正式打包要求 Git 工作区没有未提交修改，构建信息会记录提交号和构建时间。开发验证时才可显式设置 `BOX_ALLOW_DIRTY_RELEASE=true`。

公开发布前还应使用发行证书签名：Windows 使用 Authenticode；macOS 使用 Apple Developer ID 签名并完成 notarization。签名必须在镜像归档内置到 APP、且所有包内文件都已生成之后执行。

维护者的完整打包、离线分发、CI Tag 触发、签名和 Release 检查流程见[桌面启动器打包、分发与 CI 发布手册](./release-and-distribution.md)。
