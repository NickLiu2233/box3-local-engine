# 构建与分发

当前 `0.1.0` 为内部测试版本。公开分发前需要 Windows Authenticode 签名，以及 Apple Developer ID 签名和 macOS 公证。

## 发布流程

```bash
pnpm verify
pnpm build:desktop-installer <target> <image-archive>
pnpm build:headless-server-package <platform>
```

推送 `v*` Tag 会运行验证并构建 Windows x64、Apple Silicon macOS、Linux x64 桌面包，以及 Linux amd64/arm64 服务器包和镜像归档。

桌面离线包包含启动器与所需镜像；Linux 无图形包只包含 Play、Player Service、登录门户和 Web 管理端。Release 不得包含 `.env`、地图、项目、备份、数据库卷、日志或真实密钥。

发布前应在干净环境解压完整包，导入镜像并完成一次启动、登录、地图进入和停止验证。

## 版本与签名

同一离线包中的 App、镜像归档和清单必须来自同一构建。GitHub Release 只上传发行物和校验信息，不上传用户数据。Windows 公开分发使用 Authenticode；macOS 使用 Developer ID 签名和公证，否则系统可能提示未知开发者或阻止启动。
