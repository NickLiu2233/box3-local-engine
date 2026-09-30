const PLAYER_SERVER_ERRORS: Array<[needle: string, message: string]> = [
  ['请输入有效的游玩端服务器 IP 或域名', '服务器地址格式不正确，请检查后重试。'],
  ['无法连接到游玩端服务器', '无法连接到游玩端服务器，请检查地址、端口和网络后重试。'],
  ['服务器已响应', '服务器已响应，但不是可用的 BOX3 游玩端。请检查地址和端口。'],
  ['游玩端尚未就绪', '游玩端正在启动，请稍后重试。'],
]

/** Converts desktop IPC/network failures into concise messages for players. */
export function playerServerAddError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  for (const [needle, message] of PLAYER_SERVER_ERRORS) {
    if (raw.includes(needle)) return message
  }
  return '无法添加服务器，请检查地址、端口和网络后重试。'
}
