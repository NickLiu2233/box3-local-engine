ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22.17.0-bookworm-slim
ARG BOX_BUILD_VERSION=0.1.0
ARG BOX_BUILD_COMMIT=unknown
ARG BOX_BUILD_DATE=unknown
ARG BOX_BUILD_SOURCE=local

FROM ${NODE_IMAGE} AS source-base

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
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

FROM source-base AS engine-build-base

RUN --mount=type=cache,id=box-local-engine-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --filter @box-local/game... \
      --filter @box-local/game-server... \
      --filter @box-local/local-engine...

# Generated content-addressed runtime resources are intentionally excluded
# from Git. Rebuild them inside the shared build stage so clean CI checkouts
# and local Docker builds produce the same Creator/Play runtime data.
RUN pnpm prepare:assets

FROM engine-build-base AS creator-build

RUN pnpm build:creator
RUN node apps/local-engine/src/stage-runtime-data.js /opt/runtime-data
RUN --mount=type=cache,id=box-local-engine-pnpm,target=/pnpm/store \
    npm_config_registry=https://registry.npmmirror.com \
    npm_config_sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips \
    pnpm --filter @box-local/game-server deploy --prod --legacy /opt/game-server \
    && mkdir -p /opt/game-server/player \
    && cp services/game-server/src/player/default-avatar.json /opt/game-server/player/default-avatar.json \
    && rm -rf /opt/game-server/src /opt/game-server/scripts /opt/game-server/dist/scripts \
    && find /opt/game-server -type f \( \
      -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
      -o -name '*.map' -o -name '*.ts' -o -name '*.tsx' -o -name '*.nft.json' \
    \) -delete \
    && find /opt/game-server -depth -type d \( \
      -name '.github' -o -name '.circleci' -o -name '.vscode' \
      -o -name 'test' -o -name 'tests' -o -name '__tests__' \
      -o -name 'docs' -o -name 'examples' -o -name 'example' \
      -o -name 'benchmark' -o -name 'benchmarks' -o -name 'coverage' -o -name 'man' \
    \) -exec rm -rf {} + \
    && find /opt/game-server -type f \( \
      -iname 'README*' -o -iname 'CHANGELOG*' -o -iname 'HISTORY*' \
      -iname 'CONTRIBUTING*' -o -iname 'AUTHORS*' -o -iname '*.md' \
      -o -iname '*.markdown' -o -name 'yarn.lock' -o -name 'package-lock.json' \
    \) -delete \
    && rm -rf /opt/game-server/node_modules/@types \
      /opt/game-server/node_modules/.pnpm/node_modules/@types \
    && find /opt/game-server/node_modules/.pnpm -mindepth 1 -maxdepth 1 -type d \
      -name '@types+*' -exec rm -rf {} + \
    && rm -f /opt/game-server/node_modules/.modules.yaml \
    && cd /opt/game-server \
    && node -e "const fs=require('node:fs'),path=require('node:path');const env=require.resolve('@box-local/env');const yaml=require.resolve('yaml',{paths:[path.dirname(env)]});const directives=path.join(path.dirname(yaml),'doc','directives.js');if(!fs.existsSync(directives))throw new Error('Incomplete yaml runtime: '+directives)" \
    && cd /app/services/game-server \
    && node scripts/compact-runtime-javascript.js /opt/game-server/dist /app/apps/local-engine/src

FROM engine-build-base AS play-build

RUN pnpm build:play
RUN node apps/local-engine/src/stage-runtime-data.js /opt/runtime-data
RUN --mount=type=cache,id=box-local-engine-pnpm,target=/pnpm/store \
    npm_config_registry=https://registry.npmmirror.com \
    npm_config_sharp_libvips_binary_host=https://npmmirror.com/mirrors/sharp-libvips \
    pnpm --filter @box-local/game-server deploy --prod --legacy /opt/game-server \
    && mkdir -p /opt/game-server/player \
    && cp services/game-server/src/player/default-avatar.json /opt/game-server/player/default-avatar.json \
    && rm -rf /opt/game-server/src /opt/game-server/scripts /opt/game-server/dist/scripts \
      /opt/game-server/dist/src/edit /opt/game-server/dist/src/deploy \
      /opt/game-server/node_modules/@ai-sdk \
      /opt/game-server/node_modules/@openrouter \
      /opt/game-server/node_modules/ai \
      /opt/game-server/node_modules/.pnpm/node_modules/@ai-sdk \
      /opt/game-server/node_modules/.pnpm/node_modules/@openrouter \
      /opt/game-server/node_modules/.pnpm/node_modules/ai \
    && find /opt/game-server/node_modules/.pnpm -mindepth 1 -maxdepth 1 -type d \( \
      -name '@ai-sdk+*' -o -name '@openrouter+*' -o -name 'ai@*' \
    \) -exec rm -rf {} + \
    && find /opt/game-server -type f \( \
      -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
      -o -name '*.map' -o -name '*.ts' -o -name '*.tsx' -o -name '*.nft.json' \
    \) -delete \
    && find /opt/game-server -depth -type d \( \
      -name '.github' -o -name '.circleci' -o -name '.vscode' \
      -o -name 'test' -o -name 'tests' -o -name '__tests__' \
      -o -name 'docs' -o -name 'examples' -o -name 'example' \
      -o -name 'benchmark' -o -name 'benchmarks' -o -name 'coverage' -o -name 'man' \
    \) -exec rm -rf {} + \
    && find /opt/game-server -type f \( \
      -iname 'README*' -o -iname 'CHANGELOG*' -o -iname 'HISTORY*' \
      -iname 'CONTRIBUTING*' -o -iname 'AUTHORS*' -o -iname '*.md' \
      -o -iname '*.markdown' -o -name 'yarn.lock' -o -name 'package-lock.json' \
    \) -delete \
    && rm -rf /opt/game-server/node_modules/@types \
      /opt/game-server/node_modules/.pnpm/node_modules/@types \
    && find /opt/game-server/node_modules/.pnpm -mindepth 1 -maxdepth 1 -type d \
      -name '@types+*' -exec rm -rf {} + \
    && rm -f /opt/game-server/node_modules/.modules.yaml \
    && cd /opt/game-server \
    && node -e "const fs=require('node:fs'),path=require('node:path');const env=require.resolve('@box-local/env');const yaml=require.resolve('yaml',{paths:[path.dirname(env)]});const directives=path.join(path.dirname(yaml),'doc','directives.js');if(!fs.existsSync(directives))throw new Error('Incomplete yaml runtime: '+directives)" \
    && cd /app/services/game-server \
    && node scripts/compact-runtime-javascript.js /opt/game-server/dist /app/apps/local-engine/src

FROM engine-build-base AS player-service-build

RUN NODE_OPTIONS=--max-old-space-size=4096 \
    NEXT_PUBLIC_APP_ENV=development \
    NEXT_PUBLIC_APP_EDITION=createra \
    NEXT_PUBLIC_APP_REGION=cn \
    pnpm --filter @box-local/game build-next
RUN node apps/local-engine/src/prune-player-build.js --player-service \
      apps/game/.next \
      apps/game/.next/standalone/apps/game/.next \
    && rm -rf apps/game/.next/standalone/apps/local-engine \
    && find \
      apps/game/.next/standalone \
      apps/game/.next/static \
      apps/game/public \
      -type f \( \
      -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
      -o -name '*.p12' -o -name '*.pfx' -o -name '*.map' \
      -o -name '*.ts' -o -name '*.tsx' -o -name '*.nft.json' \
    \) -delete \
    && find apps/game/.next/standalone -type f \( \
      -name '*.test.js' -o -name '*.spec.js' \
    \) -not -path '*/node_modules/*' -delete

FROM source-base AS voxa-build

RUN --mount=type=cache,id=box-local-engine-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @box-local/voxa...
RUN pnpm --filter @box-local/voxa build

FROM ${NODE_IMAGE} AS runtime-base

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENTRYPOINT ["tini", "--"]

FROM runtime-base AS creator

ARG BOX_BUILD_VERSION
ARG BOX_BUILD_COMMIT
ARG BOX_BUILD_DATE
ARG BOX_BUILD_SOURCE
LABEL org.opencontainers.image.title="BOX Local Engine Creator" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV BOX_DEPLOYMENT_MODE=creator \
    BOX_BUILD_VERSION=${BOX_BUILD_VERSION} \
    BOX_BUILD_COMMIT=${BOX_BUILD_COMMIT} \
    BOX_BUILD_DATE=${BOX_BUILD_DATE} \
    BOX_BUILD_SOURCE=${BOX_BUILD_SOURCE} \
    BOX_WEB_HOST=0.0.0.0 \
    BOX_WEB_PORT=3000 \
    BOX_PLAY_RUNTIME_HOST=0.0.0.0 \
    BOX_PLAY_RUNTIME_PORT=9966 \
    BOX_EDIT_RUNTIME_HOST=0.0.0.0 \
    BOX_EDIT_RUNTIME_PORT=9967 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends tar gzip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=creator-build --chown=node:node /app/apps/game/.next/standalone /app/apps/game/.next/standalone
COPY --from=creator-build --chown=node:node /opt/game-server /app/services/game-server
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/launcher.js /app/apps/local-engine/src/launcher.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/runtime-data-permissions.js /app/apps/local-engine/src/runtime-data-permissions.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/runtime-readiness.js /app/apps/local-engine/src/runtime-readiness.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/runtime-storage-namespace.js /app/apps/local-engine/src/runtime-storage-namespace.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/edit-library.js /app/apps/local-engine/src/edit-library.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/teleport-room-manager.js /app/apps/local-engine/src/teleport-room-manager.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/runtime-lifecycle.js /app/apps/local-engine/src/runtime-lifecycle.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/project-manager.js /app/apps/local-engine/src/project-manager.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/asset-distribution.js /app/apps/local-engine/src/asset-distribution.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/distribution-metadata.js /app/apps/local-engine/src/distribution-metadata.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/map-group-manager.js /app/apps/local-engine/src/map-group-manager.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/project-compatibility.js /app/apps/local-engine/src/project-compatibility.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/src/play-image.js /app/apps/local-engine/src/play-image.js
COPY --from=creator-build --chown=node:node /app/apps/local-engine/config /app/apps/local-engine/config
COPY --from=creator-build --chown=node:node /app/distribution/play/.env.example /app/distribution/play/.env.example
COPY --from=creator-build --chown=node:node /app/distribution/LICENSE.txt /app/distribution/LICENSE.txt
COPY --from=creator-build --chown=node:node /opt/runtime-data /app/apps/local-engine/data

RUN mkdir -p /app/apps/local-engine/projects /app/apps/local-engine/dist \
    && chown -R node:node /app/apps/local-engine

USER node

EXPOSE 3000 9966 9967
VOLUME ["/app/apps/local-engine/projects", "/app/apps/local-engine/dist"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/local-engine/src/launcher.js", "--production", "--creator"]

FROM runtime-base AS play

ARG BOX_BUILD_VERSION
ARG BOX_BUILD_COMMIT
ARG BOX_BUILD_DATE
ARG BOX_BUILD_SOURCE
LABEL org.box.local-engine.play-format="7" \
      org.opencontainers.image.title="BOX Local Engine Play" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV BOX_DEPLOYMENT_MODE=play \
    BOX_WEB_HOST=0.0.0.0 \
    BOX_WEB_PORT=3000 \
    BOX_PLAY_RUNTIME_HOST=127.0.0.1 \
    BOX_PLAY_RUNTIME_PORT=9966 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=play-build --chown=node:node /app/apps/game/.next/standalone /app/apps/game/.next/standalone
COPY --from=play-build --chown=node:node /opt/game-server /app/services/game-server
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/launcher.js /app/apps/local-engine/src/launcher.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/runtime-data-permissions.js /app/apps/local-engine/src/runtime-data-permissions.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/runtime-readiness.js /app/apps/local-engine/src/runtime-readiness.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/runtime-storage-namespace.js /app/apps/local-engine/src/runtime-storage-namespace.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/project-compatibility.js /app/apps/local-engine/src/project-compatibility.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/play-image.js /app/apps/local-engine/src/play-image.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/play-library.js /app/apps/local-engine/src/play-library.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/teleport-room-manager.js /app/apps/local-engine/src/teleport-room-manager.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/src/runtime-lifecycle.js /app/apps/local-engine/src/runtime-lifecycle.js
COPY --from=play-build --chown=node:node /app/apps/local-engine/config /app/apps/local-engine/config
COPY --from=play-build --chown=node:node /opt/runtime-data /app/apps/local-engine/data

RUN mkdir -p /app/play-runtime-cache \
    && chown -R node:node /app/play-runtime-cache

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "Promise.all([fetch('http://127.0.0.1:3000/api/health-check'),fetch('http://127.0.0.1:3000/api/play-worlds')]).then(rs=>{if(rs.some(r=>!r.ok))process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/local-engine/src/launcher.js", "--production", "--play"]

FROM runtime-base AS player-service

ARG BOX_BUILD_VERSION
ARG BOX_BUILD_COMMIT
ARG BOX_BUILD_DATE
ARG BOX_BUILD_SOURCE
LABEL org.box.local-engine.player-service-format="7" \
      org.box.local-engine.play-format="7" \
      org.opencontainers.image.title="BOX Local Engine Player Service" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV BOX_DEPLOYMENT_MODE=player-service \
    NEXT_PUBLIC_APP_ENV=development \
    NEXT_PUBLIC_APP_EDITION=createra \
    NEXT_PUBLIC_APP_REGION=cn \
    HOSTNAME=0.0.0.0 \
    PORT=3213

COPY --from=player-service-build --chown=node:node /app/apps/game/.next/standalone /app/apps/game/.next/standalone
COPY --from=player-service-build --chown=node:node /app/apps/game/.next/static /app/apps/game/.next/standalone/apps/game/.next/static
COPY --from=player-service-build --chown=node:node /app/apps/game/public /app/apps/game/.next/standalone/apps/game/public

USER node

EXPOSE 3213

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3213/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/game/.next/standalone/apps/game/server.js"]

FROM runtime-base AS voxa

ARG BOX_BUILD_VERSION
ARG BOX_BUILD_COMMIT
ARG BOX_BUILD_DATE
ARG BOX_BUILD_SOURCE
LABEL org.opencontainers.image.title="BOX Local Engine VOXA" \
      org.opencontainers.image.version="${BOX_BUILD_VERSION}" \
      org.opencontainers.image.revision="${BOX_BUILD_COMMIT}" \
      org.opencontainers.image.created="${BOX_BUILD_DATE}" \
      org.opencontainers.image.source="${BOX_BUILD_SOURCE}" \
      org.opencontainers.image.licenses="LicenseRef-Proprietary"

ENV BOX_BUILD_VERSION=${BOX_BUILD_VERSION} \
    BOX_BUILD_COMMIT=${BOX_BUILD_COMMIT} \
    BOX_BUILD_DATE=${BOX_BUILD_DATE} \
    BOX_BUILD_SOURCE=${BOX_BUILD_SOURCE} \
    VOXA_DATA_PATH=/app/apps/voxa/data \
    HOSTNAME=0.0.0.0 \
    PORT=3001

COPY --from=voxa-build --chown=node:node /app/apps/voxa/.next/standalone /app/apps/voxa/.next/standalone
COPY --from=voxa-build --chown=node:node /app/apps/voxa/.next/static /app/apps/voxa/.next/standalone/apps/voxa/.next/static
COPY --from=voxa-build --chown=node:node /app/apps/voxa/public /app/apps/voxa/.next/standalone/apps/voxa/public

RUN mkdir -p /app/apps/voxa/data \
    && find /app/apps/voxa/.next/standalone -type f \( \
      -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' \
      -o -name '*.map' -o -name '*.ts' -o -name '*.tsx' -o -name '*.nft.json' \
    \) -delete \
    && chown -R node:node /app/apps/voxa

USER node

EXPOSE 3001
VOLUME ["/app/apps/voxa/data"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health-check').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/voxa/.next/standalone/apps/voxa/server.js"]
