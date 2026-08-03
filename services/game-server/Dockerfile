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
RUN pnpm build:server

FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    BOX_SERVER_HOST=0.0.0.0 \
    BOX_SERVER_PORT=9966 \
    BOX_SERVER_DATA_PATH=/app/apps/local-engine/data

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 服务端镜像只保留权威服务器、运行资源和 workspace 引擎模块，不包含网页客户端。
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/services/game-server /app/services/game-server
COPY --from=builder --chown=node:node /app/apps/local-engine /app/apps/local-engine
COPY --from=builder --chown=node:node /app/internals /app/internals
COPY --from=builder --chown=node:node /app/packages /app/packages

USER node

EXPOSE 9966
VOLUME ["/app/apps/local-engine/data"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.BOX_SERVER_PORT||9966)+'/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "apps/local-engine/src/launcher.js", "--production", "--server-only"]
