ARG NODE_IMAGE=docker.1ms.run/library/node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV CI=true NEXT_TELEMETRY_DISABLED=1 RUSH_PNPM_STORE_PATH=/pnpm/store
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=box-local-engine-migrator-pnpm,target=/pnpm/store \
    node common/scripts/install-run-rush.js install --to @box-local/migrator
RUN cd apps/migrator && node ../../common/scripts/install-run-rushx.js build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3212 \
    BOX_MIGRATOR_RUNTIME_TEMPLATE=/app/runtime-template
RUN apt-get update && apt-get install -y --no-install-recommends tini tar gzip ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENTRYPOINT ["tini", "--"]
COPY --from=build --chown=node:node /app/apps/migrator/.next/standalone /app
COPY --from=build --chown=node:node /app/apps/migrator/.next/static /app/apps/migrator/.next/static
COPY --from=build --chown=node:node /app/apps/local-engine/data /app/runtime-template
USER node
EXPOSE 3212
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3212').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/migrator/server.js"]
