import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
const [source, target] = process.argv.slice(2)
let patch = '*** Begin Patch\n'
if (fs.existsSync(target)) {
  patch += '*** Update File: ' + target + '\n@@\n'
  patch +=
    fs
      .readFileSync(target, 'utf8')
      .trimEnd()
      .split('\n')
      .map((line) => '-' + line)
      .join('\n') + '\n'
} else patch += '*** Add File: ' + target + '\n'
patch +=
  fs
    .readFileSync(source, 'utf8')
    .trimEnd()
    .split('\n')
    .map((line) => '+' + line)
    .join('\n') + '\n*** End Patch\n'
const result = spawnSync('/Users/viyrs/.codex/tmp/arg0/codex-arg0mEup53/apply_patch', [], {
  input: patch,
  encoding: 'utf8',
})
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
process.exit(result.status ?? 1)
