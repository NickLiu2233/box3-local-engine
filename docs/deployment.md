# 部署与联机

Play 是唯一可对外提供给玩家的业务页面。Creator、VOXA 和玩家管理页应留在本机或可信内网。

## 部署模式

- 本机：使用 `127.0.0.1`，适合开发和单机测试。
- 局域网：使用私网 IP，适合可信设备。
- 公网：使用 HTTPS 反向代理公开 Play 与登录门户；不要直接公开 Docker 管理端口。

登录门户负责页面跳转，Player Service 负责账号、会话和权限。Play 导入的是 `.boxplay`，不是 Creator 工程。

## 上线前检查

1. PostgreSQL、Play、Player Service 与登录门户均健康。
2. Play 和门户使用正确的公开 HTTPS 地址。
3. 玩家可登录、进入地图并返回大厅。
4. 备份 PostgreSQL 与重要工程。

具体端口和变量见[配置参考](./configuration-reference.md)，Play 管理见[游玩端部署](./play-deployment.md)。

## 反向代理要求

反向代理需要同时转发普通 HTTP、静态资源和 WebSocket，并把真实协议与来源信息传递给应用。登录门户、Play 公开地址和 Cookie 域应使用同一 HTTPS 策略；不要同时让浏览器混用 HTTP IP 地址和 HTTPS 域名。

公网服务器还应限制数据库、Redis、Creator、VOXA、Player Service 管理页和 Linux Web 管理端的入站访问。
