export interface PlayerServerRecord {
  id: string
  endpoint: string
  name: string
}

export interface PlayerServerState {
  servers: PlayerServerRecord[]
  selectedServerId: string | null
}

export interface ApiRequest {
  endpoint: string
  url: string
  method: string
  headers?: Array<[string, string]>
  body?: string | null
}

export interface ApiResponse {
  status: number
  headers: Array<[string, string]>
  body: string
}

export interface ApiTransport {
  request(request: ApiRequest): Promise<ApiResponse>
  downloadAsset(options: AssetDownloadOptions): Promise<AssetDownloadResult>
  clear(endpoint: string): void
  cookies(endpoint: string): Array<[string, string]>
}

export interface AssetDownloadOptions {
  request: ApiRequest
  filename: string
  expectedSize: number
  expectedContentType: string
  existingBytes: number
  hash: string
  onProgress?: (progress: AssetDownloadProgress) => void
}

export interface AssetDownloadProgress {
  hash: string
  currentBytes: number
  totalBytes: number
}

export interface AssetDownloadResult {
  status: number
  body: string
  downloadedBytes?: number
}

export interface PackageAsset {
  hash: string
  size: number
  kind: 'static'
  contentType: string
}

export interface PackageDescriptor {
  formatVersion: 1
  permanentMapId: string
  accessId: string
  releaseVersion: string
  required: PackageAsset[]
  optional: PackageAsset[]
  manifestDigest: string
  signature: {
    algorithm: 'ES256'
    keyId: string
    publicKey: { kty: 'EC'; crv: 'P-256'; x: string; y: string }
    value: string
  }
}

export interface TrustedSigningKey {
  keyId: string
  publicKey: { kty: string; crv: string; x: string; y: string }
}

export interface VerifiedPackageRecord {
  formatVersion: 1
  permanentMapId: string
  releaseVersion: string
  manifestDigest: string
  required: string[]
  servers: string[]
  verifiedAt: number
}

export interface InstallPlan {
  permanentMapId: string
  manifestDigest: string
  requiredCount: number
  missingHashes: string[]
  missingBytes: number
  availableBytes: number
  insufficientStorage: boolean
}

export interface InstalledPackage {
  permanentMapId: string
  releaseVersion: string
  manifestDigest: string
  requiredCount: number
}

export interface InstallAssetPayload {
  payload: {
    serverId: string
    request: ApiRequest
    descriptor: string
    trustedSigningKey: string
    hash: string
  }
}

export interface ElectronCommandPayload extends Record<string, any> {
  endpoint?: string
  serverId?: string
  name?: string
  request?: ApiRequest
  descriptor?: string
  trustedSigningKey?: string
  hash?: string
  accessIds?: string[]
  payload?: InstallAssetPayload['payload']
}
