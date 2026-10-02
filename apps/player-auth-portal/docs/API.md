# 从零做一个自己的 BOX3 登录门户

嗨～如果你想给自己的服务器做一张不一样的登录页，可以从这里开始。

你可以换上自己的名字、配色和 logo，也可以重新设计整个页面。玩家账号仍然由 BOX3 的 Player Service 管理，不需要再搭一套数据库。

我们准备了一份 TypeScript 模板。先让它跑起来，再一点点改成自己的样子，会比从空目录开始轻松一些。

## 一、先准备好这几样

| 需要什么 | 用来做什么 |
| --- | --- |
| Node.js 22.17 或更新版本 | 开发、检查和构建页面 |
| 登录门户模板源码 | 已有页面、账号接口和打包工具 |
| Docker | 最后把页面打成启动器可用的镜像；改页面时暂时不需要 |
| 一套 BOX3 测试环境 | 检查真实登录；这一步可以等页面做好再进行 |

只改页面时，不用先找服主要密钥。模板自带本地模拟服务，可以试登录、注册和修改密码，但不会碰真实玩家的数据。

## 二、让第一张页面跑起来

把 `REPOSITORY_URL` 换成模板仓库地址，然后运行：

```sh
git clone REPOSITORY_URL my-login
cd my-login
npm ci
npm run dev
```

打开终端显示的地址，默认是 **http://127.0.0.1:4325**。

演示账号是 `demo`，密码是 `demo-password-123`。保存源码后刷新浏览器，就能看到改动。演示账号的修改只存在内存里，重启开发服务后会恢复。

这时还没连接引擎。模拟页面能正常登录，也不代表真实环境的 Cookie、封禁和限流已经验证好了，后面还要联调一次。

## 三、把页面改成自己的样子

先看这几个文件就够了：

| 文件 | 可以改什么 |
| --- | --- |
| `src/app.tsx` | 品牌文字、页面布局、登录和账号页面 |
| `src/forms.tsx` | 密码输入框、提示、修改密码表单 |
| `src/styles/theme.css` | 主题颜色 |
| `src/styles/app.css` | 表单和页面样式 |
| `public/index.html` | 网页标题 |
| `public/` | 放自己的 logo、图片和字体 |

比如，把 logo 放到 `public/images/logo.svg`，页面里就可以使用 `/images/logo.svg`。

`public/app.js`、`public/theme.js`、`public/styles.css` 是构建生成的文件，不用直接修改。改对应的 TS/TSX 和样式源码就好。

后端在 `server/`，开发和打包工具在 `scripts/`。如果只是换外观，暂时不用动它们。每个类的职责和复用方式可以看 [README](../README.md)。

## 四、给按钮接上账号功能

### 先认识两层接口

页面请求的是登录门户的 `/api/auth/*`。门户后端再带着服务密钥，调用 Player Service 的 `/api/player-auth/*`。

```text
页面 → 登录门户 → Player Service
     ← 登录结果和 Cookie ←
```

所以，**密钥留在后端，页面里不用填，也不要写进 JS 或 TSX。**

模板已经封装好 `PortalClient`。在 `src/` 里的页面文件中，可以这样使用：

```ts
import { PortalClient } from './client'

const client = new PortalClient()
client.session().then(session => {
  if (session.player) {
    // 已经登录，可以显示昵称和账号操作。
    console.log(session.player.displayName)
  } else {
    // 还没登录，显示登录表单。
  }
})
```

各个按钮对应的方法如下，不需要自己重复写 fetch：

| 功能 | 客户端方法 | 门户接口 | 提交内容 |
| --- | --- | --- | --- |
| 登录 | `client.login(username, password)` | `POST /api/auth/login` | 用户名、密码 |
| 注册 | `client.register(username, displayName, password)` | `POST /api/auth/register` | 用户名、昵称、密码 |
| 查会话 | `client.session()` | `GET /api/auth/session` | 无正文 |
| 退出 | `client.logout()` | `POST /api/auth/logout` | 空 JSON 对象，由客户端处理 |
| 改昵称 | `client.updateNickname(displayName)` | `PATCH /api/auth/profile` | 新昵称 |
| 改密码 | `client.changePassword(currentPassword, newPassword)` | `POST /api/auth/password` | 原密码、新密码 |

### 表单要注意哪些规则？

- 用户名是 3–32 位，以字母开头，只能包含字母、数字和下划线。
- 昵称去掉首尾空白后是 1–32 位，支持中文，不允许换行。
- 新密码是 10–128 位，不要替玩家去掉密码里的空格。
- 确认密码只在页面上比较，不传给接口。
- 注册成功就会登录，不用再发一次登录请求。
- `session.player` 为 `null` 是正常的未登录状态。
- `registrationEnabled` 为 `false` 时，隐藏注册入口。后端也会拒绝注册。

输入中文时，不要每输一个字就重建输入框或修改它的值，否则容易打断输入法。

### 登录成功后去哪里？

从游玩端或创作端跳过来时，网址可能带着 `source` 和 `returnUrl`。客户端会在需要的请求中带上它们，后端只允许返回服主配置的游玩端或创作端。

在登录按钮的提交处理中，可以使用返回结果：

```ts
const result = await client.login(username, password)
if (result.returnUrl) location.assign(result.returnUrl)
```

不要直接跳到网址查询参数里的 `returnUrl`。先让后端检查，才不会被人借登录页跳到陌生网站。

### 修改密码之后呢？

```ts
const result = await client.changePassword(currentPassword, newPassword)
if (result.reloginRequired) {
  // 清空密码输入和页面中的 player，回到登录表单。
  // 提示玩家使用新密码重新登录。
}
```

修改成功会撤销账号的全部会话。模板的 `PasswordChange` 已处理这一步，可以直接复用。

原密码错了，留在表单上提示就好；登录过期了，则回到登录页。接口错误可以用 `PortalClient.message(error)` 显示。遇到 `429`，先暂停提交，不要连续自动重试。

目前没有头像接口，也没有邮箱、短信或“忘记密码”找回接口。忘记密码的玩家需要联系服主处理。

## 五、连接真实的 BOX3 测试环境

页面差不多做好后，再使用服主提供的测试配置：

```sh
cp .env.example .env
# 填写测试配置后
npm run dev:live
```

这次会操作真实账号，请用专门的测试账号试改密，不要用正式玩家账号。

主要配置有这些，启动器部署时会替你注入：

| 配置 | 是什么 |
| --- | --- |
| `BOX_PLAYER_SERVICE_INTERNAL_URL` | Player Service 地址 |
| `BOX_PLAYER_AUTH_API_KEY` | 与 Player Service 相同的服务密钥，仅后端使用 |
| `BOX_AUTH_PORTAL_PUBLIC_URL` | 登录页面对外地址 |
| `BOX_PLAY_PUBLIC_URL`、`BOX_CREATOR_PUBLIC_URL` | 允许返回的游玩端、创作端地址 |
| `BOX_PLAYER_REGISTRATION_ENABLED` | 是否开放注册 |
| `HOST`、`PORT` | 门户监听地址和端口 |

本机源码联调时，Player Service 通常是 `http://127.0.0.1:3124`。放进启动器的容器后，要用 `http://player-service:3213`；容器里的 `127.0.0.1` 指自己，不是宿主机。

门户容器监听 `0.0.0.0:3214`，宿主机默认映射到 `3125`。不要把这两个端口混起来。

如果使用 `auth.example.com`、`play.example.com`、`edit.example.com`，请让服主在 Player Service 配置共同的 Cookie 域，例如 `BOX_PLAYER_COOKIE_DOMAIN=.example.com`，以及对应的来源白名单。否则登录页登录成功了，另外两个端仍可能收不到会话。

本机测试不要混用 `localhost` 和 `127.0.0.1`。公网地址要明确填写 HTTP 或 HTTPS；填写域名不会自动生成证书。

## 六、打包，放进启动器

先检查代码，再选择目标机器的架构：

```sh
npm run check
npm run package -- --image my-login:1.0 --platform linux/arm64
```

Apple Silicon 电脑选 `linux/arm64`；常见的 Intel、AMD 电脑选 `linux/amd64`。首次构建需要下载基础镜像和依赖。

打包成功后，终端会显示归档路径。把它带到运行引擎的机器上：

```sh
docker load -i dist/my-login-1.0-linux-arm64.tar.gz
```

然后打开 **数据配置 → 访问设置 → 登录页面镜像**，填写 `my-login:1.0` 并保存。启动器只使用本机已有的镜像，不会自动从仓库拉取。

这是单个登录门户镜像，不是引擎的完整离线安装包。自定义镜像会在引擎升级后保留；想换新版时，再导入 `my-login:1.1` 并修改配置。建议每次发布换一个版本号。

默认的 `Dockerfile.standalone` 已准备好非 root 用户、只读运行和健康检查。运行镜像只有编译后的服务器与页面，不带模拟器、开发依赖或 `.env`。

## 七、如果你想自己写后端

可以先复用模板的服务器类，不必再抄一遍代理流程：

```ts
import { PortalConfig, PortalServer } from './server'

const portal = new PortalServer(PortalConfig.fromEnvironment())
portal.listen().catch(error => console.error(error.message))
// 停止时：await portal.close()
```

如果需要接进已有 Node HTTP 服务，可以调用 `portal.handle(request, response)`。静态目录不在项目根目录时，通过 `publicDirectory` 指定它。

完全自己实现时，底层接口如下。每个请求都要由后端添加 `X-Box-Player-Auth-Key`，并转发浏览器 Cookie：

| 功能 | Player Service 接口 |
| --- | --- |
| 登录 | `POST /api/player-auth/login` |
| 注册 | `POST /api/player-auth/register` |
| 查会话 | `GET /api/player-auth/session` |
| 退出 | `POST /api/player-auth/logout` |
| 改昵称 | `PATCH /api/player-auth/profile` |
| 改密码 | `POST /api/player-auth/password` |

如果昵称或改密返回 404，先确认 Player Service 是否已经更新、是否请求了正确的服务。

有几件事别漏掉：

1. 会话 Cookie `box_local_player_session` 和设备 Cookie `box_local_player_device` 都要保留。页面 JS 不读取它们。
2. 上游的多条 `Set-Cookie` 要逐条转发，不能用逗号合并。Node 22 可用 `headers.getSetCookie()`。
3. 保留上游状态码和 `Retry-After`，账号响应不缓存；不要把服务故障包装成登录成功。
4. 校验写请求来源、限制 JSON 正文大小，不提供“代理任意 URL”的接口。
5. 昵称和改密只操作当前会话，不接收用户 ID、角色、头像或权限字段。
6. 镜像监听 `0.0.0.0:3214`，提供 `GET /api/health-check` 和 Docker `HEALTHCHECK`，不要在只读应用目录写文件。

模板里的 `AuthOperation` 管字段，`AuthPolicy` 管规则，`PlayerServiceClient` 管请求，`AuthProxy` 把它们串起来。想改某一处，先找对应的类就好。

## 八、最后试一遍

发布前，至少把这些流程走一遍：

- 登录、注册、退出，关闭注册后再试一次。
- 输入中文昵称；原密码错误；两次新密码不一致。
- 修改密码成功后重新登录，确认旧会话已经失效。
- 从游玩端、创作端进入登录页，再返回原来的页面。
- 停掉 Player Service，确认页面提示服务异常，而不是“密码错误”。
- 导入镜像后在启动器里启动，确认健康检查正常。

最后看看仓库和镜像里有没有真实密钥、密码或 `.env`。如果准备把模板单独放进仓库，可以运行 `npm run export:template`；源码、锁文件和文档会一起打包，别人解压后就能继续修改。

到这里，你的登录门户就可以交给伙伴试用了。先把账号流程留稳，再慢慢打磨属于自己服务器的样子吧。
