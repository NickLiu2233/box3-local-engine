# 启动空白窗口修复

> 历史修复记录：只对应本文日期与平台。当前使用见[部署管理器](./graphical-deployment-manager.md)，不能由此推断新版安装包已验收。

日期：2026-10-08，版本：v0.3.0，平台：macOS ARM64。

Docker 构建期间出现只读文件系统错误，随后用户截图确认 Docker 启动日志无法写入，报错为 `no space left on device`。当 Docker 状态查询挂起时，启动器原先等待全部状态查询结束才首次渲染，且 Docker 查询使用同步 Tauri 命令，会阻塞界面线程。

## 修复

- 桌面界面先渲染，再获取状态。
- 系统状态、托管数据库状态及手动 Docker 检查移到后台阻塞线程执行。
- Docker 只读探测和 Compose 状态查询增加 15 秒超时；超时结束当前探测子进程。镜像下载、导入和服务变更命令保留原有执行方式。

## 验证与产物

- 新增回归先复现：Docker 状态永不返回时，旧版页面内容为空；修复后能显示界面。
- 界面回归 17 项通过；原生 Docker 适配器测试 3 项通过，覆盖超时、输出、失败信息及 macOS 工具路径。
- Rust release 编译、界面生产构建、应用打包与离线包验证通过。
- 实际打开新应用，服务总览显示“Docker 未连接”，并成功切换到“关于”页面，确认界面可交互。
- 清理可重建 Rust 调试缓存后，可用空间约 9 GB；未删除镜像、容器卷、旧安装包，未重启 Docker。Docker 恢复及业务服务启动尚未验收。

修复包：`apps/local-engine/dist/release-candidates/ssl-20261008/BOX-Local-Engine-0.3.0-ssl-startup-fix-20261008-macos-arm64.zip`。

SHA-256：`681593fc80d3a096db720d6b1c6e8a9f5caa40e7f665dd73c00577674e3fe779`。

仍为未提交源码构建的测试候选包，ad-hoc 签名、未 Apple 公证。内置服务镜像沿用 2026-10-07 归档，Web 管理器尚未包含证书管理更新；Nginx 首次使用需要本机镜像或联网下载。参见[之前的打包范围](./ssl-launcher-package-20261008.md)。
