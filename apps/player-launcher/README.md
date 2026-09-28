# BOX3 玩家启动器

独立的 Tauri 2 玩家客户端；它不会打包进 BOX3 Engine 部署管理器，也不包含 Docker、服主密钥、后台管理或服务器配置能力。

当前骨架提供：

- 本机保存玩家选择的游玩服务器；
- “添加服务器 → 选择地图 → 开始游玩”的玩家界面；
- 独立的 macOS、Windows 和 Linux Tauri 打包配置；
- 后续地图描述符、签名资源包、本地 Blob 内容库和联机启动票据的明确接入点。

## 开发

```bash
cd apps/player-launcher
npm run dev
```

## 构建

Tauri 发行包应在对应的目标操作系统/架构上构建：

```bash
npm run package:player-launcher:macos-arm64
npm run package:player-launcher:windows-amd64
npm run package:player-launcher:linux-amd64
```

玩家地图资源协议与严格资源门禁的完整设计见 [启动器本地地图包与严格资源门禁](../../docs/launcher-local-map-packs-design.md)。
