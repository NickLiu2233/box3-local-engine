# v0.3.0 桌面证书管理候选包

> 历史候选包：只对应本文日期、平台与产物，不证明当前安装包或容器已更新。当前操作见[Nginx 指南](./https-certificate-management.md)。

构建日期：2026-10-08。桌面启动器已重新构建，加入“访问设置 → HTTPS 与证书管理”，支持托管 Nginx、证书导入、状态检查及已有 Nginx 配置导出。

## 产物与范围

- 平台：macOS ARM64；本次没有生成 Windows 或 Linux 原生启动器。
- ZIP：`apps/local-engine/dist/release-candidates/ssl-20261008/BOX-Local-Engine-0.3.0-ssl-desktop-rc-20261008-macos-arm64.zip`。
- SHA-256：`22c18527f07a2d5e276cf85ba605e7505f4bcad32e614e909e563c7c96fd9579`。
- 源码基线：`2f8bb666b8302c25684e912f632144be693dd63c`，包含未提交的证书管理修改，构建来源为 `local-dirty`；属于测试候选包。
- 源码在镜像构建尝试前与桌面构建后指纹一致：`eaea9845ffaabbd551212e74ea7607693636ef9e4ff14f898c87c46077073a64`。
- macOS 应用使用 ad-hoc 签名，未进行 Apple 公证。

内置六个服务的镜像归档沿用 2026-10-07 的 `local-no-license` 构建，版本标签为 `v0.3.0-linux-arm64`，归档 SHA-256 为 `4e79cecafd8369114c05acc5ee14e2abafd3a49638903a205049d788e885ad57`。其提交号记录为 `unknown`，不能视为当前源码的完整发行构建。该归档中的 Web 管理器尚未包含本次证书管理更新。

`nginx:1.28-bookworm` 未嵌入六服务离线归档，托管入口首次使用需要本机已有该镜像或能够下载。运行引擎仍需 Docker 正常工作。

## 实际验证

- 打包与离线包校验脚本回归：6 项通过。
- 桌面界面生产构建、Rust release 编译、Tauri 应用打包：通过。
- 原始安装目录及 ZIP 解压目录的离线包验证：通过。
- 解压应用 `codesign --verify --deep --strict`：通过；二进制确认为 Mach-O ARM64。
- 前端构建产物包含证书管理界面及对应命令；内置镜像清单包含六项 `linux/arm64` 镜像。
- 功能测试范围见[证书管理说明](./https-certificate-management.md)。新包未进行安装后的运行验收。

## 镜像构建阻断

尝试同步重建六个服务时，Docker 构建层报告只读文件系统；随后 Docker CLI 返回 `Docker Desktop is unable to start`。已停止本轮阻塞的构建进程。未主动重启 Docker，也未主动停止或更新业务容器；Docker 自身故障后无法继续确认容器运行状态。

因此本次交付是更新后的桌面启动器搭配原有服务镜像，不代表六个服务已同步更新，也不具备公开发行的完整验证结论。恢复 Docker 后还需重新构建镜像并重新打包验收。

旧 ZIP 和旧镜像归档保留在本次候选目录的 `PREVIOUS-*` 文件中。构建来源、指纹和校验值记录在该目录的 `BUILD-EVIDENCE.json` 与 `SHA256SUMS`。没有部署此候选包。
