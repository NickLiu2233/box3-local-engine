// JS/CSS 使用同一构建选项。生产只交付静态产物，不把开发依赖带入镜像。
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const targets = [
  { entryPoints: ['src/main.jsx'], outfile: 'public/app.js', jsx: 'automatic' },
  { entryPoints: ['src/styles/index.css'], outfile: 'public/styles.css' },
].map(target => ({ absWorkingDir: root, bundle: true, minify: true, sourcemap: false, target: 'es2022', logLevel: 'info', ...target }))

if (process.argv[1] === fileURLToPath(import.meta.url)) await Promise.all(targets.map(target => build(target)))
