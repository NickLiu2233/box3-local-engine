# BOX3 自定义登录门户示例模板

这是可以单独复制到 Git 仓库、clone 后直接修改的登录门户示例。前端使用 React + Radix，后端只依赖 Node.js 内置模块。它复用 BOX3 Player Service 的账号，不另建数据库，不让浏览器持有服务密钥。

推荐工作流：**clone → npm ci → npm run dev → 改页面 → npm run package → docker load → 启动器选择镜像**。

## 1. 三分钟开始修改

要求 Node.js 22.17 或更高版本。开发页面不需要 Docker、不需要引擎运行、不需要密钥或数据库：

```sh
npm ci
npm run dev
```

打开终端显示的地址，默认是 http://127.0.0.1:4325。

- 演示账号：`demo`，密码：`demo-password-123`。
- 保存 JS/JSX/CSS 后自动重新构建，刷新浏览器看效果；修改后端时 Node 自动重启。
- 模拟注册、登录、昵称接口、改密与退出可用；所有演示数据只在内存里，进程重启即重置。
- 开发 Cookie 使用专用名称，不覆盖同主机上真实引擎的登录 Cookie。
- 模拟器不模拟完整的设备绑定、封禁、限流、数据库和审计；上线前仍要做真实联调。
- 默认 dev 即使发现已有 .env 也不会切换为真实账号服务，必须主动使用 dev:live。
- 端口冲突时用环境变量 `PORTAL_DEV_PORT` 换端口。

生产镜像不包含模拟器，也不能因为没有配置而降级到演示账号。

## 2. 改哪里，不改哪里

```text
src/
  main.jsx                 浏览器入口
  app.jsx                  loading/auth/account/password 页面状态协调
  api/
    client.js              同源请求、错误信息与超时
    navigation.js          读取导航参数，不决定授权
  pages/
    auth-forms.jsx         登录/注册表单
    authentication.jsx    登录/注册提交与页签
    account.jsx           已登录账号页
  components/
    brand.jsx             品牌名称与标记：从这里开始改
    theme-button.jsx      主题偏好
    forms.jsx             密码输入、提示、提交状态
    password-change.jsx   原密码/新密码/确认与重新登录
  styles/
    theme.css             主题颜色变量
    layout.css            布局与品牌
    forms.css             表单、焦点、提示、禁用状态
    account.css           账号布局、响应式与减少动画
    index.css             样式聚合入口
public/
  index.html               HTML 壳，可改标题
  theme.js                 首次绘制前设置主题，避免闪白
  app.js / styles.css      构建产物，不直接修改
  images/、fonts/          可自行增加，安全静态服务会提供
server/
  config.js                运行时环境配置与校验
  create-server.js         HTTP 路由组装
  auth/operations.js       固定六个账号操作，不是通用代理
  auth/proxy.js            账号代理与 Cookie/状态/限流头转发
  security/request.js      来源、外部协议、可信客户端 IP
  security/navigation.js   安全回跳白名单
  http/body.js             JSON 类型和大小限制
  http/response.js         no-store JSON 响应
  http/assets.js           public 内资源与防越界检查
server.js                   生产启动入口及测试兼容导出
scripts/                    开发、检查、构建、镜像与源码导出
test/                       真实 HTTP 测试、安全与模板检查
docs/API.md                 完整接口/部署契约，可独立交给其他 AI
```

只改外观通常只需要动 src、public/index.html 和 public 的品牌资源。默认保留所有账号流程和安全模块，不必学习引擎源码、Rush、Tauri 或 Docker Compose。

图片和字体放 public，使用同源 URL，例如 `/images/logo.svg`；默认允许 JS/CSS、常见图片、woff/woff2。隐藏文件、未知扩展名、目录遍历和越界符号链接被拒绝。当前没有 HTML history 子路由回退，保持单页面状态或使用 hash 路由。

## 3. 为什么这样设计

| 设计 | 为什么 |
| --- | --- |
| 页面与账号代理分开 | 改品牌不会误改密钥、Cookie、注册策略或权限流程 |
| 一个固定代理流程 | 六个接口共用来源、超时、Cookie 和错误处理，避免某个接口漏安全检查 |
| 后端只用 Node 内置模块 | 无数据库、ORM、服务端框架或运行时 node_modules，镜像轻、可读、容易维护 |
| React + Radix 保留现有实现 | 不换开发者需要重新学习的框架，保留键盘、页签与表单行为 |
| 单个本地 JS/CSS 产物 | 不依赖 CDN；没有动态资源服务器或前端开发工具链运行在生产 |
| 模拟开发必须显式区分真实联调 | clone 即可改样式，又不会误操作真实玩家账号 |
| 配置在启动时读取 | 打包一次后可用于不同服主，密钥不写进镜像或前端构建变量 |
| 标准变量 + 旧名称兼容 | 启动器已配置好即可运行，不要求其他开发者配置两套值 |
| 会话与设备 Cookie 一起转发 | 设备绑定由 Player Service 检查，不能自己签 token 或只保留一个 Cookie |
| 密码只在提交时短暂存在 | 不把明文密码保存在 URL、localStorage、全局状态或日志 |
| 改密成功回登录 | 底层撤销全部会话，旧会话不能继续使用 |
| 真实 Origin 校验 | 公网/局域网访问不能仅用预设 canonical URL 判断；反代头仅在可信模式下采用 |
| 回跳比较 URL.origin | 字符串前缀容易被相似恶意域名绕过，不能直接信任 query.returnUrl |
| HEALTHCHECK 不依赖账号或上游 | 上游暂时异常不应该让门户陷入容器重启循环 |
| npm 锁文件与本目录构建 | 独立 clone 不依赖引擎工作区软链接或父目录，依赖可以重复安装 |

注释重点解释这些约束与失败路径，不逐行翻译显而易见的语法。修改代理前先读 docs/API.md，不删除安全检查来“解决登录失败”。

## 4. 开发、构建和检查命令

| 命令 | 作用 |
| --- | --- |
| npm ci | 按锁文件安装开发依赖 |
| npm run dev | 无配置模拟预览，保存后构建，刷新看效果 |
| npm run dev:live | 明确连接服主提供的真实配置，修改真实测试账号 |
| npm run build | 生成 public/app.js 和 public/styles.css |
| npm test | HTTP/安全/配置/模板回归，不要求浏览器工具 |
| npm run check | 构建、后端脚本语法和全部测试 |
| npm start | 生产入口，不启动模拟器；支持已有 .env 或启动器环境变量 |
| npm run package | 检查、Docker 构建、平台核对、导出 tar.gz 镜像 |
| npm run export:template | 导出可单独放进仓库的源码模板，不带凭据或 node_modules |

要修改主题应改 src/styles，不能改构建产物 public/styles.css。build 输出已压缩，源码和注释留在 src/server 中。

可选的真实浏览器交互回归位于 scripts/ui-smoke.cjs，使用 Electron 运行。普通开发与 npm test 不需要安装 Electron；在引擎工作区可使用已有的 Electron，在独立仓库可自行安装测试工具后执行。该测试使用模拟账号，不连接真实引擎。

## 5. 一条命令导出可导入启动器的镜像

需要本机 Docker 已启动。默认平台按当前 CPU 选择 linux/arm64 或 linux/amd64：

```sh
npm run package
```

默认镜像名为 `box3-login-example:0.2.0`，输出位于 dist。它刻意不使用官方镜像名，避免覆盖官方登录门户，启动器会把它作为自定义镜像保留。

建议发布自己的名称与明确版本：

```sh
npm run package -- --image my-login:1.0 --platform linux/arm64
# 或 AMD64
npm run package -- --image my-login:1.0 --platform linux/amd64
```

这会运行检查、构建 Dockerfile.standalone、核对架构并导出 Docker save 格式的 .tar.gz，不推送仓库。首次构建需要网络下载 Node 基础镜像和 npm 依赖；不是声称首次构建全离线。

镜像已有相同 tag 时 Docker 构建会更新本机这个 tag。归档已有同名文件时脚本拒绝覆盖，建议递增版本；确实要覆盖生成的归档可添加 --force。不要用同一个镜像 tag 同时发布两种平台：分别构建导出，清楚标注架构。

按命令最后的提示：

```sh
docker load -i dist/my-login-1.0-linux-arm64.tar.gz
```

然后进入引擎启动器 **数据配置 → 访问设置 → 登录页面镜像**，填写 `my-login:1.0`，保存。门户需要的地址、服务密钥、注册开关等由启动器注入，开发者不必把这些写进镜像。

Docker load 是导入动作；不要把这个 tar.gz 当作引擎启动器的“完整六服务离线包”。导入后仍要在登录页面镜像卡片选择名称。

自定义镜像不会随引擎自动升级；本机不存在就报错，不拉取、不静默回退。只改页面无须重建 Player Service；使用新增底层功能时需确保服主的 Player Service 已包含相应接口。

## 6. Dockerfile 的区别

- **Dockerfile.standalone**：单独仓库/本目录构建，前端在 build stage 构建，runtime 只复制 server 与 public。没有模拟器、开发依赖、.env、引擎源码或默认账号。监听 0.0.0.0:3214，非 root，带健康检查，可在启动器只读根目录环境运行。
- **Dockerfile**：仅引擎仓库集成构建，保留官方门户的许可证启动守卫和公共验证资源。它依赖引擎根目录构建上下文，不应当作独立仓库的构建入口。
- **examples/custom-image/Dockerfile**：旧的“继承已安装官方镜像、只覆盖静态资源”方案。独立模板默认不用它，不要求其他开发者先安装官方基础镜像。

独立门户只是调用已部署 Player Service 的 HTTP 页面与代理，不复制或替代引擎运行时。它不会给玩家授予权限，也不提供绕过引擎许可证的能力。继承官方镜像时仍需保留官方启动守卫。

## 7. 真实联调与启动器配置

默认开发不需要 .env。只有真实联调时，使用服主提供的配置，或复制 .env.example 并填写测试环境地址与密钥：

```sh
cp .env.example .env
npm run dev:live
```

这是会操作真实 Player Service 的模式，不用正式玩家账号试改密码。不要把 .env 提交仓库或发给其他人。

标准变量：HOST/PORT、BOX_PLAYER_SERVICE_INTERNAL_URL、BOX_PLAYER_AUTH_API_KEY、BOX_AUTH_PORTAL_PUBLIC_URL、BOX_CREATOR_PUBLIC_URL、BOX_PLAY_PUBLIC_URL、BOX_PLAYER_REGISTRATION_ENABLED；兼容 AUTH_DEMO_*。标准名称优先，密钥缺失时生产拒绝启动。

容器内部用 `http://player-service:3213`，不能硬编码宿主机 127.0.0.1:3124；门户监听容器端口 3214，宿主机一般映射 3125。

跨子域 Cookie、HTTPS、来源白名单和真实回跳配置属于服主部署职责，详见 docs/API.md。启动器注入不是“自动创建 DNS 或证书”。

## 8. API 和扩展原则

| 门户接口 | 底层 |
| --- | --- |
| POST /api/auth/login | POST /api/player-auth/login |
| POST /api/auth/register | POST /api/player-auth/register |
| GET /api/auth/session | GET /api/player-auth/session |
| POST /api/auth/logout | POST /api/player-auth/logout |
| PATCH /api/auth/profile | PATCH /api/player-auth/profile |
| POST /api/auth/password | POST /api/player-auth/password |

详细字段、响应、Cookie、限流、错误与联调例子在 **[docs/API.md](docs/API.md)**；它随模板导出，不依赖父仓库文档。

没有头像接口；改密需登录与原密码；无验证码/邮件/第三方登录协议；没有无原密码找回。不要为了扩展 UI 开放 /api/play-admin 或 /api/player-internal，也不要代理任意上游 URL。

修改功能时最少保留：来源校验、注册后端开关、字段白名单、两种 Cookie 转发、全部 Set-Cookie、Retry-After、安全回跳、改密重新登录、无密钥前端输出。

## 9. 发布前检查

- npm run check 通过；可选浏览器回归验证注册开启/关闭、原密码错误、重复提交与会话过期。
- 用真实测试环境验证完整 Cookie/设备绑定、封禁、限流与跨子域登录；模拟预览不能替代这些。
- package 导出的平台匹配目标启动器，用 docker load 实测，保存镜像名后健康检查通过。
- 生产镜像和静态 bundle 不包含模拟器、密码、API Key 或 .env。
- 只读根目录下启动正常，代码不在应用目录写日志/缓存。
- 回跳失败、连接失败、无效 JSON 不伪装为已登录。
- 递增自己的镜像版本，不覆盖官方 tag。
- 发布独立仓库前由仓库维护者明确模板许可；当前 package.json 的 UNLICENSED 是现状，不表示 MIT 或自动授权引擎源码。

## 10. 如何单独放进仓库

```sh
npm run export:template
```

导出的 dist/box3-login-template-0.2.0.tar.gz 包含源码、锁文件、独立 Dockerfile、测试和本地文档，不包含 node_modules、.env、dist、引擎依赖或上层仓库文件。解压后把内容放在新仓库根目录即可；不需要给开发者额外发引擎仓库。

新仓库中仍使用本 README 的命令。后续维护优先保留安全模块与 HTTP 契约，UI 可以自由替换。新增底层接口要同时更新 server/auth/operations.js、代理字段白名单、文档和测试。
