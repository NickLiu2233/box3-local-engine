# PostgreSQL 数据空间部署手册

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
BOX_GROUP_STORAGE_NAMESPACE=global
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
| `BOX_GROUP_STORAGE_NAMESPACE` | `global` | `getGroupStorage` 使用的实例级共享标识；所有地图应保持一致 |

不建议把 `BOX_DATABASE_SSL_REJECT_UNAUTHORIZED` 设为 `false`。只有数据库供应商明确使用
无法由系统信任链验证的证书时才临时关闭验证。

## 4. 数据隔离方式

- `world.getDataStorage(name)` 使用每张地图自己的 namespace，其他地图无法访问。
- `world.getGroupStorage(name)` 使用实例级 `BOX_GROUP_STORAGE_NAMESPACE`，默认是
  `global`，同一部署中的所有地图都能访问。
- 两类空间即使传入相同的 `name` 也使用不同的表，不会互相覆盖。

表名沿用旧 boxes 格式。以作品 ID `100010141` 和数据空间 `player` 为例：

```text
play_100010141_player
play_100010141_player_keys
edit_100010141_player
edit_100010141_player_keys
group_play_100010141_player
group_play_100010141_player_keys
group_edit_100010141_player
group_edit_100010141_player_keys
```

普通作品空间使用 `play_` / `edit_`，group storage 使用
`group_play_` / `group_edit_`。主表保存历史数据记录，`_keys` 表通过 `record`
指向当前记录，并使用 `isDelete` 表示逻辑删除。更新数据时会保留旧版本并切换
`_keys.record`。

多地图游玩端会始终把实际地图目录 ID 放进命名空间，因此 `island`、`city` 等地图即使使用
相同的数据空间名称，也不会互相覆盖。

创作端的 `edit` 数据与正式游玩端的 `play` 数据默认隔离，避免测试数据污染正式玩家存档。

## 5. 数据库账号权限

建议为引擎创建独立数据库和低权限账号，不要使用 PostgreSQL 超级管理员账号。首次启动时
adapter 会执行：

```sql
CREATE SCHEMA IF NOT EXISTS box_engine;
CREATE TABLE IF NOT EXISTS box_engine."play_100010141_player" (...);
CREATE TABLE IF NOT EXISTS box_engine."play_100010141_player_keys" (...);
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

从旧 boxes 数据库迁移时，先把对应主表与 `_keys` 表恢复到配置的 schema，然后设置：

```env
BOX_DATA_STORAGE_NAMESPACE=原作品ID
BOX_GROUP_STORAGE_NAMESPACE=原地图组ID
```

必须同时迁移主表和 `_keys` 表，不能只复制其中一张。引擎会通过
`_keys.record` 查找当前记录，并自动忽略 `isDelete=true` 的记录。

## 8. 备份

数据位于配置 schema 的旧式数据空间表中，可以使用标准 PostgreSQL 工具整体备份：

```bash
pg_dump --format=custom --schema=box_engine --file=box-data.dump 数据库名
```

数据库备份由服主维护，不包含在地图工程包或游玩端 Docker 镜像中。
