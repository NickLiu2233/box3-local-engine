# 本地基础设施

PostgreSQL 是本地部署的必需组件，用于玩家身份、权限、审计和地图持久数据。Redis 是可选缓存；不可把 Redis 当作账号、权限或存档的唯一来源。

开发环境可启动仓库内基础设施：

```bash
pnpm infra
pnpm infra:stop
```

生产环境应使用受控 PostgreSQL，限制网络访问并单独备份数据库。连接、容量与 SSL 配置见[配置参考](./configuration-reference.md)，数据隔离规则见[PostgreSQL 数据空间](./postgresql-data-storage.md)。

本地 `pnpm infra` 只适合开发测试。生产环境应设置独立账号、强密码、TLS 和备份策略；服务重启、Redis 清理或地图重新导入不应被当成数据库备份方案。
