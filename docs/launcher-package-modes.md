# 启动器打包模式

桌面启动器和 Linux Web 管理端都支持两种模式，默认 `slim`。

| 模式    | 镜像来源                                          | 用途                                        |
| ------- | ------------------------------------------------- | ------------------------------------------- |
| `slim`  | 包内带镜像发行清单，缺失镜像从 OSS 按需下载并校验 | 精简发行包                                  |
| `local` | 导出当前本机 Docker 中的引擎镜像，随包携带        | 本地开发、快速测试，不依赖 OSS 获取引擎镜像 |

## 精简包

```sh
npm run package:desktop -- --target macos-arm64 --mode slim
npm run package:web -- --architecture arm64 --mode slim
```

默认会先构建发行镜像、生成清单，再生成精简启动器。已有归档或已发布的清单时，可通过 `--archive /path/to/images.tar.gz` 或 `--archive /path/to/catalog.json` 复用，避免重新构建镜像。

精简包的引擎镜像需要另行发布到 OSS；镜像清单中的归档名、大小、SHA-256 和内容 ID 必须与 OSS 文件一致。

## 本地测试包

```sh
npm run package:desktop -- --target macos-arm64 --mode local
npm run package:web -- --architecture arm64 --mode local
```

本地模式不重新构建或拉取镜像，只导出当前 Docker 中以下六个镜像：Creator、Play、VOXA、Player Service、登录门户和 Web Manager。默认选择 `box-local-engine-服务名:v版本-linux-架构`；缺少镜像或架构不匹配时停止打包。

代码修改后，先构建需要更新的镜像，再生成测试包。可通过 `--archive /path/to/images.tar.gz` 复用本地快照；快照中六个服务必须使用同一标签，打包会保留该标签和实际内容 ID，不混入 OSS 的旧版本。

- 桌面包：完整引擎镜像归档和校验清单放入应用资源；Windows/Linux 桌面放在程序旁。启动时校验并导入本地归档，不启用 OSS 镜像清单。
- Web 包：引擎镜像按服务拆分，放入 `cache/engine-images/`。安装管理端和后续启动服务均复用校验通过的本地归档。
- 本地归档缺失或损坏时明确报错，不自动回退到 OSS。

需要预先安装 Docker。若启用 PostgreSQL、Redis 或 Nginx，相应依赖镜像也需要在本机可用；本地测试包携带的是六个引擎服务镜像，不等同于完整操作系统离线安装包。

## 输出与校验

本地模式使用单独的 `local-images/` 归档目录，输出包名带 `-local`，不会覆盖精简发行包。

- 桌面包：`apps/local-engine/dist/desktop-installers/`
- Web 包：`apps/local-engine/dist/server-packages/`

桌面包使用 `verify-desktop-offline-package.js` 校验，Web 包使用 `verify-headless-server-package.js` 校验。两种模式都检查版本、架构和文件完整性；本地模式额外检查随包镜像的 SHA-256。
