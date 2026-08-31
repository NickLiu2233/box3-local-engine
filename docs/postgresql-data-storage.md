# PostgreSQL 数据空间

PostgreSQL 保存玩家身份与地图服务端持久数据，是生产部署的正确性来源。

## 配置

至少设置：

```env
BOX_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Player Service 默认使用 `box_identity` schema；地图运行时默认使用 `box_engine` schema。地图数据按不可变地图 UUID 隔离，主图与副地图可通过地图组数据空间共享组级数据。

## 运维

- 使用权限最小化的数据库账号；公网连接启用 TLS。
- 数据库迁移由服务启动处理，不要手工修改表结构。
- 定期备份数据库；工程备份和 Play 地图库不能替代数据库备份。

完整变量与连接排障见[配置参考](./configuration-reference.md)。

## 备份与恢复

数据库备份至少覆盖 `box_identity` 和 `box_engine`。恢复到新环境后，保持相同的地图 UUID、数据 schema 和密钥配置，先验证 Player Service 登录，再启动 Play。不要把生产数据库连接串写进发布包、地图脚本或浏览器配置。
