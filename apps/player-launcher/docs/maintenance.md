# 玩家启动器维护说明

## 依赖方向

渲染入口 `src/main.ts` 组装 application、api、features、views 和 platform。功能目录负责用户事件及自己的页面片段；application 协调服务器会话与状态。业务请求集中在 `src/api/player-api.ts`，页面不直接拼接 API URL。

Electron 入口 `electron/main.ts` 负责 app/window 生命周期与 IPC 分发；network、runtime、storage、security 实现具体操作。这些模块不依赖页面 DOM。`shared/` 只放两个进程共用的纯逻辑。跨进程的公开业务数据类型来自 `@box/apis` 的 `components`，本机 UI 状态放在 `src/types.ts`。

## 修改功能的位置

| 要修改什么 | 入口 |
| --- | --- |
| 新增或调整 HTTP 接口 | `internals/apis/openapi/openapi.json` 的生成源和 `internals/apis/scripts/`，重新生成 `@box/apis`；然后调整 `src/api/player-api.ts` |
| 玩家允许调用的接口 | `shared/api-policy.ts`；路径和 HTTP 方法从生成的 `apiOperations` 引用 |
| 新增桌面本地能力 | 对应 Electron 模块，然后在 `electron/main.ts` 注册 IPC 命令；HTTP 接口与本机操作分开 |
| 服务器列表和输入 | `src/features/servers/` 与 `electron/storage/server-store.ts` |
| 登录、退出和账号设置 | `src/features/player/`；每个服务器会话独立，不保存密码 |
| 地图搜索和启动 | `src/features/maps/`；游戏窗口在 `electron/runtime/game-window-manager.ts` |
| 缓存显示和清理 | `src/features/storage/` 与 `electron/runtime/resource-cache.ts` |
| 整体排版与通用组件 | `src/views/`、`src/styles.css` |

## 检查与打包

在启动器目录执行 `npm run check` 验证类型、单元测试与构建。OpenAPI 有改动时在 `internals/apis` 执行 `npm run build` 和 `npm run check:openapi`。构建后执行 `npm run test:desktop`，用隔离的 profile 和固定 API 响应验证实际 Electron 页面。

桌面测试支持 `BOX_LAUNCHER_SMOKE_ROOT` 指向最终应用的 `Contents/Resources/app.asar`，检查打包后图片、预加载脚本和页面是否完整。测试脚本与测试夹具不进入发行包。

所有业务 API 通过生成客户端调用；封面是受限的公开资源读取；服务器列表、窗口偏好、缓存统计是本机 IPC。不要为地图资源添加第二套本地文件协议或离线导入入口。

发行时保留 `dist/` 和两个主进程入口 `dist-electron/main.cjs`、`preload.cjs`。Vite/esbuild 已打包运行所需代码，所以 `@box/apis` 是开发依赖；不要将整个工作区 node_modules、测试或源码加入发行包。更改打包方式后须再次验证最终 `.app`，尤其 `file://` 下的图片和模块加载。

`electron/build/after-pack.ts` 在生成的应用里去掉 Electron 演示页，并维持英语/简体中文的语言策略。打包钩子本身不进入应用，也不删除 Chromium 运行库或玩家资源。

## 缓存统计口径

每个服务器使用启动器独立的 Chromium Session。`electron/runtime/map-cache.ts` 从 Chromium CacheStorage 读取 `box-play-static:<永久地图ID>:<版本>` 缓存，按响应体实际字节数统计每张地图；空缓存不展示。页面、字体等普通 HTTP 缓存不强行分配给某张地图，继续使用 `Session.getCacheSize()` 在服务器详情中单独展示。`resource-cache.ts` 保留缓存目录文件大小统计（含索引开销）用于诊断。以上都不是下载流量或系统 Chrome 浏览器缓存。

本机存储采用服务器列表与地图详情两级页面，进入页面、清理后、游戏关闭时自动更新，不提供“重新统计”按钮。无地图资源且无浏览器缓存的服务器隐藏，地图资源清空后自动移除对应条目。只清理一张地图时删除其 CacheStorage 版本缓存，不影响其他地图、Cookie 和普通浏览器缓存；“清理全部缓存”才会清整个服务器的缓存。

`electron/storage/map-labels.ts` 仅保存公开地图 ID 与名称，便于离线显示；API 地图列表仍统一来自 `@box/apis`，所有资源仍保存在 Chromium CacheStorage。旧缓存尚无名称记录时，读取服务器地图列表或再次启动该地图后会补上名称。

清理调用 `clearStorageData` 删除 serviceworkers/cachestorage，再调用 `clearCache` 清普通 HTTP 缓存，保留 Cookie。HTTPS 和本机 HTTP（127.0.0.1、localhost、::1）进入地图资源预热流程；其他 HTTP 地址随游玩按需请求资源，不显示预下载进度。判断规则集中在 `shared/server-address.ts`，显示文案在 `src/features/storage/copy.ts`。

`npm run test:cache` 在临时 profile 中用真实 loopback HTTP 页面注册 Service Worker、缓存公开测试资源，检查磁盘统计非零，并验证清理后两类缓存为零且 Cookie 保留；不读取或清理玩家的真实缓存。
