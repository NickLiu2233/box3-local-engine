# BOX3 玩家启动器

独立的 Electron + Chromium 玩家客户端；不包含 Docker、服主密钥、后台管理或服务器配置能力。

当前 Electron / TypeScript 版本已提供：

- 本机保存玩家选择的游玩服务器，重启后自动检查上次服务器的登录态；有效时直接进入地图列表。
- 玩家会话按服务器地址隔离，使用系统加密存储，不保存密码；退出登录、移除服务器或服务端返回会话失效时清除。Linux 没有可用安全密钥存储时只保留内存会话，不降级成明文。
- 快速切换服务器时，旧请求不会覆盖新页面；同一服务器的较旧请求也不能覆盖新一轮加载。
- “添加服务器 → 选择地图 → 开始游玩”的玩家界面；
- Electron 主进程通过白名单 IPC 管理服务器、玩家登录、地图签名验证和游戏窗口；
- Chromium 游戏窗口使用浏览器 Pointer Lock；HTTPS 和本机 HTTP（127.0.0.1、localhost、::1）使用已校验的 Service Worker 缓存，其他 HTTP 地址直接在线游玩；
- 独立的 macOS、Windows 和 Linux Electron 打包配置，使用启动器自己的 BOX3 图标与应用名称；
- 复用本机服务器列表；地图静态资源由游戏页面同源 Service Worker 写入持久 Cache Storage；
- 启动地图前通过 Service Worker 预热签名清单内的静态资源；后续启动优先从本机 Cache Storage 读取，不另建地图资源目录。
- 按名称、作者搜索地图；显示启动阶段，支持 Cmd/Ctrl+F 搜索和 Cmd/Ctrl+R 或 F5 重新检查服务器；
- 登录表单在请求中与失败后保留输入，支持临时显示密码；草稿只在内存中，登录成功、切换服务器或离开登录页后清除。
- 再次打开正在游玩的地图会返回原游戏窗口，保留当前会话；启动器和游戏窗口记住上次尺寸；
- 本机存储先列出有缓存的服务器，再进入查看每张地图的名称、资源数和大小；支持按地图清理或清理整个服务器，保留账号和服务器列表，游戏运行时不允许清理其缓存。
- 浏览器缓存在本机存储首页独立汇总和清理，不出现在服务器或地图详情；清浏览器缓存不删地图缓存，清地图缓存也不删浏览器缓存。重复点击当前导航入口不刷新。

## 模块与接口

- `src/main.ts`：初始化与渲染协调；`src/application/`：启动器状态与会话协调。界面固定使用深色模式。
- `src/api/player-api.ts`：所有业务 HTTP 调用使用 `@box/apis` 生成的方法和返回类型。
- `shared/`：无 DOM/Electron 依赖的地址校验与 OpenAPI 接口白名单，主进程与渲染进程共用。
- `src/features/servers/`：服务器添加、选择、移除、备注与地址提示。
- `src/features/player/`：登录、退出、昵称、皮肤和账号设置。
- `src/features/maps/`：搜索、卡片、启动流程；`src/features/storage/`：本机缓存界面与操作。
- `src/views/`：外壳、服务器页面、图标与 HTML 转义；`src/platform/`：IPC 桥与键盘焦点。
- `electron/network/`：API 与封面传输；`electron/runtime/`：游戏窗口和缓存；`electron/storage/`：本机服务器与窗口偏好；`electron/security/`：地图签名校验。
- `electron/application/commands.ts`：集中处理桌面命令；主进程入口保留窗口生命周期、Cookie 同步和 IPC 来源校验。
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
统一格式与清单排序在根目录执行 `npm run format:owned:check`，规则见[自有代码风格](../../docs/code-style.md)。内网 IPv4 省略协议默认 HTTP，显式协议与路径保留；隐藏菜单仍支持编辑快捷键。桌面回归包含资料保存后的按钮恢复和弹窗关闭。

## 构建

Electron 发行包建议在对应的目标操作系统上构建（尤其 Windows NSIS 和 Linux AppImage）：

```bash
npm run package:player-launcher:macos-arm64
npm run package:player-launcher:windows-amd64
npm run package:player-launcher:windows-arm64
npm run package:player-launcher:linux-amd64
npm run package:player-launcher:linux-arm64
```

资源缓存与安全边界见 [玩家启动器 Service Worker 资源缓存](../../docs/launcher-service-worker-cache.md)。Electron 是发行入口，使用 `bundle:electron`。

## 独立发布

推送 `player-v<版本>` 标签时，独立流水线生成 Windows AMD64、Windows ARM64、macOS ARM64、Linux AMD64 和 Linux ARM64 安装包；Linux 采用 AppImage。先检查 OSS 中同版本产物，缺失的再构建，并上传到 OSS 与 GitHub Release。
版本取本目录 `package.json`，不与引擎版本同步。OSS 只保存安装包，校验文件在本地生成并附到 GitHub Release。配置与操作见 [发布说明](./docs/release.md)。
