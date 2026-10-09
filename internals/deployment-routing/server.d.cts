declare const prefixServer: {
  install(): void
  html(source: string, config?: {basePath: string; peerPaths: string[]}): string
  configuration(): {basePath: string; peerPaths: string[]}
}
export = prefixServer
