# 部署与联机

Play 与登录门户是面向普通玩家的公开页面。Creator 和 VOXA 可按需提供远程创作，但风险高；玩家管理页和 Linux Web 管理端应留在本机、可信内网或受控管理网络。

## 部署模式

- 本机：使用 `127.0.0.1`，适合开发和单机测试。
- 局域网：使用私网 IP，适合可信设备。
- 公网：使用 HTTPS 反向代理公开 Play 与登录门户。远程创作还必须限制 Creator/VOXA 的访问来源和创作者权限；不要直接公开 Docker 管理端口。

登录门户负责页面跳转，Player Service 负责账号、会话和权限。Play 导入的是 `.boxplay`，不是 Creator 工程。

## 上线前检查

1. PostgreSQL、Play、Player Service 与登录门户均健康。
2. Play 和门户使用正确的公开 HTTPS 地址。
3. 玩家可登录、进入地图并返回大厅。
4. 备份 PostgreSQL 与重要工程。

具体端口和变量见[配置参考](./configuration-reference.md)，游玩地图管理见[游玩端部署](./play-deployment.md)。

## 反向代理要求

反向代理需要同时转发普通 HTTP、静态资源和 WebSocket，并把真实协议与来源信息传递给应用。登录门户、Play 公开地址和 Cookie 域应使用同一 HTTPS 策略；不要同时让浏览器混用 HTTP IP 地址和 HTTPS 域名。

公网服务器还应限制数据库、Redis、Player Service 管理页和 Linux Web 管理端的入站访问。若开放 Creator/VOXA，只允许可信创作者通过 HTTPS、VPN 或其他访问控制进入。
