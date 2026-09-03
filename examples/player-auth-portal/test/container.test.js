'use strict'

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const portalRoot = path.resolve(__dirname, '..')
const repositoryRoot = path.resolve(portalRoot, '../..')
const dockerfile = readFileSync(path.join(portalRoot, 'Dockerfile'), 'utf8')
const dockerignore = readFileSync(path.join(repositoryRoot, '.dockerignore'), 'utf8')
const compose = readFileSync(path.join(repositoryRoot, 'docker-compose.yml'), 'utf8')
const browserApp = readFileSync(path.join(portalRoot, 'public/app.js'), 'utf8')
const browserSource = readFileSync(path.join(portalRoot, 'src/app.jsx'), 'utf8')
const portalHtml = readFileSync(path.join(portalRoot, 'public/index.html'), 'utf8')

test('container image copies only runtime source and never an env file', () => {
  assert.match(
    dockerfile,
    /COPY --chown=node:node examples\/player-auth-portal\/server\.js \.\/server\.js/,
  )
  assert.match(dockerfile, /COPY --chown=node:node examples\/player-auth-portal\/public \.\/public/)
  assert.match(dockerfile, /COPY --chown=node:node packages\/license\/index\.js/)
  assert.match(dockerfile, /COPY --chown=node:node distribution\/license-public-key\.pem/)
  assert.doesNotMatch(dockerfile, /COPY[^\n]*\.env/i)
  assert.match(dockerfile, /USER node/)
  assert.match(dockerignore, /^\.env$/m)
  assert.match(dockerignore, /^apps\/license-server\/$/m)
})

test('Compose keeps the auth key server-side and uses Player Service over its internal URL', () => {
  const service = compose.slice(
    compose.indexOf('  player-auth-portal:'),
    compose.indexOf('\n  creator:', compose.indexOf('  player-auth-portal:')),
  )
  assert.match(service, /AUTH_DEMO_API_KEY: \$\{BOX_PLAYER_AUTH_API_KEY:-\}/)
  assert.match(service, /AUTH_DEMO_PLAYER_SERVICE_URL: http:\/\/player-service:3213/)
  assert.match(service, /AUTH_DEMO_HOST: 0\.0\.0\.0/)
  assert.match(service, /read_only: true/)
  assert.match(service, /tmpfs:\s*\n\s*- \/tmp:mode=1777/)
  assert.equal((service.match(/BOX_PLAYER_AUTH_API_KEY/g) || []).length, 1)
})

test('disabled registration removes the redundant authentication tabs', () => {
  assert.match(browserSource, /if \(!registrationEnabled\)/)
  assert.match(browserSource, /<LoginForm busy=\{busy\}/)
  assert.match(browserSource, /<Tabs\.Root/)
})

test('browser interface is bundled from React and Radix without a CDN dependency', () => {
  assert.match(browserSource, /from 'react-dom\/client'/)
  assert.match(browserSource, /import \{ Tabs \} from 'radix-ui'/)
  assert.match(portalHtml, /<div id="root"><\/div>/)
  assert.doesNotMatch(portalHtml, /https?:\/\//)
  assert.ok(browserApp.length > 0)
})
