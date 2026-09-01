# 自建登录门户

默认登录门户是参考实现，可替换为服主自己的网页。自建门户必须由服务端持有 `BOX_PLAYER_AUTH_API_KEY` 并代理 Player Service 请求；浏览器不能直接携带该密钥。

配置 `BOX_PLAYER_LOGIN_URL` 为门户地址，并将门户 Origin 写入 `BOX_PLAYER_AUTH_ALLOWED_ORIGINS`。公网使用 HTTPS，并只允许明确的回跳地址；不要使用 `*`、开放跳转或把 Cookie、Token 放入 URL。

推荐链路为：浏览器提交到登录门户，门户服务端调用 Player Service，Player Service 写入 `HttpOnly` Cookie，再跳回经过白名单校验的 Creator 或 Play 地址。注册关闭时，门户必须同时隐藏注册入口并拒绝注册接口。

上线前验证注册/登录、单设备会话替换、会话续期、退出、错误回跳、注册关闭和跨域拒绝行为。门户不可记录明文密码、完整 Cookie 或 API Key。
