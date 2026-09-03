ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true PNPM_HOME=/pnpm PATH=/pnpm:$PATH
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/license-server ./apps/license-server
COPY packages/license ./packages/license
RUN --mount=type=cache,id=box-license-server-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @box-local/license-server... \
    && pnpm --filter @box-local/license-server deploy --prod --legacy /opt/license-server

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    BOX_LICENSE_HOST=0.0.0.0 \
    BOX_LICENSE_PORT=3220
WORKDIR /app
COPY --from=build --chown=node:node /opt/license-server /app
USER node
EXPOSE 3220
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3220/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
