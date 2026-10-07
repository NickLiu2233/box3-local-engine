# BOX3 登录门户 TypeScript 示例

一个可以独立 clone、修改、构建的登录门户。**少量文件，按职责组织类，不另建账号体系。**

前端与工具使用 TypeScript/TSX；生产后端编译为一个 Node.js 文件，不携带 TypeScript、tsx、前端开发工具或运行时 node_modules。public 的 JS/CSS、build 的 CJS/类型声明是自动生成产物，不手工维护。

## 快速开始

Node.js 22.17 或更新版本：

```sh
npm ci
npm run dev
```

访问终端显示的地址，默认 http://127.0.0.1:4325。演示账号 `demo`，密码 `demo-password-123`。不需要 Docker、数据库、引擎或真实密钥。保存源码后自动重建，刷新页面；后端变化由 Node watch 重启。

模拟数据只存在于内存，使用专用 Cookie 名，不覆盖同主机的引擎会话。它不模拟真实设备绑定、封禁、限流、数据库和审计。真实联调必须主动运行 `npm run dev:live`，并使用服主提供的测试配置；默认 dev 不会自动连接真实账号服务。

## 代码结构：改页面无需读全部后端

```text
src/
  app.tsx             PortalApp：页面状态、登录/账号视图
  forms.tsx           密码输入、提示、提交状态、PasswordChange
  client.ts           PortalClient：六种账号调用、PortalError
  theme.ts            Theme：只保存主题偏好
  main.tsx            浏览器启动入口
  theme-main.ts       首次绘制前设置主题
  styles/app.css      页面、表单、响应式样式
  styles/theme.css    主题变量
server/
  config.ts           PortalConfig：运行时配置、可信网络与导航规则
  auth.ts             AuthOperation / AuthPolicy / PlayerServiceClient / AuthProxy
  http.ts             HttpError / Http / JsonBody / StaticFiles
  portal.ts           PortalServer：组合路由、生命周期
  index.ts            对外类与类型导出
  main.ts             生产启动入口
scripts/
  tasks.ts            构建、开发、打包、源码导出各自的类与 CLI
  mock.ts             MockPlayerService：仅开发/测试
  ui-smoke.ts         可选浏览器交互回归
test/*.test.ts        类型检查和 HTTP/安全回归
docs/API.md           可独立阅读的完整接口与部署契约
public/               HTML、品牌资源及自动构建产物
```

通常只改 app.tsx、forms.tsx、styles 和 public/index.html。图片与字体放 public；当前静态服务允许常见图片、js/css、woff/woff2，不开放隐藏文件或任意文件下载。默认是单页状态，不提供 HTML history 子路由回退。

## 类如何合作，为什么不是把函数塞进 class

| 类 | 持有的数据 | 主要职责/方法 |
| --- | --- | --- |
| PortalConfig | 外部地址、开关、私有 Key | fromEnvironment 校验；可信协议/IP；安全回跳。Key 不被 JSON 序列化 |
| AuthOperation | 操作名、方法、字段白名单 | payload 只提取允许字段，自助请求拒绝额外身份字段 |
| AuthPolicy | 当前配置 | validate 分别检查方法、注册与来源；decorate 补充安全导航和注册策略 |
| PlayerServiceClient | 上游配置 | headers、responseHeaders、response、failure、send，统一网络与响应处理 |
| AuthProxy | policy、client、JsonBody | handle 仅协调操作，不堆叠请求和安全细节 |
| JsonBody | 字节上限 | requireJson、bytes、parse、read，各自处理请求限制 |
| StaticFiles | public 目录、MIME 白名单 | asset、file、headers、serve，分别检查类型和真实路径 |
| PortalServer | 代理、静态服务、HTTP server | handle、listen、close；既可独立启动也可接入已有服务器 |
| PortalClient | 浏览器导航参数 | login/register/session/logout/updateNickname/changePassword，共用带超时的请求方法 |
| PortalApp / PasswordChange | 页面状态、提交状态 | 明确状态切换，错误留表单，改密/过期回登录 |

相关类放在同一文件，不为每个小方法单独建目录。每个类拥有实际职责，不额外引入服务容器、ORM、路由框架或空的转发层。测试辅助函数只是组织断言，不是应用业务逻辑。

工具同样分工：Project 管目录/版本/命令错误；PortalBuilder 管构建与检查；PortalDevelopment 管 watcher/模拟器生命周期；ImagePackager 管镜像参数、构建、架构验证、归档；TemplateExporter 管源码白名单。PortalTasks 仅分发 CLI 命令。

## 其他开发者如何复用

浏览器只复用客户端，不导入服务端密钥：

```ts
import { PortalClient } from './src/client'
const client = new PortalClient()
const state = await client.session()
// 每个调用是一个独立操作，不要顺序执行所有写请求。
await client.updateNickname('新的昵称')
```

服务端直接使用类，无需复制代理实现：

```ts
import { PortalConfig, PortalServer } from './server'
const config = PortalConfig.fromEnvironment()
const portal = new PortalServer(config)
await portal.listen()
// 停止时 await portal.close()
```

build 后也可从 build/library.cjs 加载相同类，类型声明位于 build/types/server/index.d.ts。生产入口为 build/server.cjs。把 `portal.handle(request, response)` 接入已有 Node HTTP 服务也可以；若工作目录不是本项目根目录，在 PortalOptions 中明确设置 publicDirectory。

新增业务优先增加操作定义与明确的方法，不添加可代理任意路径的接口。详细参数与安全约束见 [docs/API.md](docs/API.md)。

## 必须保留的安全规则

- 账号体系与密码哈希由 Player Service 管，门户不连接数据库、不生成会话。
- 服务 Key 只在运行时后端使用，不写入镜像、页面、URL、日志或配置响应。
- 固定六个账号路径；注册关闭时后端也拒绝，不能只隐藏按钮。
- JSON 正文最大 32 KiB，方法与字段白名单明确；昵称/改密不接受用户 ID、角色、头像或权限。
- 写请求校验实际 Origin，只有可信代理模式才采用转发头。
- Cookie 全部转发，Set-Cookie 逐条处理，不能逗号合并；Retry-After 和状态码保留。
- 回跳按 URL.origin 白名单判断，不能直接信任 query.returnUrl。
- 密码不持久化；防重复提交；改密成功撤销会话后必须重新登录。
- 只服务 public，检查符号链接真实路径，不开放 .env、源码或目录越界。
- 无凭据重置密码、头像上传、OAuth/短信/邮件验证不是当前接口的能力。

## 命令

| 命令 | 作用 |
| --- | --- |
| npm run dev | 无配置模拟预览 |
| npm run dev:live | 真实测试环境联调，需 .env 或环境配置 |
| npm run typecheck | 严格检查源代码、工具和测试 |
| npm test | TS 接口与安全测试，不要求浏览器工具 |
| npm run build | 前端与 Node 后端编译、生成类的类型声明 |
| npm run check | 严格类型检查、生产构建、全部测试 |
| npm start | 运行编译后的生产入口，无配置拒绝启动，不启动模拟器 |
| npm run package | 检查、构建 Docker 镜像、验证平台并导出 tar.gz |
| npm run export:template | 导出可放入独立仓库的 TS 源码模板 |

首次安装需要网络，普通开发不需要 Docker。打包需要 Docker 和首次拉取基础镜像/npm 依赖的网络，不声称首次构建全离线。

可选浏览器回归：`npm run test:ui -- --electron <已有的 Electron 可执行文件路径>`。脚本先编译 ui-smoke.ts 再验证表单交互；默认不安装 Electron，日常开发与 check 不依赖它。

## 打包后导入启动器

```sh
npm run package -- --image my-login:1.0 --platform linux/arm64
# AMD64：--platform linux/amd64
docker load -i dist/my-login-1.0-linux-arm64.tar.gz
```

进入 **数据配置 → 访问设置 → 登录页面镜像**，填写 my-login:1.0 后保存。地址、Key、注册开关等由启动器注入，不需开发者打包进程序。

默认镜像名 box3-login-example:0.2.0，刻意不同于官方名称。自定义镜像不会随引擎自动升级；缺失时报错，不自动拉取或回退。建议发布新 tag，不用同一个 tag 同时分发两个平台。归档已有同名文件时拒绝覆盖，需要明确 --force；Docker 构建本身会更新指定的本机 tag。

导出的归档是单个登录镜像，不是引擎完整六服务离线包。

## Docker 与运行配置

- Dockerfile.standalone：独立仓库构建，运行镜像只有编译后的服务器与 public，非 root、0.0.0.0:3214、只读根目录可用，带 HEALTHCHECK。
- Dockerfile：引擎仓库官方集成，不检查许可证；独立仓库请使用 Dockerfile.standalone。
- 模拟器、源码、tsx、TypeScript、开发依赖和 .env 都不进入运行镜像。
- 健康接口只检查门户自身，避免上游故障导致重启循环。

标准配置优先，兼容 AUTH_DEMO_*：HOST/PORT、BOX_PLAYER_SERVICE_INTERNAL_URL、BOX_PLAYER_AUTH_API_KEY、BOX_AUTH_PORTAL_PUBLIC_URL、BOX_CREATOR_PUBLIC_URL、BOX_PLAY_PUBLIC_URL、BOX_PLAYER_REGISTRATION_ENABLED。

容器内部上游通常为 http://player-service:3213，不能硬编码宿主机 127.0.0.1:3124。真实联调可复制 .env.example，填写服主提供的测试配置后运行 dev:live。跨子域 Cookie、TLS、Origin 与回跳属于部署配置，见 API.md。

## 独立仓库发布

```sh
npm run check
npm run export:template
```

解压 dist/box3-login-template-0.2.0.tar.gz 后把内容放到新仓库根目录即可。它包含 TS 源码、npm 锁文件、测试、独立 Dockerfile 和完整文档，不带 node_modules、build、.env、引擎源码或工作区软链接。

发布前必须做真实设备/Cookie/封禁/限流联调，模拟器不能替代真实服务验证。模板许可由仓库维护者明确；当前 UNLICENSED 不代表 MIT 或授权分发引擎源码。
