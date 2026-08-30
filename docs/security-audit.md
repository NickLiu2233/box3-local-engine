# 生产依赖与应用边界安全审计

依赖快照日期：2026-08-18。应用边界复核日期：2026-08-30。

执行命令：

```bash
pnpm audit --prod --audit-level high
```

## 结论

当前生产依赖树共报告 19 条已知漏洞：

- Critical：0
- High：1
- Moderate：12
- Low：6

相较初次审计的 159 条（6 Critical / 67 High / 73 Moderate / 13 Low），网络暴露面和直接依赖中的 Critical 已清零。剩余唯一 High 仍需在公开分发前完成兼容替换或正式的可触达性评审；`pnpm verify` 通过不能替代这项安全判断。

上述数字是锁文件在依赖快照日期的结果，不代表永久结论。npm 公告变化后必须重新运行审计，
不能只修改本文数字。

## 应用安全边界

| 边界             | 当前规则                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- |
| 客户端地图脚本   | 在玩家浏览器执行，视为完全不可信；DTS 不构成沙箱，客户端结果必须由服务端验证            |
| 服务端地图脚本   | 在 isolated-vm 中运行，受脚本内存与生命周期限制；不暴露 Node.js、宿主文件或数据库凭据   |
| 外部 HTTP(S) URL | 不使用平台域名白名单；拒绝脚本/文件协议、控制字符、URL 凭据和非绝对地址                 |
| 玩家会话         | 普通玩家单设备有效；Cookie 为 HttpOnly，公网要求 HTTPS；后台管理员使用独立账号与 Cookie |
| 服主权限         | 只能用 `BOX_PLAY_ADMIN_TOKEN` 兑换短期服主会话，不能分配给玩家或后台管理员账号          |
| 管理 API         | 服务端强制认证和权限组检查；前端隐藏按钮不作为授权依据                                  |
| 数据正确性       | PostgreSQL 是账号和持久数据来源；Redis 仅缓存，失效不能改变权限或存档结果               |

客户端脚本可以被浏览器扩展、开发者工具或修改后的客户端干预，因此反作弊不能依靠压缩、混淆、
隐藏 API 或减少 DTS。移动、命中、奖励、购买、传送和存档写入等敏感行为必须由 game-server
校验频率、状态与权限。当前已删除在线平台支付成功事件和社交统计接口，本地运行时不得模拟这些结果。

登录 Origin、returnUrl 允许列表、Cookie Domain 与资源 CORS 是服务之间的访问边界；它们与
地图脚本可访问的目标域名不是同一个概念，不能因为取消平台资源域名白名单而放宽。

## 已完成的主要升级

以下升级已经写入工作区依赖与锁文件，并通过 Creator/Play 生产构建：

- Next.js、form-data、nanoid、PostCSS、crypto-js、minimist 和 yaml 的已知 Critical/High 修复版本；
- Webpack `5.102.1`、Rollup `4.59.0`、Sharp `0.35.0`；
- Mudb/game-server 的 `ws@7.5.13`，保持 7.x wire protocol 范围；
- Axios `1.18.0`，并将遗留 `0.21.4` 解析到 `0.32.0`；
- minimatch、serialize-javascript、undici、Mermaid 和 DOMPurify 的公告修复版本；
- 删除 Game 中没有源码引用的直接 `svgo@1.3.2`。

## 剩余 High：static-eval

```text
internals/build-system
└─ ndarray-resample@1.0.1
   └─ cwise@1.0.10
      └─ static-module@1.5.0
         └─ static-eval@0.2.4
```

- 公告：`GHSA-x9hc-rw35-f44h`，`static-eval <= 2.0.1` 可能导致沙箱逃逸或任意代码执行。
- 当前用途：该链由 boxes 的 ndarray/cwise 数值构建路径使用，不是 HTTP、WebSocket、上传或登录接口的直接依赖。
- 风险边界：正常路径传入的是 cwise 生成表达式，但包仍存在于生产依赖树，不能仅凭“间接依赖”判定无风险。
- 暂不采用根级 major override：`static-module@1.5.0` 依赖的是 0.x API，强制替换为 2.x 可能改变代码生成语义并破坏地形、体素或烘焙结果。
- 关闭条件：优先从 boxes 同步已验证的新 ndarray/cwise 链；否则为构建输入建立明确的可信边界并增加恶意表达式回归，再由发布负责人记录临时风险接受。

## 不进入生产审计的测试工具链

完整开发依赖审计还会看到 `packages/mudb > tape-run > browser-run > electron-stream > electron` 及 `extract-zip` 的旧公告。`tape-run` 只服务 Mudb 浏览器测试，不属于 `pnpm audit --prod` 结果，也不应复制到发布镜像。保留它是为了维持 boxes 的历史测试入口；若后续裁剪，必须同步替换对应浏览器测试能力。

## 修复流程

1. 为用户发行的 Creator、Play、Player Service、登录门户和 VOXA 镜像生成 SBOM，确认 `static-eval` 是否进入最终运行层，而不只查看 workspace 依赖树；内部 Migrator 单独审计，不混入发行清单。
2. 执行 `pnpm verify`、Creator/Play/VOXA 生产构建、Compose 校验及 amd64/arm64 smoke test；内部 Migrator 运行自己的测试与构建检查。
3. 对 `static-eval` 记录可触达性、隔离措施、负责人和复审日期；不能仅以“继承自 boxes”为理由永久忽略。
4. Dependabot/Renovate 只能提出升级，不允许自动合并 boxes 兼容层的 major 依赖更新。
5. 每次发布重新运行本命令；审计结果会随 npm 公告变化，本文数字只代表文首日期的锁文件。
