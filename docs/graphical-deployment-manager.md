# BOX 图形化部署管理器

BOX 图形化部署管理器是 Creator、Play、玩家管理、登录门户和 VOXA 的统一安装与运维入口。它只负责 BOX 业务服务，不会安装 PostgreSQL 或 Redis。

## 给服主的使用方式

1. 安装并启动 Docker Desktop，保持 Linux containers 模式。
2. 解压对应系统与架构的离线包。
3. Windows 双击 `box-local-engine-manager.exe`；macOS 双击 `BOX Local Engine.app`。
4. 按需填写远程 PostgreSQL 和 Redis，也可以全部留空。
5. 点击“安装并启动”。管理器会检查已填写的远程端点、导入五个 BOX 镜像、生成随机服务密钥并启动服务。

未配置 PostgreSQL 时，Creator、Play 和 VOXA 使用本机文件数据空间，玩家管理和登录门户不启用。未配置 Redis 时使用本机缓存。后续补充 PostgreSQL 配置并保存，即可启用玩家管理与登录门户。

配置、地图、模型、备份和其他持久化数据保存在系统应用数据目录，不写入只读程序目录。升级程序或替换镜像归档不会覆盖这些数据。

## 离线包内容

离线包根目录只保留这些内容：

- 一个原生管理程序：Windows `.exe` 或 macOS `.app`；
- 一个架构匹配的五镜像归档；
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
