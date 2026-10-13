# 未安装本机 Nginx 时保存 SSL 配置

> 历史验收：只对应本文日期与样本。当前来源、保存和应用流程见[Nginx 指南](./https-certificate-management.md)。

日期：2026-10-08；版本：v0.3.0。

外部本机模式下，未找到 Nginx 可执行文件时仍校验并保存地址、证书和私钥，记录 pendingLocal 待应用状态，返回安装提醒而不抛出保存失败。证书区域持续显示安装提醒；安装并启动 Nginx 后再次保存会复用已保存证书，自动更新并重载，清除待应用状态。

检测通过执行 nginx -V，依次检查 PATH、Homebrew 和常见 Unix 可执行文件路径。只有候选可执行文件均不存在才视为未安装；执行权限、配置路径、证书校验和重载错误仍按实际错误报告。

验证：共享后端 97 项通过，2 项隔离 Docker 验收默认忽略；本机 Nginx 隔离验收单独运行通过。界面与传输 40 项通过，包含未安装时保存提醒、证书待应用提示及安装后不重新上传证书的再次保存。界面生产构建、ZIP 解压完整性、macOS 严格签名及 git diff --check 通过。

本机 Nginx 隔离验收首次复核遇到 Docker Desktop 挂载对原子替换的短暂传播延迟，测试夹具已改为等待主配置和片段与宿主文件同步后再校验，复核通过；产品代码没有忽略 Nginx 校验错误。

候选包：apps/local-engine/dist/release-candidates/ssl-20261008/BOX-Local-Engine-0.3.0-nginx-deferred-rc-20261008-macos-arm64.zip。

SHA-256：8fce8b4c5988e2ef65e6e16b41bbe7c0435e750eabeb73497c1a37eedd89e707。

包包含未提交修改，属于 macOS ARM64 测试候选包，采用 ad-hoc 签名，未 Apple 公证。服务镜像未重建，Web 管理器未部署更新；没有安装本机 Nginx或修改真实系统 Nginx 配置。
