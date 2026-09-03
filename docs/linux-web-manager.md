# Linux Web 管理端

Linux Web 管理端用于没有桌面环境的服务器。它在浏览器中提供 Creator、VOXA、Play、Player Service 和参考登录门户的状态、启停、重启、日志与常用配置；内部迁移器不在管理范围内。Windows、macOS 与 Linux 桌面用户仍可继续使用 Tauri 图形化启动器。

服务器 ZIP 包含上述五个业务镜像和本管理端镜像。包内 Compose 不包含迁移器或本地 PostgreSQL/Redis 服务；账号数据库由服主提供外部 PostgreSQL，Redis 可选。

## 安装与访问

从 Release 下载与 CPU 匹配的 `BOX3-Engine-Server-<版本>-linux-<amd64|arm64>.zip`，解压后执行：

```bash
chmod +x *.sh
./install.sh
```

安装脚本会创建权限为 `0600` 的 `.env`，生成独立的 `BOX_SERVER_MANAGER_TOKEN`，导入离线镜像并只启动 Web 管理端。管理端默认绑定服务器的 `127.0.0.1:3130`，不要把 3130 端口直接开放到公网。

在自己的电脑建立 SSH 隧道：

```bash
ssh -L 3130:127.0.0.1:3130 <服务器用户>@<服务器地址>
```

随后访问 `http://127.0.0.1:3130`，使用服务器 `.env` 中的 `BOX_SERVER_MANAGER_TOKEN` 登录。先在“许可证管理”复制设备 ID，取得并安装有效许可证，再配置并启动业务服务。令牌只保存在当前浏览器标签页的 `sessionStorage`，关闭标签页后需要重新输入。

## 能做什么

- 查看五个业务服务的运行状态并自动刷新；
- 查看设备 ID、许可证状态并安装或续期许可证；
- 启动、停止或重启单个服务及全部服务；
- 查看最近 300 行容器日志；
- 修改端口、公开 URL、注册开关、只读地图库、PostgreSQL、Redis、运行时容量与 Teleport 房间参数；
- 密码和连接串只写不回显，保存后的 `.env` 保持 `0600` 权限。

修改配置后需要重启受影响服务。Web 管理端无法提交任意服务名、Compose 参数、文件路径或 shell 命令；脚本命令仍可作为管理端不可用时的恢复入口：

```bash
./status.sh
./logs.sh play
./stop.sh
```

## 安全边界

管理容器通过 `/var/run/docker.sock` 控制本机 Docker。拥有 Docker Socket 等同于拥有宿主机 root 级控制能力，因此：

- 只在可信服务器运行官方镜像；
- 保持 `BOX_SERVER_MANAGER_BIND_IP=127.0.0.1`，优先使用 SSH 隧道；
- Web 管理令牌与玩家、后台管理员、服主令牌相互独立，至少 32 个字符；
- 不把 `.env`、令牌、Docker Socket 或 3130 端口交给不受信任的人；
- 如需多用户、审计或公网运维，应在外部接入 VPN/零信任网关，而不是直接暴露本管理端。

管理容器使用只读根文件系统、`no-new-privileges`、全部 capability drop 和固定 Compose 操作，但这些措施不能降低 Docker Socket 本身的权限等级。
