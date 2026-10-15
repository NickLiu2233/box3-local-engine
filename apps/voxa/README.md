# VOXA 本地模型编辑器

VOXA 使用 Next.js 提供体素模型、皮肤和动画编辑。Creator 的“模型列表”管理本地模型库，地图编辑器还可嵌入 VOXA 编辑项目模型；两种保存范围不同，不应直接在地图工程之间复制内部状态。

## 启动与权限

先在仓库根按[开发入门](../../docs/developer-guide.md)安装依赖，使用 `npm run dev:infra` 启动完整源码栈，VOXA 默认是 `http://127.0.0.1:3123/`。模块自身的 `npm --prefix apps/voxa run dev` 默认使用 `3001`，只用于单独调试；它仍需要正确的 Player Service 地址、登录与本地配置，不能代替根开发栈。

玩家必须先由服主开启创作端并授予“管理模型”能力。普通注册不会自动授予模型权限。从 Creator 打开 VOXA 会带入模型类型和编辑上下文；首次授权与自制模型示例见[首个作品教程](../../docs/first-project.md)。

## 数据与代码入口

| 入口                                  | 用途                                |
| ------------------------------------- | ----------------------------------- |
| `pages/index.tsx`                     | 编辑页面与模型权限门禁              |
| `pages/api/local/`                    | 本地模型、blob、快照与工程包 API    |
| `server/local-voxa-store.ts`          | 本地模型索引与内容哈希 blob 存储    |
| `server/local-voxa-project-bundle.ts` | 模型工程包的读写与校验              |
| `src/models/`                         | 体素编辑、动画与保存逻辑            |
| `src/views/`                          | 工具、侧栏与保存界面                |
| `scripts/`                            | 模型范围、权限、CORS 和工程资源回归 |

根源码开发命令将模型数据统一放到 `.local-data/apps/voxa/data/`，该目录不提交 Git、不进入镜像构建；可用 `BOX_DEV_DATA_DIRECTORY` 更换整个开发数据根，或用 `VOXA_DATA_PATH` 单独指定模型库。`.voxaproject` 用于导出并继续编辑模型工程；旧包可能只有 `project.bin`，缺少 mesh 等资源时必须打开并保存一次。保存后的模型是否属于某张地图，还要看该地图的项目模型引用。

## 检查与构建

在仓库根执行：

```sh
npm --prefix apps/voxa run check:model-library-scope
npm --prefix apps/voxa run check:model-project-bundle
npm --prefix apps/voxa run check:local-cors
npm --prefix apps/voxa run check:model-management-permission
npm --prefix apps/voxa run build
```

前四项加入根工程检查，使用 ts-node 回归。默认皮肤或父窗口资源地址变化时，再运行 `check:default-skin-scope` / `check:parent-storage-url`。构建不属于模型保存与地图放置验收，完整边界见[测试指南](../../docs/testing.md)。

修改文案先更新 `lang/src/`，使用模块的 `update-i18n` 和 `build-i18n` 脚本维护翻译产物。新增模型或媒体示例需要明确来源和再分发许可；不要把自己的模型库、上传文件或用户资料作为默认源码资源提交。
