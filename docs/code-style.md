# 自有代码风格与维护范围

更新日期：2026-10-13。

本规则用于本仓库维护的启动器、玩家后台、玩家启动器、登录门户、运行适配和工程脚本。范围与选项的唯一来源为 `scripts/lib/owned-code-config.cjs`，`.prettierrc.cjs` 和 `scripts/format-owned-code.js` 共用它。`.editorconfig` 将相同缩进的目录合并为分组，不逐项复制检查清单；上游源码和生成物保留现有约定。新增文件和已有文件遵循同一规则，不依靠个人设置。

## 目录范围

| 目录                                                 | 范围                                       |
| ---------------------------------------------------- | ------------------------------------------ |
| `apps/deployment-manager`                            | 部署管理器前端与开发配置                   |
| `apps/player-admin`                                  | 玩家后台页面、业务模块和开发配置           |
| `apps/player-launcher`                               | Electron 主进程、渲染进程、共享逻辑与测试  |
| `apps/player-auth-portal/src`、`server`、`scripts`   | 登录门户源代码                             |
| `apps/local-engine/src`、`scripts`                   | 引擎启动与打包适配                         |
| `packages/deployment-routing`                        | 页面、资源、请求、图片优化与运行时前缀适配 |
| `packages/player-policy`、`packages/realtime-client` | 共享权限、实时协议与独立测试               |
| `scripts`                                            | 部署、打包、结构检查、测试与夹具           |

依赖、运行数据、构建产物、`.umi`、`.umi-production` 不参与整理。上游同步的 `apps/game`、`apps/voxa`、`services/game-server`、其他 `packages` 与 `internals` 保持各自风格；本轮三个公共包明确纳入自有规则，包含 `.cts` 声明，不通过全仓替换格式。Rust 使用 `cargo fmt`，遵循 Rust 的命名和可见性规则，不套用 JavaScript 的驼峰规则。

## 命名与排版

检查也覆盖登录门户 `test/`、`tools/repo-tooling`、根格式/Lint 配置、`docs/examples`，以及全部 docs、自有应用说明和根 README/CONTRIBUTING。

- 文件和目录使用英文 `kebab-case`；文档允许中文文件名。变量、方法使用 `camelCase`，类型、接口、类使用 `PascalCase`，语义常量使用 `UPPER_SNAKE_CASE`。
- 不用浏览器内置对象名声明业务变量。外部 API、协议字段、框架类型和生成契约保留原名，不为了风格修改兼容接口。
- JS/TS 和 CSS/Less 采用四空格缩进，文档中的 JS/TS 示例也使用同一规则。JS/TS 使用分号与单引号；JSON 使用双引号和两空格缩进，JSX 属性按语法使用双引号。
- 换行宽度为 100 字符；不可拆分的标识符、字符串、模板与正则保持值不变，不通过截断内容满足宽度。
- `if/else` 和循环保留花括号，允许 `else if` 链；优先使用提前返回减少嵌套。不使用 `var`。
- TypeScript 类型注解采用 `value:Type`、`field?:Type`、`function read(value:Type):Result`；对象赋值采用 `field: value`。类型规则由本地 Prettier 扩展实现。
- 导入按第三方、项目模块、类型导入分组，组间空行；有副作用的导入保留原顺序。使用具名导出；Umi 路由入口和 Electron 打包钩子等框架必需的默认导出保留。
- TypeScript 类成员明确声明可见性；原生私有字段和框架装饰器保持其语义。业务内部状态通过操作函数维护，不增加带隐藏副作用的 getter/setter；浏览器适配与测试夹具需要模拟原生属性时保留原生协议。
- 功能接口使用简短 JSDoc 说明职责、信任来源或副作用。删除无效注释代码；TODO 使用 `// TODO: ...`，不把未处理的 FIXME 当作已完成工作。

格式扩展使用 TypeScript 语法节点补充分支块和成员可见性，不在字符串、注释或 JSX 文本里做全局替换。格式检查验证幂等性；功能回归验证行为。

## package.json

根清单及本轮维护项目的 `package.json` 按约定字段顺序排列。完整顺序的唯一实现为 `scripts/lib/package-manifest-order.cjs`，起始字段依次为 `$schema`、`name`、`displayName`、`version`、`private`、`description`；入口字段在脚本前，依赖字段在脚本和工具配置后。

`build` 等未列出的自定义字段放在已列字段后，并保留它们之间的相对顺序。排序不修改字段值，也不重排 `scripts`、依赖映射或打包配置的内部顺序。JSON 的缩进与引号由 Prettier 管理。

## 执行与验证

```sh
npm run format:owned
npm run format:owned:check
node --test scripts/client-format.test.js scripts/package-manifest-order.test.js
node --test scripts/documentation-links.test.js
```

根目录 `format` / `format:check` 工作流也会先调用自有代码检查。范围内的路由适配即使被全仓 Prettier 忽略，仍由自有代码检查覆盖。

整理模块后，另执行对应项目的类型、构建和业务回归。格式通过不表示服务端授权、窗口安全、打包或真实网络已验收。三个界面的模块入口和检查方式见[应用代码维护](./application-code-maintenance.md)。
