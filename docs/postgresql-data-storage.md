# PostgreSQL 数据空间部署手册

地图数据表使用不可变的 `mapUuid` 作为命名空间；地图组数据表使用主地图的 `mapUuid`。
可编辑的访问 ID（玩家链接 `/p/<访问ID>`）发生变化时，已有存档仍会使用同一 UUID，
不会切换或丢失。`project.id` 仅是本地工程目录和运行时路由键，不是数据库身份。

本文面向部署游玩端或创作端的服主。PostgreSQL 用于持久化地图脚本通过 `storage`
访问的数据，例如玩家存档、背包、任务进度、排行榜和全服状态。

数据库配置不写入镜像。每位服主在部署机器的 `.env` 中提供自己的连接信息；数据库账号、
密码和连接地址不会发送到玩家浏览器。

## 1. 支持范围

PostgreSQL adapter 支持：

- `storage.getDataStorage(name).get(key)`；
- `set`、`update`、`increment`；
- `list` 分页和数值范围筛选；
- `remove` 和 `destroy`；
- 并发更新时的事务锁；
- 多作品数据隔离；
- 容器重建、地图更新和服务器重启后的数据持久化。
- 与旧 boxes 相同的“主数据表 + `_keys` 索引表”布局；
- 直接读取旧表中的 `value.content`、`record` 和 `isDelete` 数据。

脚本中的原始 `db.sql` 仍使用引擎自己的 SQL 运行环境，不会获得服主 PostgreSQL 的任意
SQL 权限。这样可以避免不可信地图脚本读取数据库中的其他业务表。

## 2. 最小配置

在运行 `docker compose` 的目录创建 `.env`：

```env
BOX_DATABASE_URL=postgresql://box_game:请替换密码@数据库地址:5432/box_game
```

填写 `BOX_DATABASE_URL` 后会自动启用 PostgreSQL；留空时自动使用本地文件数据空间。

然后重新创建容器：

```bash
docker compose --profile play up -d --no-build play
```

如果使用作品发布包自带的 `compose.yml`：

```bash
docker compose up -d
```

创作端使用同一套配置时执行：

```bash
docker compose --profile creator up -d --no-build creator
```

## 3. 完整配置

```env
BOX_DATABASE_URL=postgresql://box_game:请替换密码@db.example.com:5432/box_game
BOX_DATABASE_SCHEMA=box_engine
BOX_DATABASE_POOL_SIZE=10
BOX_DATABASE_SSL=true
BOX_DATABASE_SSL_REJECT_UNAUTHORIZED=true
BOX_DATA_STORAGE_LOCK_TIMEOUT_MS=10000
BOX_DATA_STORAGE_NAMESPACE=
BOX_DATA_STORAGE_NAMESPACE_PREFIX=
BOX_GROUP_STORAGE_NAMESPACE=你的地图组ID
```

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BOX_DATABASE_URL` | 空 | 服主自己的 PostgreSQL 连接串；非空时自动启用 PostgreSQL |
| `BOX_DATABASE_SCHEMA` | `box_engine` | 自动建表使用的 schema，必须是小写标识符 |
| `BOX_DATABASE_POOL_SIZE` | `10` | 每个运行中的地图进程最大连接数 |
| `BOX_DATABASE_SSL` | `false` | 托管数据库通常需要设为 `true` |
| `BOX_DATABASE_SSL_REJECT_UNAUTHORIZED` | `true` | 是否验证数据库服务器证书 |
| `BOX_DATA_STORAGE_LOCK_TIMEOUT_MS` | `10000` | 脚本 `update` 事务锁的最长保留时间 |
| `BOX_DATA_STORAGE_NAMESPACE` | 空 | 单作品迁移时填写原作品 ID，例如 `100010141` |
| `BOX_DATA_STORAGE_NAMESPACE_PREFIX` | 空 | 多套私服共用数据库时使用的命名空间前缀 |
| `BOX_GROUP_STORAGE_NAMESPACE` | 自动使用主地图 UUID | `getGroupStorage` 的地图组共享标识；同组地图一致、不同组隔离 |

不建议把 `BOX_DATABASE_SSL_REJECT_UNAUTHORIZED` 设为 `false`。只有数据库供应商明确使用
无法由系统信任链验证的证书时才临时关闭验证。

## 4. 数据隔离方式

- `world.getDataStorage(name)` 使用每张地图自己的 namespace，其他地图无法访问。
- `world.getGroupStorage(name)` 使用地图组 namespace；Creator 和自动生成的单作品游玩包默认
  使用发布清单中的主地图 UUID，同组地图可访问，不同地图组不可访问。只有迁移旧数据或明确需要
  自定义命名空间时才手动设置 `BOX_GROUP_STORAGE_NAMESPACE`。
- 两类空间即使传入相同的 `name` 也使用不同的表，不会互相覆盖。

表名沿用旧 boxes 双表格式。以地图 UUID `11111111-1111-4111-8111-111111111111`
和数据空间 `player` 为例：

```text
play_11111111-1111-4111-8111-111111111111_player
play_11111111-1111-4111-8111-111111111111_player_keys
edit_11111111-1111-4111-8111-111111111111_player
edit_11111111-1111-4111-8111-111111111111_player_keys
group_play_11111111-1111-4111-8111-111111111111_player
group_play_11111111-1111-4111-8111-111111111111_player_keys
```

普通作品空间使用 `play_` / `edit_`，group storage 使用
`group_play_` / `group_edit_`。主表保存历史数据记录，`_keys` 表通过 `record`
指向当前记录，并使用 `isDelete` 表示逻辑删除。更新数据时会保留旧版本并切换
`_keys.record`。

PostgreSQL 标识符最长 63 字节。如果 UUID 与最长 50 字符的数据空间名称组合后超长，
adapter 会使用 `storage_<sha256>` 形式的确定性物理表名；逻辑命名空间仍是完整 UUID，
不会降低地图隔离性。

多地图游玩端始终把发布清单中的 Map UUID 放进命名空间，因此访问 ID 即使修改，或者两张地图
使用相同的数据空间名称，也不会互相覆盖。

创作端的 `edit` 数据与正式游玩端的 `play` 数据默认隔离，避免测试数据污染正式玩家存档。

### 什么时候建表和写入

- 仅启动 Creator、Play 或打开地图不会创建 `box_engine` 数据表；
- 地图脚本第一次取得某个 `getDataStorage(name)` / `getGroupStorage(name)` 空间并执行
  `get`、`list`、`set`、`increment` 或 `remove` 时，adapter 才连接 PostgreSQL 并懒创建该空间
  对应的主表和 `_keys` 表；
- `get` 和 `list` 可能创建空表，但不会写入业务记录；
- `set` 和 `increment` 创建新历史记录并更新 `_keys.record`；
- `remove` 不物理删除历史记录，而把 `_keys.isDelete` 标记为 `true`；
- `destroy` 才会删除该数据空间的两张物理表。

因此，数据库刚清空且地图脚本尚未调用 storage 时，`box_engine` 为 0 张表是正常现象。

## 5. 数据库账号权限

建议为引擎创建独立数据库和低权限账号，不要使用 PostgreSQL 超级管理员账号。首次启动时
adapter 会执行：

```sql
CREATE SCHEMA IF NOT EXISTS box_engine;
CREATE TABLE IF NOT EXISTS box_engine."play_<mapUuid>_player" (...);
CREATE TABLE IF NOT EXISTS box_engine."play_<mapUuid>_player_keys" (...);
CREATE INDEX IF NOT EXISTS ...;
```

因此账号需要在目标数据库中拥有连接权限，并能创建或使用配置的 schema。初始化完成后，
也可以由数据库管理员收紧为只允许对 `box_engine` schema 中的数据空间表执行
`SELECT/INSERT/UPDATE/DELETE`。

不要让该账号访问支付、用户、运营后台或其他项目的业务表。

## 6. 查看启动状态

```bash
docker compose logs --tail=200 play
```

成功后日志包含：

```text
PostgreSQL legacy-compatible data storage ready
```

如果连接失败，检查：

- `BOX_DATABASE_URL` 是否能从容器所在机器访问；
- 云数据库白名单是否允许服务器 IP；
- PostgreSQL 端口和防火墙；
- SSL 配置；
- 数据库账号是否有 schema 和建表权限。

## 7. 更换数据库和关闭 PostgreSQL

修改 `.env` 后重新创建容器即可。连接信息从运行环境读取，不需要重新构建镜像。

关闭 PostgreSQL 数据空间：

```env
BOX_DATABASE_URL=
```

留空后自动恢复为本地文件数据空间，不需要选择驱动。

从旧 boxes 数据库迁移时，先把对应主表与 `_keys` 表恢复到配置的 schema。单地图、单运行时
部署可以设置：

```env
BOX_DATA_STORAGE_NAMESPACE=原作品ID
BOX_GROUP_STORAGE_NAMESPACE=原地图组ID
```

必须同时迁移主表和 `_keys` 表，不能只复制其中一张。引擎会通过
`_keys.record` 查找当前记录，并自动忽略 `isDelete=true` 的记录。

`BOX_DATA_STORAGE_NAMESPACE` 是进程级配置，不是每张地图各自的配置。在 Creator 或一个 Play
进程同时承载多张地图时，不能用一个全局旧作品 ID 映射所有地图。此时应把各旧表转换到目标地图
UUID 对应的表名，或在导入器中建立“旧 contentId -> mapUuid”的逐地图迁移；不要把所有地图都
指向同一个 namespace，否则 `getDataStorage` 会失去地图隔离。

## 8. 备份

数据位于配置 schema 的旧式数据空间表中，可以使用标准 PostgreSQL 工具整体备份：

```bash
pg_dump --format=custom --schema=box_engine --file=box-data.dump 数据库名
```

数据库备份由服主维护，不包含在地图工程包或游玩端 Docker 镜像中。

## 9. 与 boxes 数据空间的源码对照

以下结论只依据两个仓库中的第一方源码，不推测未包含在仓库内的线上服务实现。

### 已对齐

| 能力 | 对齐情况 | 说明 |
|---|---|---|
| 脚本 API | 已对齐 | `get`、`set`、`update`、`increment`、`list`、`remove`、`destroy` 的 MuDB 调度和返回结构沿用 boxes |
| 模式隔离 | 已对齐 | `edit` 与 `play` 使用不同命名空间 |
| 地图组隔离 | 已对齐 | 普通空间使用地图身份，group 空间使用主地图/地图组身份 |
| 值格式 | 已对齐 | 新写入保存为 `{ "content": value }`，读取时返回其中的 `content` |
| 删除语义 | 已对齐 | `_keys.isDelete=true` 逻辑删除，`remove` 返回删除前的当前值 |
| 历史版本 | 已对齐 | 每次写入新增历史记录，并让 `_keys.record` 指向当前记录 |
| 并发更新 | PostgreSQL 已对齐 | `update` 使用 ticket、事务和 PostgreSQL advisory lock，失败或超时回滚 |

主要源码依据：

- boxes Java adapter：`../boxes/services/game-server/src/storage/java-storage-api.ts`；
- boxes 脚本调度：`../boxes/services/game-server/src/storage/storage-controller.ts`；
- boxes API 契约：`../boxes/internals/apis/src/createra/storage.ts`；
- Local PostgreSQL adapter：`services/game-server/src/storage/postgres-data-storage.ts`；
- Local 双表兼容回归：`services/game-server/scripts/check-postgres-data-storage.ts`。

### 仍有差异或无法从源码证明完全相同

1. **地图身份不同。** boxes 请求使用数字 `contentId/groupId`；Local Engine 默认使用不可变
   `mapUuid` 和主地图 UUID。这保证访问 ID 改名后不丢档，但旧表不会仅凭复制就自动绑定到 UUID。
2. **多地图不能只靠全局旧 namespace。** 多地图 Play 会按每张地图发布清单中的 UUID 隔离；
   一个 `BOX_DATA_STORAGE_NAMESPACE=旧ID` 不能表达多张地图各自的旧 ID。
3. **超长物理表名不同。** PostgreSQL 标识符最多 63 字节。UUID 与较长 storage name 组合
   超限时，Local 使用确定性的 `storage_<sha256>` 表名；旧数字 ID 通常不会触发该规则。
4. **本地文件后端只保证脚本行为。** 它不是双表结构，也没有跨进程数据库锁。多个副地图并发
   写 `getGroupStorage` 时应使用 PostgreSQL，不能用文件后端承接旧数据库。
5. **错误细码不同。** boxes 的外部 Java 服务可能返回如 `33000009` 的业务错误；Local 目前
   对脚本统一包装为 `SERVER_FETCH_ERROR`，不能保证错误文本和细码逐字一致。
6. **分页边界和时间字段尚不能完全证明。** Local 明确按 JSON 数值、key 和分页偏移排序；
   boxes 仓库只包含把请求转发给 Java 服务的代码，Java 服务对 null、非数字、同值排序以及
   更新后的 `createTime` 规则不在仓库中。
7. **线上建表 DDL 不在 boxes 仓库。** Local 已按已知旧双表字段实现兼容，但在拿到旧库的
   schema-only dump 前，不能宣称覆盖所有历史版本的 PostgreSQL 字段类型、默认值和索引。
8. **单条数据限制尚未完全对齐。** boxes API 文档约束 key 最长 1000 字符、value 最多 2 MiB；
   Local 有请求速率/流量限制，但 PostgreSQL adapter 当前没有逐条执行同样的 key/value 上限。

### 迁移前必须验收的旧库信息

先从旧库导出结构，不带业务数据：

```bash
pg_dump --schema-only --schema=旧schema --file=boxes-storage-schema.sql 旧数据库名
```

至少核对一组普通空间和一组 group 空间：

- 主表与 `_keys` 表的完整名称；
- 所有列的类型、是否可空、默认值；
- `value` 中是否确实为 JSON 字符串且包含 `content`；
- `_keys.record` 是否指向主表 `objectId`；
- `isDelete` 的类型和历史数据取值；
- edit/play 的实际前缀；
- 原数字 `contentId` 与 `groupId` 的对应表。

因此当前准确定位是：**脚本行为高度兼容，已知旧双表可兼容，但多地图旧 namespace 自动映射和
未知历史 DDL 还没有达到“拿任意 boxes 数据库直接导入”的程度。** 正式迁移前应先用一份脱敏的
schema-only dump 做适配回归，再实现按地图的 `contentId/groupId -> mapUuid` 批量迁移命令。
