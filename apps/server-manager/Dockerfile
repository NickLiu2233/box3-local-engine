ARG DOCKER_CLI_IMAGE=docker:27.5.1-cli
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim

FROM ${DOCKER_CLI_IMAGE} AS docker-cli

FROM ${NODE_IMAGE}

ARG BOX_BUILD_VERSION=0.1.0
ARG BOX_BUILD_COMMIT=unknown
ARG BOX_BUILD_DATE=unknown
ARG BOX_BUILD_SOURCE=local

LABEL org.opencontainers.image.title="BOX Local Engine Server Manager" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV NODE_ENV=production \
    BOX_SERVER_MANAGER_HOST=0.0.0.0 \
    BOX_SERVER_MANAGER_PORT=3130

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose

WORKDIR /app
COPY apps/server-manager/package.json ./package.json
COPY apps/server-manager/server.js apps/server-manager/operations.js ./
COPY apps/server-manager/public ./public
COPY apps/deployment-manager/public/logo512.png ./public/logo512.png

EXPOSE 3130

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3130/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
