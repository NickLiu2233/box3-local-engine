# BOX3 玩家启动器

独立的 Electron + Chromium 玩家客户端；它不会打包进 BOX3 Engine 部署管理器，也不包含 Docker、服主密钥、后台管理或服务器配置能力。

当前 Electron 版本已提供：

- 本机保存玩家选择的游玩服务器；
- “添加服务器 → 选择地图 → 开始游玩”的玩家界面；
- Electron 主进程通过白名单 IPC 管理服务器、登录 API、地图包存储和受限本地资源协议；
- Chromium 游戏窗口使用浏览器 Pointer Lock，静态资源继续从已校验的本地内容库读取；
- 独立的 macOS、Windows 和 Linux Electron 打包配置；
- 校验服务器签名描述符、下载断点续传并验证本地 Blob；按内容 hash 去重，删除服务器时保留仍被其他服务器引用的资源；
- 复用本机历史服务器列表与地图包数据；
- 只向当前游戏窗口开放清单内必需资源，Range 音频读取通过 Electron `boxplay://` 协议提供。

离线 `.boxplay` 导入仍按产品决定暂不实现；服务器脚本、账号密码和实时游戏状态不会进入地图包。

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

玩家地图资源协议与严格资源门禁的设计见 [启动器本地地图包与严格资源门禁](../../docs/launcher-local-map-packs-design.md)。Electron 迁移期间的 Tauri 配置保留作回归对照；发行入口以 `bundle:electron` 为准。
