# 玩家启动器维护说明

## 依赖方向

渲染入口 `src/main.ts` 组装 application、api、features、views 和 platform。功能目录负责用户事件及自己的页面片段；application 协调服务器会话与状态。业务请求集中在 `src/api/player-api.ts`，页面不直接拼接 API URL。

Electron 入口 `electron/main.ts` 负责 app/window 生命周期与 IPC 分发；network、runtime、storage、security 实现具体操作。这些模块不依赖页面 DOM。`shared/` 只放两个进程共用的纯逻辑。跨进程的公开业务数据类型来自 `@box/apis` 的 `components`，本机 UI 状态放在 `src/types.ts`。

## 修改功能的位置

| 要修改什么           | 入口                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 新增或调整 HTTP 接口 | `internals/apis/openapi/openapi.json` 的生成源和 `internals/apis/scripts/`，重新生成 `@box/apis`；然后调整 `src/api/player-api.ts` |
| 玩家允许调用的接口   | `shared/api-policy.ts`；路径和 HTTP 方法从生成的 `apiOperations` 引用                                                              |
| 新增桌面本地能力     | 对应 Electron 模块，然后在 `electron/main.ts` 注册 IPC 命令；HTTP 接口与本机操作分开                                               |
| 服务器列表和输入     | `src/features/servers/` 与 `electron/storage/server-store.ts`                                                                      |
| 登录、退出和账号设置 | `src/features/player/`；每个服务器会话独立，不保存密码                                                                             |
| 地图搜索和启动       | `src/features/maps/`；游戏窗口在 `electron/runtime/game-window-manager.ts`                                                         |
| 缓存显示和清理       | `src/features/storage/` 与 `electron/runtime/resource-cache.ts`                                                                    |
| 整体排版与通用组件   | `src/views/`、`src/styles.css`                                                                                                     |

## 检查与打包

在启动器目录执行 `npm run check` 验证类型、单元测试与构建。OpenAPI 有改动时在 `internals/apis` 执行 `npm run build` 和 `npm run check:openapi`。构建后执行 `npm run test:desktop`，用隔离的 profile 和固定 API 响应验证实际 Electron 页面。

桌面测试支持 `BOX_LAUNCHER_SMOKE_ROOT` 指向最终应用的 `Contents/Resources/app.asar`，检查打包后图片、预加载脚本和页面是否完整。测试脚本与测试夹具不进入发行包。

所有业务 API 通过生成客户端调用；封面是受限的公开资源读取；服务器列表、窗口偏好、缓存统计是本机 IPC。不要为地图资源添加第二套本地文件协议或离线导入入口。

发行时保留 `dist/` 和两个主进程入口 `dist-electron/main.cjs`、`preload.cjs`。Vite/esbuild 已打包运行所需代码，所以 `@box/apis` 是开发依赖；不要将整个工作区 node_modules、测试或源码加入发行包。更改打包方式后须再次验证最终 `.app`，尤其 `file://` 下的图片和模块加载。

`electron/build/after-pack.ts` 在生成的应用里去掉 Electron 演示页，并维持英语/简体中文的语言策略。打包钩子本身不进入应用，也不删除 Chromium 运行库或玩家资源。

## 缓存统计口径

每个服务器使用启动器独立的 Chromium Session。`electron/runtime/map-cache.ts` 从 Chromium CacheStorage 读取 `box-play-static:<永久地图ID>:<版本>` 缓存，按响应体实际字节数统计每张地图；空缓存不展示。页面、字体等普通 HTTP 缓存不分配给某张地图，使用 `Session.getCacheSize()` 汇总到本机存储首页的独立浏览器缓存区域。`resource-cache.ts` 保留缓存目录文件大小统计（含索引开销）用于诊断。以上都不是下载流量或系统 Chrome 浏览器缓存。

本机存储采用服务器列表与地图详情两级页面，进入页面、清理后、游戏关闭时自动更新，不提供“重新统计”按钮；重复点击已选中入口保持当前页面。无地图资源的服务器隐藏，地图资源清空后自动移除对应条目。清理一张或整个服务器的地图缓存只删除其 CacheStorage 版本缓存，保留 Cookie 和 HTTP 缓存；浏览器缓存的独立按钮仅清理所有已添加服务器 Session 的 HTTP 缓存，不删除地图缓存。

收藏、最近游玩与 Play 网页端共用 `/api/play-library`，通过 `@box/apis` 的 GET/PATCH 方法和当前服务器玩家 Cookie 读写。地图记录使用 `publicId`，按当前玩家身份保存；收藏发送明确的 `favorite` 值，成功启动后异步记录 `played`，同步失败不阻止游戏启动。登录、切换分类和回到启动器时读取服务器记录。错误会显示在对应分类中，不回退到另一套本地收藏。

受保护的玩家接口返回 401 时，`features/player/session.ts` 统一切换当前服务器到登录表单，清除旧账号的地图/收藏/搜索及资料编辑状态，保留账号名并清空密码，在表单内显示过期提示。登录接口的 401 仍表示账号或密码错误；服务故障不触发退出。API 客户端为每次登录/退出更新请求代次，旧请求迟到的 401 不会使新登录失效。

`electron/storage/map-labels.ts` 仅为缓存管理维护永久地图 ID 到公开名称的索引。历史版本留下的本地收藏和最近记录保留在原文件内，但不用于界面，也不自动导入玩家账号。有效地图列表决定可见作品，服务器已下线的地图不会因收藏或最近记录重新出现。

底层整合清理 helper `clearResourceCache` 调用 `clearStorageData` 删除 serviceworkers/cachestorage，再调用 `clearCache` 清 HTTP 缓存并保留 Cookie；它与界面上的独立地图/浏览器清理操作不同。HTTPS 和本机 HTTP（127.0.0.1、localhost、::1）进入地图资源预热流程；其他 HTTP 地址随游玩按需请求资源，不显示预下载进度。判断规则集中在 `shared/server-address.ts`。

`npm run test:cache` 在临时 profile 中用真实 loopback HTTP 页面注册 Service Worker、缓存公开测试资源，检查磁盘统计非零，并验证清理后两类缓存为零且 Cookie 保留；不读取或清理玩家的真实缓存。

## 请求等待与排查

普通 API 的完整请求期限为 15 秒，登录为 30 秒；期限覆盖收到响应头以及读取响应体，登录请求不自动重试。`api-transport.ts` 的 `onTiming` 只记录地址来源、无查询串的接口路径、HTTP 方法、耗时、状态和结果类型。主进程将最近 100 次记录写入用户数据目录的 `network-diagnostics.json`，不包含用户名、密码、请求/响应正文、Cookie 或启动票据。

客户端等待超时、服务器返回的 504、服务未启动和连接断开分别显示对应提示。收到通用连接反馈时先检查实际接口、响应耗时及状态，不能仅因服务器在本机就排除服务启动、数据库等待或连接中断的问题。
