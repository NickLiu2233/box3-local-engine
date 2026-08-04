# BOX 浏览器界面

`apps/game` 是 Box Local Engine 的浏览器界面实现。它同时为创作端和游玩端提供页面，
但两种构建包含的能力不同。

## 创作端

```bash
pnpm creator
```

创作端包含：

- 作品管理页 `/projects`
- 编辑页 `/e/<project-id>`
- 本地预览页 `/p/<project-id>`
- 本地工程导入、导出和发布接口

创作端应在创作者自己的电脑或可信内网使用。它没有面向公网的身份验证，不能作为玩家
网站直接发布。

## 游玩端

```bash
pnpm play
```

游玩端是专门生成的 play-only 构建。构建期间会将编辑入口、管理员实现和管理员界面
替换为轻量适配器，不复制 Monaco 编辑器资源，也不提供本地项目管理接口。

`pnpm play` 会生成 play-only 构建，避免把完整创作构建误当成游玩端启动。反过来，
创作端也会拒绝使用 play-only 产物。

玩家只需访问部署者给出的游玩地址。游戏会连接同一套游玩部署内部的只读运行时，请求
游客会话、建立 WebSocket 并读取 `/block/:hash` 资源。

## Docker

```bash
pnpm creator
pnpm play
pnpm stop
```

具体作品由作品管理器导出的部署包绑定版本并启动。

游玩镜像只应复制 Next standalone 运行产物及实际运行依赖，不应包含：

- `apps/game/src` TypeScript 源码
- 编辑器和 Monaco
- 本地创作工程
- 可编辑工程导出包
- `.env`、证书、私钥和 Source Map

## 同源入口

创作端与游玩端对外都只监听 `3000`。Next 会把编辑、会话、地图资源和 WebSocket 转发到
仅监听本机的内部运行时。浏览器始终使用页面当前域名，不需要单独填写运行时地址。

完整说明：

- [项目 README](../../README.md)
- [部署与联机指南](../../docs/deployment.md)
