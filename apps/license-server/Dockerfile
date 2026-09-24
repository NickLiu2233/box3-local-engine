ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true RUSH_PNPM_STORE_PATH=/pnpm/store
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=box-license-server-pnpm,target=/pnpm/store \
    node common/scripts/install-run-rush.js install --to @box/license-server \
    && node common/scripts/install-run-rush-pnpm.js --rush-skip-checks deploy --filter @box/license-server --prod --legacy /opt/license-server

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
