# 构建与分发

当前 `0.1.1` 为发布候选版本。公开分发前需要 Windows Authenticode 签名，以及 Apple Developer ID 签名和 macOS 公证。

## 发布流程

```bash
pnpm verify
pnpm audit --prod --audit-level=high
pnpm build:desktop-installer <target> <image-archive>
pnpm build:headless-server-package <platform>
```

公开发行只能从干净工作区的 `v*` Tag 构建。Tag CI 会运行验证，并构建 Windows x64、Apple Silicon macOS、Linux x64 桌面包，以及 Linux amd64/arm64 服务器包和镜像归档。CI 必须同时注入本节的 `BOX_BUILD_*` 构建元数据。不得把本机测试包、未提交改动构建或使用 `BOX_ALLOW_DIRTY_RELEASE=true` 构建的包上传到公开 Release。

桌面离线包包含启动器与所需镜像；Linux 无图形包包含 Creator、VOXA、Play、Player Service、登录门户和 Web 管理端，不包含迁移器或内置 PostgreSQL/Redis。Release 不得包含 `.env`、地图、项目、备份、数据库卷、日志或真实密钥。

发布前应在干净环境解压完整包，导入镜像并完成以下验收：

1. 执行生产依赖审计；存在 high 或 critical 漏洞时不得发布，除非已完成风险评估和缓解。
2. 初始化 PostgreSQL；分别验证不启用、内置和外部 Redis 配置。
3. 启动 Creator、Play、VOXA、Player Service 和登录门户；完成注册开关、登录、创作者权限和地图进入验证。
4. 在启动器的“工程运行时”页确认 Creator/Play 状态、主地图/副地图分组，以及空闲运行时的 CPU、内存和回收行为。
5. 停止并再次启动服务，确认工程、地图库、数据库和配置仍可读取。
6. 校验离线包 SHA-256，并执行 `node scripts/verify-desktop-offline-package.js <解压目录>`。

升级测试还应确认旧 `box-play-storage` 不再被引用，新的 `box-play-runtime-cache` 可以重建。

## 版本与签名

同一离线包中的 App、镜像归档和清单必须来自同一构建。GitHub Release 只上传发行物和校验信息，不上传用户数据。Windows 公开分发使用 Authenticode；macOS 使用 Developer ID 签名和公证，否则系统可能提示未知开发者或阻止启动。

发行 CI 应在镜像中写入 `BOX_BUILD_VERSION`、`BOX_BUILD_COMMIT`、`BOX_BUILD_DATE` 和 `BOX_BUILD_SOURCE`。Play 游戏内“关于”使用这些值显示 `版本-local · 提交短号`；缺少有效提交号时只显示版本。发布前核对 App、镜像归档和该显示信息均来自同一个 Tag 构建。
