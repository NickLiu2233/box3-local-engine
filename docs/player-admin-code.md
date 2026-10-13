# 后台管理复用索引

页面协调与内容选择分别维护在 `pages/shell/player-admin-page.tsx` 和 `pages/shell/admin-content.tsx`；后者不拥有请求或弹窗状态。统一风格和清单排序见[代码风格](./code-style.md)。

模块边界、开发启动和验证流程见[后台管理开发说明](./player-admin-development.md)。本文维护公共模块和各页面的唯一实现位置。

后台页面位于 `apps/player-admin/src/pages`，按业务划分；页面继续负责权限判断、确认操作和业务流程。

复用入口：

- `apps/game/server/admin-map-catalog.ts`：容器管理和地图授权共用的地图目录。创作端读取项目元数据，游玩端读取已有地图管理接口。`id` 是运行时使用的工程目录 ID；`permanentMapId` 是不可修改的地图 ID。展示地图 ID 和绑定授权时使用后者。地图源暂不可用时返回空目录，授权模块保留已有元数据。
- `components/map-select.tsx`：地图名称、不可修改的 ID、搜索和端分组。调用方只提供选项和选择值，业务分组规则留在调用方。
- `components/page-toolbar.tsx`：统一页面标题与操作栏布局。
- `components/admin-pagination.tsx`：服务端分页和表格内部分页共用每页数量选项；服务端分页统一在数量变化时回到第一页。
- `components/confirm-admin-action.ts`：所有操作确认的入口，统一按钮默认文案与未捕获异常提示。
- `pages/players/confirm-text.tsx`：密码重置和批量标签共用文本输入确认框，等待异步操作结束。
- `components/player-identity.tsx`：玩家目录和创作管理共用头像、昵称与用户名展示。
- `apps/game/shared/player-admin-policy.ts` 与 `player-admin-navigation.ts`：前后端共用角色能力判断和页面准入规则，页面不要再次手写 owner/admin 判断。
- `hooks/use-admin-request.ts`：异步请求的加载状态与错误提示；重叠请求全部结束后才解除加载状态。调用方负责更新数据，请求失败返回 `undefined`。
- `player-admin-errors.ts`：统一错误提示，表单校验错误由表单显示。
- `pages/access/map-authorization-fields.tsx`：创建和编辑授权共用的权限、封禁上限与有效期字段。
- `player-admin-api.ts`、`player-admin-types.ts`、`player-admin-format.ts`：已有的请求客户端、业务类型和格式化方法，新增页面优先复用。

地图授权、地图容器配置和地图导入的分组语义不同，不在展示模块内合并业务规则。新增权限或修改有效期规则时，同时修改后端校验与授权字段；不要在创建、编辑窗口分别维护一份。

## 逐页复用清单

索引覆盖 16 个后台视图，以及登录、修改密码和各页面的编辑窗口。公共能力集中维护；表格列、业务字段、操作提示和提交内容由对应业务模块维护一份。

| 界面             | 功能及唯一维护位置                                                                                            | 共用能力                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 管理概览         | `overview-page` 展示统计，协调器只在概览页加载统计                                                            | 工具栏、请求状态、角色/导航策略                                           |
| 玩家账号         | `use-player-directory` 维护搜索、详情、资料、新增、导出、封禁、删除和批量操作                                 | 玩家列表/表格/详情/封禁窗口、分页、身份展示、文本确认、操作确认、请求状态 |
| 在线会话         | `use-player-directory` 的 online 模式                                                                         | 与玩家账号同一列表、详情和操作流程                                        |
| 账号封禁         | `use-player-directory` 的 banned 模式                                                                         | 与玩家账号同一列表和封禁/解封流程                                         |
| IP / 设备封禁    | `use-security-management` 读取和解除来源封禁                                                                  | 分页、时间格式、操作确认、请求状态                                        |
| 安全记录         | `use-security-management` 读取审计与登录记录                                                                  | 分页、时间格式、请求状态                                                  |
| 玩家创作权限     | `creator-management` 的 access 模式，协调器执行玩家操作                                                       | 玩家目录数据、身份展示、创作权限公共策略、请求客户端                      |
| CLI Token        | `creator-management` 的 tokens 模式，签发/编辑共用同一窗口                                                    | 玩家目录数据、身份展示、CLI 能力公共策略、操作确认、请求客户端            |
| 游玩地图         | `play-maps-page` 导入预览、确认、资源预览、固定地图 ID、访问 ID 设置、上下架、删除；`play-map-table` 管理分组 | 请求状态、操作确认、大小/时间格式                                         |
| 游玩端容器       | `container-management-page` 的 play 模式                                                                      | 与创作端同一状态列表、房间、重启/销毁流程；公共地图目录                   |
| 创作端容器       | `container-management-page` 的 creator 模式                                                                   | 与游玩端同一业务模块；公共地图目录                                        |
| 地图容器配置     | `container-profiles-page` 新增/编辑/删除；服务端 `map-container-admin` 容量规则                               | 地图目录、地图选择器、请求状态、操作确认                                  |
| 资源组           | `container-resource-groups-page` 新建/编辑/删除共用一份表单                                                   | 请求状态、操作确认                                                        |
| 管理账号         | `use-owner-management` 维护创建/编辑/启停/删除，列表只展示及触发确认                                          | 公共分页选项、操作确认、请求状态、时间格式                                |
| 权限组           | `use-owner-management` 维护创建/编辑/删除，`permission-tree` 处理树选择                                       | 公共权限元数据/菜单、分页选项、操作确认、请求状态                         |
| 地图授权         | `script-moderation-page` 选择地图组、创建/编辑/续期/撤销、状态筛选                                            | 公共地图目录、地图选择器、同一授权字段、请求状态、操作确认                |
| 登录与自己的密码 | 登录页与密码窗口各自维护对应凭据流程                                                                          | 请求状态、错误提示、同一请求客户端                                        |

与业务有关的字段、规则和列表列不会强行合成一个包含大量分支的通用表单；同一业务的新建与编辑复用同一窗口。玩家密码、管理员密码、服主令牌和地图授权有不同含义及校验规则，不能混用。

## 游玩地图版本导入

游玩地图列表展示不可修改的 `permanentMapId`（地图 ID）；访问 ID 仍用于访问地址设置。
导入和审查确认共用 `apps/game/server/play-admin.ts` 的身份、版本及冲突校验：同一项目只接受更高版本，相同或更低版本提示且不覆盖。版本按数字分段比较，支持 `v1`、`1.10.0` 和预发布版本。
升级保留本地目录 ID、访问 ID、开放状态及运行存储，更新主副地图关系中的目录引用；安装前暂存，失败恢复整个批次的旧地图。确认时再次校验版本，避免覆盖审查期间已更新的地图。

地图授权通过不可修改的地图组 ID 唯一绑定，选择框直接读取创作端项目和游玩端已导入地图，并跨运行模式去重，未启动地图也可授权；目录名称优先于两端历史运行记录中的名称；模式仅保留在运行元数据和实例凭证中。旧模式绑定在事务中合并为最近更新的一条，并建立地图 ID 唯一索引。

安全记录操作名称由 `apps/game/shared/player-admin-audit-catalog.ts` 统一维护；列表与详情共用 `pages/security/security-activity-details.tsx` 的对象和结果展示，权限说明复用地图授权字段的权限目录。地图授权与脚本调用共用 `apps/game/server/script-moderation-audit.ts` 的审计格式。
