ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim

FROM ${NODE_IMAGE}

ARG BOX_BUILD_VERSION=0.1.0
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
    AUTH_DEMO_PORT=3214

WORKDIR /app

COPY --chown=node:node server.js ./server.js
COPY --chown=node:node public ./public

USER node

EXPOSE 3214

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3214/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
