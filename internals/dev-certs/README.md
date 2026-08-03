# Dev Certificates 本地开发证书

本模块提供本地开发环境需要的 SSL 证书，当你需要 HTTPS 进行调试时可以使用。

## 为项目添加此模块

如果你想在项目中使用HTTPS，需要：
1. 引入此包，通过此包提供的 `getCACert`、`getCert`、`getKey`，来根据所需要的域名选择 `certs/` 对应路径下的的证书在项目中应用；
2. 目前 game 以及 game-server 均根据环境变量 `DEV_DOMAIN` 选择证书，如无特殊需求，请统一使用此变量来决定所需要使用的域名

## 使用

### 项目侧

在本地环境变量中设置 `DEV_DOMAIN` 为你需要的域名，目前支持三种，对应到三套线上环境：
   - xxx.dao3.fun
   - xxx.createra.fun
   - xxx.box3.fun

### 桌面端

1. 安装 `certs/minica.pem` 证书;
2. 配置 hosts 文件指向对应的域名；
   
### 移动端

需要安装系统根证书 `certs/4e6644bb.0` 并按移动设备的开发代理方案修改 hosts。
