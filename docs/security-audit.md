# 生产依赖安全审计

审计日期：2026-08-18

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

1. 为 Creator、Play、Player Service、VOXA 和 Migrator 镜像生成 SBOM，确认 `static-eval` 是否进入最终运行层，而不只查看 workspace 依赖树。
2. 执行 `pnpm verify`、Creator/Play/VOXA/Migrator 生产构建、Compose 校验及 amd64/arm64 smoke test。
3. 对 `static-eval` 记录可触达性、隔离措施、负责人和复审日期；不能仅以“继承自 boxes”为理由永久忽略。
4. Dependabot/Renovate 只能提出升级，不允许自动合并 boxes 兼容层的 major 依赖更新。
5. 每次发布重新运行本命令；审计结果会随 npm 公告变化，本文数字只代表文首日期的锁文件。
