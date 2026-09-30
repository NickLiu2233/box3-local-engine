import { defineConfig } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

function inlinePackagedAssets(): Plugin {
  return {
    name: 'inline-packaged-electron-assets',
    apply: 'build',
    closeBundle() {
      const outputDirectory = resolve(__dirname, 'dist')
      const indexPath = resolve(outputDirectory, 'index.html')
      let html = readFileSync(indexPath, 'utf8')
      html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+\.css)"[^>]*>/g, (_tag, filename: string) => {
        const css = readFileSync(resolve(outputDirectory, 'assets', filename), 'utf8')
        return `<style>${css.replaceAll('</style', '<\\/style')}</style>`
      })
      html = html.replace(/<script type="module"[^>]*src="\.\/assets\/([^"]+\.js)"[^>]*><\/script>/g, (_tag, filename: string) => {
        const script = readFileSync(resolve(outputDirectory, 'assets', filename), 'utf8')
        return `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`
      })
      writeFileSync(indexPath, html)
    },
  }
}

export default defineConfig({
  base: './',
  build: { assetsInlineLimit: 1_000_000 },
  plugins: [inlinePackagedAssets()],
})
