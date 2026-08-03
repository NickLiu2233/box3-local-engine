ARG NODE_IMAGE=node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE} AS builder

ENV CI=true \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NODE_OPTIONS=--max-old-space-size=8192

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app
COPY . .

RUN --mount=type=cache,id=box-local-engine-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build:client

FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    BOX_PLAYER_CLIENT_ONLY=true \
    BOX_CLIENT_HOST=0.0.0.0 \
    BOX_CLIENT_PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Next standalone 会自动追踪网页运行时真正需要的依赖。
# 玩家镜像不再复制仓库源码、编辑器源码、Monaco 或游戏服务端。
COPY --from=builder --chown=node:node /app/apps/game/.next/standalone /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.BOX_CLIENT_PORT||3000)+'/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "apps/game/server.js"]
