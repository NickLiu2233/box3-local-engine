import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript'
import ts from 'typescript'

const destination = fileURLToPath(new URL('../src/generated/openapi.ts', import.meta.url))
const ast = await openapiTS(new URL('../openapi/openapi.json', import.meta.url), {
  transform(schema) {
    // OpenAPI binary strings are browser file bodies, including File uploads.
    if (schema.type === 'string' && schema.format === 'binary') {
      return ts.factory.createTypeReferenceNode('Blob')
    }
    return undefined
  },
})
const source = `${COMMENT_HEADER}${astToString(ast)}`
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== source) {
    throw new Error('Generated OpenAPI types are stale; run npm run generate')
  }
  console.log('Generated OpenAPI types are current')
} else {
  fs.writeFileSync(destination, source)
  console.log('Generated OpenAPI types, including Blob upload bodies')
}
