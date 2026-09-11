# 创作端部署

Creator 用于创建、编辑、预览、导入和发布地图，默认仅本机访问。启动器也支持局域网和公网模式；公网模式会给出风险警告，必须配合 HTTPS、网络访问控制、创作者账号和最小权限使用。

## 启动

桌面用户在启动器中选择“创作端”。源码环境使用：

```bash
node apps/local-engine/src/deploy.js creator
node apps/local-engine/src/deploy.js creator-up
node apps/local-engine/src/deploy.js stop
```

Creator 依赖 Player Service；首次启动前应配置 PostgreSQL、`PERMISSION_TOKEN_SECRET` 和玩家服务 API Key。

## 数据与交付

- `.boxproject`：可编辑工程，交给作者或可信协作者。
- `.boxplay`：只读发布快照，交给 Play 服主。
- 工程数据属于当前部署数据根。开发工作区和桌面启动器运行时目录不自动同步。

不要手工修改项目状态或 Blob。备份、迁移和恢复使用 Creator 或启动器功能；发布前确保主地图和副地图均已保存。

配置请见[配置参考](./configuration-reference.md)，地图流程请见[项目与发布包](./projects.md)。

## 日常维护

Creator 项目包括工程状态、资源 Blob、地图组关系和发布记录。切换设备或协作时导出 `.boxproject`；交付服主时发布 `.boxplay`。恢复工程或替换版本前先关闭旧编辑页，避免浏览器仍持有旧状态。

页面无法打开时依次检查 Creator 容器、Player Service、登录门户 URL 和浏览器网络；保存失败时再检查项目目录权限、PostgreSQL 和 Creator 日志。不要通过删除项目目录解决保存问题。
