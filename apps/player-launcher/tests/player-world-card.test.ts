import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { renderWorldCard } from '../src/views/world-card'

test('world cards show the Play cover ratio, author, version and online player count', () => {
  const html = renderWorldCard({
    id: 'map-one',
    name: '星梦小镇',
    author: '作者甲',
    version: 'v1.2.3',
    cover: 'https://play.example.test/covers/map.png',
    onlineCount: 7,
  }, { busy: false, preparingMapId: '' }, { escapeHtml: (value: string) => value })
  const styles = fs.readFileSync(path.join(process.cwd(), 'src/styles.css'), 'utf8')

  assert.match(html, /world-cover-frame/)
  assert.match(html, /星梦小镇/)
  assert.match(html, /作者甲 · v1\.2\.3/)
  assert.match(html, /7 人在线/)
  assert.match(styles, /\.world-cover-frame\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s)
})
