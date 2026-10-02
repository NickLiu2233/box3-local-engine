# BOX3 Engine Launcher 前端

桌面版和 Linux Web 管理端共用这套界面。入口 `src/main.js` 只负责注册渲染器、启动时读取状态和应用级事件。

## 目录与职责

| 目录 | 职责 |
| --- | --- |
| `src/core/` | 应用状态、固定配置、请求重新渲染的接口 |
| `src/app/` | 页面选择、保留滚动位置、组装事件绑定 |
| `src/app/bindings/` | 按功能绑定用户交互，调用对应操作 |
| `src/views/` | 页面 HTML；只读取状态，不调用服务操作 |
| `src/configuration/` | 表单读取、字段校验反馈、访问地址计算 |
| `src/operations/` | 服务控制、配置保存、备份、许可、轮询与登录流程 |
| `src/infrastructure/` | Tauri / Web 传输适配，统一通过 `@box/apis` 访问 HTTP |
| `src/ui/` | 表单、图标、外壳、主题和对话框等共用展示逻辑 |
| `src/utils/` | 格式化、复制等通用工具 |
| `src/styles/` | 按页面和职责分组的样式；由 `src/styles.css` 按顺序导入 |

操作模块通过 `core/render-request.js` 请求更新界面。真正的渲染器在入口注册，避免页面渲染、事件绑定和操作逻辑互相循环导入。

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

macOS 本地打包：

```sh
cd apps/deployment-manager
npm run tauri -- build --bundles app
```
