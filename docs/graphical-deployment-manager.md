# BOX 图形化部署管理器

BOX 图形化部署管理器是 Creator、Play、玩家管理、登录门户和 VOXA 的统一安装与运维入口。它只负责 BOX 业务服务，不会安装 PostgreSQL 或 Redis。

## 给服主的使用方式

1. 安装并启动 Docker Desktop，保持 Linux containers 模式。
2. 解压对应系统与架构的离线包。
3. Windows 双击 `box-local-engine-manager.exe`；macOS 双击 `BOX3 Engine.app`。
4. 按需填写远程 PostgreSQL 和 Redis，也可以全部留空。
5. 点击“保存配置”。管理器会检查已填写的远程端点并生成安全配置，但不会启动容器。
6. 回到“总览”，选择“全部服务”“创作端”或“游玩端”。此时才会导入需要的离线镜像并启动对应服务。

当所有已启用服务都在运行时，总览只显示“停止”，不再显示多余的“启动”。创作端会同时启动 Creator 和 VOXA；游玩端会启动 Play；配置了 PostgreSQL 时，二者会连同玩家管理和登录门户一起启动。

未配置 PostgreSQL 时仍可创作和游玩，但地图数据存储 API、玩家管理和登录门户不启用，也不会降级写入本机文件。未配置 Redis 时不启用 Redis 缓存。后续补充配置并保存，即可启用相应能力。

配置、地图、模型、备份和其他持久化数据保存在系统应用数据目录，不写入只读程序目录。升级程序或替换镜像归档不会覆盖这些数据。

## 主题与性能监控

侧栏底部可以选择“跟随系统”“亮色”或“暗色”，选择会保存在当前电脑。独立的“性能监控”页面集中展示 Creator、Play、玩家管理、登录门户和 VOXA 的运行状态、CPU、内存与进程数量，因此 Creator/Play 作品中心不再提供重复的运行状态入口。

性能数据只在打开该页面时每 5 秒批量采样一次，离开页面即停止；也可以点击“刷新”手动采样。它使用 `docker stats --no-stream` 的单次快照，不会在后台启动持续监控任务。

## 离线包内容

离线包根目录只保留这些内容：

- 一个原生管理程序：Windows `.exe` 或 macOS `.app`；
- Windows 包包含一个与 EXE 放在同一目录的架构匹配五镜像归档；macOS 包将该归档内置在 APP 内；
- `BUILD-INFO.json`、许可证、第三方依赖清单与 SHA-256 校验文件；
- 一份很短的“开始使用”说明。

PostgreSQL 和 Redis 镜像不进入离线包。两项远程服务均为选填，也不会被部署管理器安装、启动、停止或删除。管理器只检查已经填写的远程地址；未填写的服务会切换到对应的本机降级能力。

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
