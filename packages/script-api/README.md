# Script API

此仓库包含 Script API 接口以及对应生成的参考手册。

`docs`分支下的文件均通过 `main` 分支内接口文件自动生成，请勿手动修改。

如需要针对生成的文档进行进一步修改，请通过 `docs` 分支检出新分支。

## 自动生成DTS

用于编辑模式下代码编辑器的 .d.ts 文件在这里生成。

### 使用

直接修改 `src/client` 内的文件，在本目录执行 `rushx build`，构建会处理并在 `dts` 目录下生成对应的文件。

服务端声明由 `src/server` 生成。Local Engine 的 `world.moderation` 类型以 `internals/schema/api/js/moderation.ts` 为准，由同步脚本更新；不要手工修改生成的 DTS。

在仓库根目录运行 `npm --prefix apps/game run build:script-types`，可一起更新脚本 SDK 和地图编辑器类型资源。接口以本包类型声明和实现为准，基础开发流程见[开发入门](../../docs/developer-guide.md)。
