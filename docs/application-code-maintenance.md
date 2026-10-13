# 启动器与玩家应用代码维护

更新日期：2026-10-13。本文描述源码职责和本轮整理范围，不表示已更新发行包、镜像或 CDN。

## 部署启动器

`apps/deployment-manager/src/main.js` 只组装界面；`app/` 处理渲染与事件绑定，`operations/` 处理业务流程，`infrastructure/transport.js` 是唯一 Tauri/Web 传输入口。视图读取状态，不直接调用操作模块。

公网地址逻辑分两层：`configuration/public-service-address.js` 提供纯地址解析和前缀校验，接受命名参数；`configuration/public-access.js` 结合表单、证书状态和模式生成服务端点。独立地址忽略共用路径草稿，显式协议和端口保持优先。旧 `pathPrefix` 导出仍保留，调用方无需迁移。

Rust 配置、证书、Compose 投影和回滚仍由 `apps/manager-core` 维护；本轮没有把服务端规则复制到界面。

## 玩家后台

`apps/player-admin/src/pages/index.tsx` 是 Umi 默认路由出口；内部 `PlayerAdminPage` 使用具名导出。

`pages/shell/player-admin-page.tsx` 管理会话、权限、导航、请求和跨页面弹窗。`pages/shell/admin-content.tsx` 根据 view 选择业务页面，只接收协调器提供的数据与回调，不新增请求客户端或另一份授权判断。业务工作流继续由 players、access、creator、maps、security、containers 各目录维护。

后台能力、审计与导航规则来自 `@box/player-policy`，实时通知来自 `@box/realtime-client`；不再跨应用引用 game/shared 源码，服务端最终授权不变。页面复用位置见[后台复用索引](./player-admin-code.md)。公共包入口见[复用说明](./reusable-packages.md)。
`src/global.less` 只按原顺序导入 `src/styles/` 的布局、地图/容器、目录表格、登录、表单、详情、创作权限和响应式样式。图标相对路径随文件位置调整，实际资源目标不变。

## 玩家启动器

`apps/player-launcher/electron/main.ts` 维护应用、窗口、Cookie 同步与 IPC 来源校验。`electron/application/commands.ts` 接收存储、网络、游戏窗口和缓存依赖，返回命令分发函数；白名单、地图签名、票据、选中服务器及缓存操作在这里维护。游戏窗口不能绕过主进程入口的发送者校验调用命令。

渲染层仍按 application、api、features、views、platform 分层。账号资料保存明确跟踪当前请求拥有的玩家对象，收到新资料后恢复按钮并关闭弹窗，过期会话仍进入统一失效流程。

`shared/server-address.ts` 负责规范化地址：本机和 RFC1918 内网 IPv4 省略协议时使用 HTTP，公开地址默认 HTTPS，显式协议优先，路径前缀保留。`runtime/application-menu.ts` 在隐藏菜单时保留标准编辑快捷键，直接操作当前窗口，不向页面暴露任意剪贴板接口。

封面使用当前服务器前缀和受限公开资源读取；缓存、签名验证、账号隔离与 Cookie 生命周期见[玩家启动器维护说明](../apps/player-launcher/docs/maintenance.md)。
`src/styles.css` 按原层叠顺序导入 `src/styles/` 的外壳、对话框、登录、账号、地图、存储、引导、反馈及响应式样式；地图列表与详情分开保持原有覆盖次序。

## 检查

```sh
npm run format:owned:check
node scripts/check-deployment-manager-structure.js
npm --prefix apps/deployment-manager run check
npm --prefix apps/deployment-manager test
npm --prefix apps/player-admin run build
npm --prefix apps/player-launcher run check
npm --prefix apps/player-launcher run test:desktop
npm --prefix apps/player-launcher run test:menu
npm --prefix apps/player-launcher run test:cache
node --test scripts/*.test.js
node scripts/check-documentation.js
node scripts/independent-address-smoke.js
```

源码职责整理不自动部署运行中的服务。需要发行时另走镜像/安装包流程，验证最终产物。

## 本轮验证记录

2026-10-13 全量复核：自有代码和文档格式检查覆盖 509 个文件，无差异；根脚本 ESLint 无诊断。219 项工程脚本、99 项玩家启动器、31 项登录门户测试通过。部署管理器结构检查通过（58 个 JavaScript 模块，最大源文件 448 行），四个应用生产构建通过。

语法检查覆盖 376 个自有 JS/TS 文件，未发现实际 `var` 声明、非规范源文件名、大小写路径冲突、合并冲突标记或可解析静态相对依赖的运行时循环；动态依赖、上游同步代码和类型依赖不据此宣称已全部检查。Git 无未合并条目。83 份 Markdown 的索引、版本、本地直接/图片/引用式链接检查通过。

统一了编辑器与格式工具的覆盖范围，补齐登录门户测试、工程规则、应用说明和 docs 示例。修正依赖旧缩进、无分号、无花括号及旧路径写法的静态断言，增加真实公开地址与传送行为回归；未放宽来源、签名、授权或生产逻辑。

玩家启动器桌面回归验证了资料保存、会话失效与重新登录、中文输入、收藏同步、独立缓存清理和资源加载；隐藏菜单的复制、粘贴、剪切及全选快捷键检查通过。真实 Service Worker 缓存、HTTP 缓存分开清理与账号保留检查通过。

独立地址模拟使用临时 Docker/Nginx 上游，覆盖 HTTP 独立域名、HTTPS 独立域名、HTTP 独立端口、HTTPS 域名与端口组合、HTTP/HTTPS 混合服务。25 个服务地址的 50 次页面/资源请求、25 次 WebSocket 握手通过；测试结束清理临时容器与文件，不修改现有服务配置。这不代替实际公网 DNS、用户证书或防火墙验收。

执行了全仓 `npm run verify`（Rush 入口），通过格式、Lint、门户类型及已执行的运行时、权限、模型、存储和发行边界回归，最终在公网 Rust 模块 `rustfmt` 检查处失败。该检查之后的阶段不能计为全仓通过；`apps/manager-core` 本轮无改动，其遗留格式问题未扩入自有 JS/TS 统一范围。

另行补跑核心 Rust 单元测试（133 通过、3 忽略）、Web 管理端编译与测试（39 通过、1 忽略）、桌面 Rust 测试（58 通过）。桌面下载并发夹具首次遇到非阻塞读取 `WouldBlock`，显式切回阻塞读取后，单项复测及完整测试通过；修改仅在测试夹具，不改变生产下载逻辑。桌面/Web 契约和引擎/服务器发行工作流检查通过。本轮未重建安装包、部署服务或验证真实公网，构建生成的无关上游产物差异已清理。

## 类型检查基线

整理前玩家后台整项目 TypeScript 检查已有 18 项诊断，主要来自生成接口参数、资源响应类型、Ant Design/React 类型及上游 DOM 类型。本轮比对文件、错误编号和消息，不把行号移动视为新增错误，也不使用 `any` 或忽略注释掩盖这些诊断。后台生产构建与类型基线检查是不同的验证结果。

## 公开协作与配置简化

2026-10-13 后续整理：仓库已公开开源，README、贡献指南和开发/许可/发行文档统一为公开克隆、Fork、`origin`/`upstream` 同步与 Pull Request 流程，不再要求邀请。源码公开与服务登录、官方发布密钥是不同边界。

`.editorconfig` 由 74 行合并为 31 行；实际 499 个代码与文档文件的编辑器缩进和格式器逐一比对一致，另有 7 份清单保持两空格。删除一份已被正式用例覆盖的临时旧测试，以及两个独立的配置/检查包装测试文件；有效断言并入格式、清单与结构测试，原有桌面/Web/发行 CLI 检查仍在仓库验证流程中执行。临时目录加入 Git 忽略，格式器跳过已删除的 Git 跟踪文件。

本轮格式检查覆盖 506 个文件；214 项工程脚本和 99 项玩家启动器测试、83 份文档检查以及桌面/Web/发行契约检查通过。未重新执行上文的完整 Verify、Rust 测试或安装包构建；此前的后台类型与 Rust 格式问题没有通过删除测试规避。
