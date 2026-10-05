ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /build
COPY apps/player-auth-portal/package.json apps/player-auth-portal/package-lock.json ./
RUN npm ci --include=dev --ignore-scripts
COPY apps/player-auth-portal/src ./src
COPY apps/player-auth-portal/server ./server
COPY apps/player-auth-portal/public ./public
COPY apps/player-auth-portal/scripts/tasks.ts apps/player-auth-portal/scripts/mock.ts ./scripts/
COPY apps/player-auth-portal/tsconfig.json apps/player-auth-portal/tsconfig.library.json ./
RUN npm run build

FROM ${NODE_IMAGE}

ARG BOX_BUILD_VERSION=0.3.0
ARG BOX_BUILD_COMMIT=unknown
ARG BOX_BUILD_DATE=unknown
ARG BOX_BUILD_SOURCE=local

LABEL org.opencontainers.image.title="BOX Local Engine Player Auth Portal" \
      org.opencontainers.image.description="Owner-hosted login and registration portal for BOX Local Engine" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV NODE_ENV=production \
    AUTH_DEMO_HOST=0.0.0.0 \
    AUTH_DEMO_PORT=3214 \
    BOX_LICENSE_FEATURE=player-auth-portal

WORKDIR /app

COPY --from=build --chown=node:node /build/build/server.cjs ./build/server.cjs
COPY --from=build --chown=node:node /build/public ./public
RUN mkdir -p /app/license && chown node:node /app/license
COPY --chown=node:node packages/license/index.js packages/license/runtime-gate.js packages/license/process-guard.js packages/license/trusted-time.js /app/license/
COPY --chown=node:node distribution/license-public-key.pem /app/license/license-public-key.pem
COPY --chown=node:node distribution/license-time-public-key.pem /app/license/license-time-public-key.pem

USER node

EXPOSE 3214

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3214/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "/app/license/runtime-gate.js", "player-auth-portal", "--"]
CMD ["node", "-r", "/app/license/process-guard.js", "build/server.cjs"]
