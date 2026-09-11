# 个人学习许可证

BOX3 Engine 当前仅提供免费申请、设备绑定的个人学习许可证。许可证仅允许个人学习、非营利研究和测试，不可转让或共享；收费服务、广告、赞助回报、商业课程、客户项目、托管、转售和二次分发均不在授权范围内，需要另行取得书面授权。

## 使用流程

1. 在桌面启动器或 Linux Web 管理端的“许可证管理”复制当前设备 ID。
2. 将设备 ID 提交给许可证管理方。
3. 管理方选择到期时间并签发以 `box3l1.` 开头的许可证内容。
4. 在当前管理端导入签发方提供的 `.boxlic` 文件。
5. 许可证有效时才能导入镜像、部署或启动 Creator、Play、VOXA、玩家服务和登录门户。

许可证的有效期以签发文件中的到期时间为准，到期后可以申请续期。设备更换、重装系统或清除安全存储导致设备 ID 改变时，也需要重新申请。更新许可证不会修改地图、地图库、玩家账号或数据库；即使许可证不可用，启动器仍应允许停止服务和备份数据。

## 验证方式

许可证由 Ed25519 私钥签发，启动器和业务镜像只保存公钥。管理端首先验证签名、有效期、设备 ID 和功能范围；业务容器在自身进程启动前再次执行相同检查，主服务和地图运行时子进程还会各自加载进程内校验器，并在运行期间每小时复查。修改有效期、设备 ID 或授权范围都会破坏签名；许可证到期后业务进程会安全退出，但不会删除用户数据。

设备 ID 由操作系统提供的稳定设备标识和本次安装独有的 256 位随机密钥组合后，通过 SHA-256 单向生成。原始硬件或系统标识不会显示、写入许可证或发送给签发方；只复制许可证和启动器数据到另一台设备无法继续使用。macOS 启动器将安装密钥存入系统 Keychain，并会迁移并删除旧版明文安装密钥。Windows 启动器会创建由 Microsoft Platform Crypto Provider 管理的 TPM ECDSA 密钥，只使用其公钥参与设备 ID 推导；TPM 私钥不会写入安装目录。Linux Web 管理端使用宿主机 `/etc/machine-id`。更换主机、重装操作系统、清除安全存储或更换 TPM 后，设备 ID 会变化，需要重新签发。

## 可信时间与回拨保护

启动器会持久化并校验最后观察到的时间；系统时间明显早于该时间时，许可证会拒绝运行。业务进程可设置 `BOX_LICENSE_TIME_URL` 使用 HTTPS 网络时间源。

首选运营方自建的签名时间服务：设置 `BOX_LICENSE_TIME_MODE=signed`，端点返回以 `box3t1.` 开头、由独立 Ed25519 时间私钥签名的令牌。首次启动会验证该时间，之后最长可使用 `BOX_LICENSE_TIME_MAX_AGE_MS`（默认 7 天）的签名缓存。时间公钥随发行包分发，时间私钥仅部署在运营方的 HTTPS 时间服务中。

也支持 QQ 的实时校时接口：

```env
BOX_LICENSE_TIME_URL=https://vv.video.qq.com/checktime?otype=json
BOX_LICENSE_TIME_MODE=qq-checktime
```

该接口的 `QZOutputJson.t` 是 Unix 秒级时间戳（显示为北京时间是时区转换问题）。它不含 BOX 签名，因此仅作为在线实时校时使用：每次启动和运行期间复查都需要能访问该接口，不会将其未签名结果当作可离线复用的 7 天可信缓存。未配置网络时间地址时仍有本地回拨检测，但不能等同于网络可信时间。

纯本地软件无法抵抗拥有宿主机 root/管理员权限的人替换二进制、镜像或 Docker 挂载。Keychain、TPM 与 Secure Enclave 的目的在于保护正常产品路径中的设备密钥，不能被描述为绝对防破解。当前 macOS 使用 Keychain；Secure Enclave 签名密钥需要发行版签名、系统权限和密钥轮换设计后单独启用，当前版本不会把普通文件误称为不可导出硬件密钥。

## 内部许可证后台（不随产品分发）

许可证后台是 BOX3 Engine 运营方内部使用的本机离线签发器。它不属于服主部署组件，也不会进入桌面启动器、Linux Web 部署包、业务镜像或公开 Release 附件。服主侧只包含许可证导入界面、离线验签逻辑和 Ed25519 公钥，没有签发能力。

签发器源码位于 `apps/license-server/`，采用 Node.js、Fastify 和 Zod，不连接 PostgreSQL、Redis 或外部平台，也不保存持有人、签发记录或许可证副本。管理员输入设备 ID 和自定义到期时间后，签发器直接使用本机 Ed25519 私钥生成许可证；页面支持复制内容或下载 `.boxlic` 文件。

首次开发部署：

```bash
node scripts/generate-license-keypair.js
node scripts/generate-license-time-keypair.js
cp apps/license-server/.env.example apps/license-server/.env
docker compose --env-file apps/license-server/.env \
  -f apps/license-server/docker-compose.yml up -d --build
```

日常操作直接使用 `docker compose --env-file apps/license-server/.env -f apps/license-server/docker-compose.yml`，再附加 `ps`、`logs -f license-server`、`stop` 或 `down`。只运行源码签发器时执行 `pnpm --dir apps/license-server start`；它仅供内部开发使用。

密钥生成命令只允许执行一次，不会覆盖已有密钥。`apps/license-server/.local/license-private-key.pem` 必须立即进行加密离线备份；丢失私钥后无法继续为现有发行版签发许可证。私钥只能在内部签发器运行时以只读文件挂载，禁止写入 Git、公共 Docker 构建上下文、发行镜像、启动器、日志和分享包。签发器只映射到本机 `127.0.0.1:3220`，不应通过公网反向代理对外开放。

纯离线许可证签发后无法远程即时吊销，最迟在许可证自身到期时失效。需要缩短风险窗口时应选择较短的到期时间并重新签发；未来若要求中途吊销，必须另行增加最小化的在线状态检查或短期运行凭证，不能通过隐藏后门、远程命令或读取服主数据实现。
