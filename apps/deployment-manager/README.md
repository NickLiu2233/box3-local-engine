# BOX3 Engine Launcher

桌面版和 Linux Web 管理端共用这套 Vite 界面；桌面使用 `src-tauri/` 的 Rust/Tauri 2 适配器，Web 使用 [server-manager-rust](../server-manager-rust/README.md)。共用配置、服务控制和备份规则在 [manager-core](../manager-core/README.md)。入口 `src/main.js` 只负责注册渲染器、启动时读取状态和应用级事件。

## 目录与职责

| 目录                  | 职责                                                   |
| --------------------- | ------------------------------------------------------ |
| `src/core/`           | 应用状态、固定配置、请求重新渲染的接口                 |
| `src/app/`            | 页面选择、保留滚动位置、组装事件绑定                   |
| `src/app/bindings/`   | 按功能绑定用户交互，调用对应操作                       |
| `src/views/`          | 页面 HTML；只读取状态，不调用服务操作                  |
| `src/configuration/`  | 表单读取、字段校验反馈、访问地址计算                   |
| `src/operations/`     | 服务控制、配置保存、备份、许可、轮询与登录流程         |
| `src/infrastructure/` | Tauri / Web 传输适配，统一通过 `@box/apis` 访问 HTTP   |
| `src/ui/`             | 表单、图标、外壳、主题和对话框等共用展示逻辑           |
| `src/utils/`          | 格式化、复制等通用工具                                 |
| `src/styles/`         | 按页面和职责分组的样式；由 `src/styles.css` 按顺序导入 |

操作模块通过 `core/render-request.js` 请求更新界面。真正的渲染器在入口注册，避免页面渲染、事件绑定和操作逻辑互相循环导入。
公网地址与前缀的纯解析在 `configuration/public-service-address.js`，表单、证书和访问模式的组装在 `configuration/public-access.js`。修改前执行根目录 `npm run format:owned:check`；统一规则见[自有代码风格](../../docs/code-style.md)。

## 修改与检查

在对应页面或操作模块修改功能；新增页面时在 `app/render.js` 接入展示，在 `app/bind-events.js` 接入事件绑定。共用状态放在 `core/state.js`，不要在页面中创建另一份配置状态。

每个前端 JavaScript / CSS 文件必须少于 500 行。构建前会检查行数、相对导入是否存在、模块是否循环依赖和视图职责。达到上限时应按功能继续拆分，不要压缩代码行数。

```sh
npm --prefix apps/deployment-manager run check
npm --prefix apps/deployment-manager test
node scripts/check-desktop-deployment-manager.js
node scripts/check-headless-rust-manager.js
```

样式入口的导入顺序保留了原来的层叠顺序。修改样式时优先编辑对应文件，调整顺序前检查主题、窄屏和后面的覆盖规则。

## 原生开发环境

先按[开发入门](../../docs/developer-guide.md)安装工作区依赖。网页调试使用根 `npm run dev:manager`；原生调试使用 `npm run dev:manager:native`。单独的网页界面没有 Tauri 的本机 Docker/文件操作能力，Web 模式还需要真正运行的 Rust 管理器后端。

所有系统安装 [Rust stable 与 rustup](https://www.rust-lang.org/tools/install)，执行 `rustup default stable`，确认 `cargo --version`。Tauri 还需要平台构建工具和 WebView；官方平台更新以 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) 为准。

### macOS

安装 Xcode Command Line Tools，弹出的系统安装完成后再继续：

```sh
xcode-select --install
xcode-select -p
rustup default stable
```

WebKit 由系统提供。Docker Desktop 启动后，在仓库根运行 `npm run dev:manager:native`。构建 App 用下方命令。

### Windows

安装 Visual Studio 2022 Build Tools，选择“使用 C++ 的桌面开发”，保留 MSVC C++ 工具链与 Windows 10/11 SDK。安装 Microsoft Edge WebView2 Runtime；通常系统已有，但缺失时需按 Tauri 官方步骤安装。

安装 rustup 时选择与本机架构匹配的 MSVC stable 工具链，确认 `rustup show` 的 host 使用 `pc-windows-msvc`。使用新的开发终端让 PATH 生效，运行 `cargo --version` 和 `npm run dev:manager:native`。Docker Desktop 另需 WSL 2 与硬件虚拟化，不能用 WebView2 替代 Docker 环境。

### Linux（Debian / Ubuntu）

在提供 WebKitGTK 4.1 软件包的系统上安装 Tauri 2 开发依赖：

```sh
sudo apt update
sudo apt install build-essential curl wget file pkg-config libwebkit2gtk-4.1-dev libxdo-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev
rustup default stable
```

再确认 Docker Engine 正在运行、当前账号具有 Docker 访问权限，并在可用桌面会话中运行 `npm run dev:manager:native`。其他发行版按 Tauri 官方文档选择等价包；无桌面服务器优先使用 [Linux Web 管理器发行包](../../distribution/server/README.md)，不要求安装 WebKitGTK 或启动桌面 App。

## 构建与验收

macOS 本地 App 构建：

```sh
cd apps/deployment-manager
npm run tauri -- build --bundles app
```

其他系统从根目录执行 `npm --prefix apps/deployment-manager run tauri -- build`，或使用根发行任务选择已支持的目标。跨架构/跨系统构建需要额外目标工具链，不能把本机 App 通过视为所有目标通过。

生成安装包请使用根目录的打包命令，支持 OSS 精简版与携带当前 Docker 镜像的本地测试版，命令以根 package.json 与脚本帮助为准。直接运行 Tauri build 不会自动生成完整镜像发行资源。打包流程见[发布说明](../../docs/release-and-version.md)。

根验证编译测试 Rust 共享核心与 Web 管理器，并检查桌面接线；它不编译和运行这个 Tauri App。原生改动应在目标平台检查首次启动、Docker 连接、配置保存、服务启动/停止、备份恢复和更新。测试边界见[测试指南](../../docs/testing.md)。
