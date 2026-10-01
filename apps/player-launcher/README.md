# BOX3 玩家启动器

独立的 Electron + Chromium 玩家客户端；不包含 Docker、服主密钥、后台管理或服务器配置能力。

当前 Electron / TypeScript 版本已提供：

- 本机保存玩家选择的游玩服务器；
- “添加服务器 → 选择地图 → 开始游玩”的玩家界面；
- Electron 主进程通过白名单 IPC 管理服务器、玩家登录、地图签名验证和游戏窗口；
- Chromium 游戏窗口使用浏览器 Pointer Lock；HTTPS 和本机 HTTP（127.0.0.1、localhost、::1）使用已校验的 Service Worker 缓存，其他 HTTP 地址直接在线游玩；
- 独立的 macOS、Windows 和 Linux Electron 打包配置，使用启动器自己的 BOX3 图标与应用名称；
- 复用本机服务器列表；地图静态资源由游戏页面同源 Service Worker 写入持久 Cache Storage；
- 启动地图前通过 Service Worker 预热签名清单内的静态资源；后续启动优先从本机 Cache Storage 读取，不另建地图资源目录。
- 按名称、作者搜索地图；显示启动阶段，支持 Cmd/Ctrl+F 搜索和 Cmd/Ctrl+R 或 F5 重新检查服务器；
- 再次打开正在游玩的地图会返回原游戏窗口，保留当前会话；启动器和游戏窗口记住上次尺寸；
- 本机存储先列出有缓存的服务器，再进入查看每张地图的名称、资源数和大小；支持按地图清理或清理整个服务器，保留账号和服务器列表，游戏运行时不允许清理其缓存。

## 模块与接口

- `src/main.ts`：初始化与渲染协调；`src/application/`：启动器状态与会话协调。界面固定使用深色模式。
- `src/api/player-api.ts`：所有业务 HTTP 调用使用 `@box/apis` 生成的方法和返回类型。
- `shared/`：无 DOM/Electron 依赖的地址校验与 OpenAPI 接口白名单，主进程与渲染进程共用。
- `src/features/servers/`：服务器添加、选择、移除、备注与地址提示。
- `src/features/player/`：登录、退出、昵称、皮肤和账号设置。
- `src/features/maps/`：搜索、卡片、启动流程；`src/features/storage/`：本机缓存界面与操作。
- `src/views/`：外壳、服务器页面、图标与 HTML 转义；`src/platform/`：IPC 桥与键盘焦点。
- `electron/network/`：API 与封面传输；`electron/runtime/`：游戏窗口和缓存；`electron/storage/`：本机服务器与窗口偏好；`electron/security/`：地图签名校验。
- `electron/testing/` 与 `tests/`：测试夹具和检查。详见 [维护说明](./docs/maintenance.md)。

公开封面读取和本机 IPC 是资源/桌面操作，不是业务 API。封面读取只允许当前服务器的公开图片路径，不读取服务端脚本。窗口偏好与缓存管理不会保存密码。

`@box/apis` 是构建依赖，最终代码由 Vite/esbuild 打包，发行包不携带整个工作区的 node_modules。图片独立打包，HTML 不重复内联已生成的脚本和样式。Electron/Chromium 是包体的主要来源。

不支持离线 `.boxplay` 导入；服务器脚本、账号密码和实时游戏状态不会写入 Service Worker 缓存。

## 开发

```bash
cd apps/player-launcher
npm run dev:electron
```

本机检查使用 `npm run check`。构建后执行 `npm run test:desktop`，使用隔离的测试数据验证真实 Electron `file://` 页面、图片、搜索和缓存管理，不使用玩家真实账号。

## 构建

Electron 发行包建议在对应的目标操作系统上构建（尤其 Windows NSIS 和 Linux AppImage）：

```bash
npm run package:player-launcher:macos-arm64
npm run package:player-launcher:windows-amd64
npm run package:player-launcher:linux-amd64
```

资源缓存与安全边界见 [玩家启动器 Service Worker 资源缓存](../../docs/launcher-service-worker-cache.md)。Electron 是发行入口，使用 `bundle:electron`。
