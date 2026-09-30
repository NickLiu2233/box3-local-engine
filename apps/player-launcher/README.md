# BOX3 玩家启动器

独立的 Electron + Chromium 玩家客户端；它不会打包进 BOX3 Engine 部署管理器，也不包含 Docker、服主密钥、后台管理或服务器配置能力。

当前 Electron 版本已提供：

- 本机保存玩家选择的游玩服务器；
- “添加服务器 → 选择地图 → 开始游玩”的玩家界面；
- Electron 主进程通过白名单 IPC 管理服务器、玩家登录、地图签名验证和游戏窗口；
- Chromium 游戏窗口使用浏览器 Pointer Lock，静态资源继续从已校验的本地内容库读取；
- 独立的 macOS、Windows 和 Linux Electron 打包配置；
- 校验服务器签名描述符、下载断点续传并验证本地 Blob；按内容 hash 去重，删除服务器时保留仍被其他服务器引用的资源；
- 复用本机服务器列表；地图静态资源由游戏页面同源 Service Worker 写入持久 Cache Storage；
- 启动地图前通过 Service Worker 预热签名清单内的静态资源；后续启动优先从本机 Cache Storage 读取，不另建地图资源目录。

不支持离线 `.boxplay` 导入；服务器脚本、账号密码和实时游戏状态不会写入 Service Worker 缓存。

## 开发

```bash
cd apps/player-launcher
npm run dev:electron
```

## 构建

Electron 发行包建议在对应的目标操作系统上构建（尤其 Windows NSIS 和 Linux AppImage）：

```bash
npm run package:player-launcher:macos-arm64
npm run package:player-launcher:windows-amd64
npm run package:player-launcher:linux-amd64
```

资源缓存与安全边界见 [玩家启动器 Service Worker 资源缓存](../../docs/launcher-service-worker-cache.md)。Electron 是发行入口，使用 `bundle:electron`。
