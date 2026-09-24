const fs = require('node:fs')
const path = require('node:path')

const standaloneRoot = path.resolve(__dirname, '../.next/standalone/apps/game')
const destination = path.join(standaloneRoot, 'node_modules/swagger-ui-dist')
const openApiDestination = path.join(standaloneRoot, 'openapi')
const enabled =
  process.env.APP_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'development'
const files = [
  'package.json',
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui-standalone-preset.js',
]

if (!enabled) {
  fs.rmSync(destination, { recursive: true, force: true })
  fs.rmSync(openApiDestination, { recursive: true, force: true })
  console.log('Skipped Swagger UI assets for a non-development build')
} else {
  const source = path.dirname(require.resolve('swagger-ui-dist/package.json'))
  fs.mkdirSync(destination, { recursive: true })
  for (const file of files) {
    fs.copyFileSync(path.join(source, file), path.join(destination, file))
  }
  fs.mkdirSync(openApiDestination, { recursive: true })
  fs.copyFileSync(
    path.resolve(__dirname, '../../../internals/apis/openapi/openapi.json'),
    path.join(openApiDestination, 'openapi.json'),
  )

  console.log(`Copied ${files.length} Swagger UI assets and OpenAPI JSON into the development build`)
}
