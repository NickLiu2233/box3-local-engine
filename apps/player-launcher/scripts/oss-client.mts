import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'

const execute = promisify(execFile)
export interface OssConfig { bucket: string; endpoint: string; accessKeyId: string; accessKeySecret: string }

export function ossConfiguration(env: NodeJS.ProcessEnv): OssConfig {
  for (const name of ['OSS_BUCKET', 'OSS_ENDPOINT', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET']) {
    if (!env[name]) throw new Error(`Missing required GitHub Actions OSS configuration: ${name}`)
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env.OSS_BUCKET!)) throw new Error('ALIYUN_OSS_BUCKET must contain only the bucket name')
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(env.OSS_ENDPOINT!)) throw new Error('ALIYUN_OSS_ENDPOINT must be an OSS endpoint hostname without a protocol or path')
  return { bucket: env.OSS_BUCKET!, endpoint: env.OSS_ENDPOINT!, accessKeyId: env.OSS_ACCESS_KEY_ID!, accessKeySecret: env.OSS_ACCESS_KEY_SECRET! }
}

export function isMissingObject(error: string): boolean {
  return /\((?:404|NoSuchKey|NotFound|NoSuchObject)\)/.test(error)
}

/** Uses the same OSS S3 compatibility as release.yml's Windows transfer steps. */
export async function createOssClient(config: OssConfig) {
  const directory = await mkdtemp(path.join(tmpdir(), 'box-player-oss-'))
  const configFile = path.join(directory, 'aws-config')
  await writeFile(configFile, '[default]\nregion = us-east-1\ns3 =\n    addressing_style = virtual\n    payload_signing_enabled = false\n', { mode: 0o600 })
  const env = {
    ...process.env,
    AWS_CONFIG_FILE: configFile,
    AWS_ACCESS_KEY_ID: config.accessKeyId,
    AWS_SECRET_ACCESS_KEY: config.accessKeySecret,
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'when_required',
    AWS_RESPONSE_CHECKSUM_VALIDATION: 'when_required',
    AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '4', PYTHONUTF8: '1',
  }
  async function call(operation: string, key: string, extra: string[] = [], allowMissing = false): Promise<string | null> {
    if (!key.startsWith('box-player-launcher/player-v') || key.includes('..') || key.includes('\\')) throw new Error('OSS key must stay in the player release directory')
    try {
      const { stdout } = await execute('python', [
        '-m', 'awscli', 's3api', operation, '--bucket', config.bucket, '--key', key,
        '--endpoint-url', `https://${config.endpoint}`, '--output', 'json', ...extra,
      ], { env, timeout: 600_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
      return stdout
    } catch (error) {
      const failure = error as Error & { stderr?: string }
      const stderr = failure.stderr || failure.message
      if (allowMissing && isMissingObject(stderr)) return null
      const redacted = stderr.split(config.accessKeyId).join('[redacted]').split(config.accessKeySecret).join('[redacted]')
      throw new Error(`OSS ${operation} failed for ${key}: ${redacted.trim()}`)
    }
  }
  return {
    directory,
    async head(key: string): Promise<{ ContentLength: number } | null> {
      const result = await call('head-object', key, [], true)
      return result === null ? null : JSON.parse(result)
    },
    async download(key: string, file: string): Promise<void> { await call('get-object', key, [file]) },
    async upload(key: string, file: string, contentType = 'application/octet-stream'): Promise<void> {
      await call('put-object', key, ['--body', file, '--content-type', contentType])
    },
    async close(): Promise<void> { await rm(directory, { recursive: true, force: true }) },
  }
}
