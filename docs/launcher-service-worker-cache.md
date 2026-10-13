# 玩家启动器 Service Worker 资源缓存

## 产品决策

- 只支持从已添加服务器发现地图；不做离线资源包导入。
- 地图文件不通过 `boxplay://`、文件路径或自建 HTTP 本地文件服务读取。
- 游戏静态资源使用普通同源 `/runtime/play/...` URL；浏览器 Service Worker Cache Storage 是运行时缓存层。
- 无“玩家启动器访问”或“本地资源加速”服主开关，也无对应的后台权限项。
- 仍要求玩家登录服务器；只对当前服务器实际开放游玩的地图提供启动票据。

## 启动流程

以下预热流程仅用于支持 Service Worker 的地址；非回环 HTTP 采用后文的在线回退，不等待不支持的缓存初始化。部署有路径前缀时，本文的根路径示例均加上对应服务前缀。

1. Electron 启动器验证服务器，玩家登录并发现可游玩地图。
2. 启动器读取签名地图描述符，使用服务器 bootstrap 中的公钥在本机验证签名和摘要，并取得短时启动票据；此步骤不把地图资源复制到启动器专属资源目录。
3. 游戏窗口使用每服务器独立、持久的 Chromium Session，加载服务器 `/p/<map>` 页面。
4. 页面在挂载游戏运行时之前读取签名静态资源清单，核对 key ID 和公钥，然后注册并等待同源 Service Worker 接管。
5. Service Worker 按受签名清单预取公开静态资源，校验每个 Blob 的 SHA-256/IPFS hash，并写入 Cache Storage。首轮预热完成后才启动地图运行时。
6. 游戏资源仍访问普通的 `/runtime/play/<map>/block/<hash>` 或 `/engine/m/<hash>` URL。Service Worker 命中时从 Cache Storage 响应；缺失时在线读取并回填。

启动窗口会显示缓存进度。后续同服务器、同地图版本的启动复用 Cache Storage；地图版本变化时使用新版本缓存。移除服务器会清除此服务器 Session 中的 Service Worker、Cache Storage 和会话 Cookie。

## 服务器与权限边界

在线地图发现、描述符和下载计划默认开放给已登录玩家，但地图列表仍只包含已发布且允许游玩的顶层地图。无需服主再开资源访问开关。静态资源清单只从 `runtime-blobs.json` 与已生成的安全派生资源构建，并过滤 `private-blobs.json` 中的 hash。

登录账号、密码、启动票据、WebSocket、玩家实时状态、客户端/服务端脚本、权限和私有发布控制 Blob 都不进入 Cache Storage。客户端启动仍需服务器验证玩家会话、地图版本 digest 和启动票据；本机资源缓存状态不是访问授权或反作弊依据。

Service Worker 仅处理同源、GET、内容寻址的 Play 公开资源，不拦截 API、WebSocket 或其他域名。资源签名必须匹配启动器信任的服务器公钥，缓存写入前必须完成内容 hash 验证。音频 Range 请求从已缓存完整响应中切片为标准 206 响应，非法 Range 返回 416。

## 支持条件与回退

玩家启动器在 HTTPS 或本机 loopback HTTP（127.0.0.0/8、localhost、\*.localhost、::1）服务器下启用 Service Worker 地图资源缓存。非 loopback 的 HTTP 服务器仍可登录并在线游玩，直接按需读取资源，跳过地图预下载缓存；Chromium 的普通 HTTP 缓存仍可使用。缓存能力判断统一来自 `shared/server-address.ts`，本机 HTTP 不需要 HTTPS。

“本机存储”按服务器统计 Service Worker Cache Storage 与 Chromium 页面缓存的磁盘占用。清理资源时保留 Cookie 和服务器列表；游戏运行期间拒绝清理该服务器的缓存。再次点击正在游玩的地图直接聚焦现有游戏窗口。

首次启动需要联网下载静态资源；后续缓存命中不代表游戏可以离线登录或脱离服务器运行。缓存缺失或损坏时需在线重新获取并验证；验证失败时应阻止进入地图并展示可读错误。
