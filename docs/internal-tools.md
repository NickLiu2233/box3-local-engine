# 内部工具接入

作品迁移器是内部工具，不包含在公开源码、Rush 工作区、公开 CI 或发行包中。
没有这个工具也可以安装、开发、构建和运行引擎。

本机保留了一个调用入口，不包含迁移器实现：

```bash
node scripts/internal-migrator.js dev
node scripts/internal-migrator.js check
node scripts/internal-migrator.js build
node scripts/internal-migrator.js start
```

默认寻找与引擎同级的 `box-local-engine-internal/apps/migrator`。
其他位置可设置 `BOX_MIGRATOR_ROOT`，必须是公开仓库之外的绝对目录。
开发和本机启动默认只监听 `127.0.0.1:3212`。

已有依赖随工具迁移，外部共享库链接保持可用。重新安装依赖时运行：

```bash
node scripts/internal-migrator.js setup
```

第三方依赖安装在私有工具的 `.private-dependencies`，共享 `@box/*` 库引用公开工作区。
不要在私有目录直接运行包含 `workspace:` 依赖的普通 `npm install`；使用上述入口。

内部接口凭据放在私有工具自己的 `.env`，不要添加到公开仓库或命令行参数里。
入口保留这些服务器环境变量，提供本机缓存和默认运行资源模板的位置。
私有工具自己的 README 说明内部 Docker 构建与运行方式；内部镜像不能混入官方六镜像归档。

`apps/migrator/`、旧 `apps/license-server/` 和私有数据目录有 Git/Docker 排除规则。
这些规则不负责清除旧 Git 历史。新公开仓库应从已检查的源码建立，不复制旧 `.git`。
