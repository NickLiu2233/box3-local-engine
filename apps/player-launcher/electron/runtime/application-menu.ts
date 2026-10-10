import type { Menu } from 'electron'

export function hideApplicationMenu(api: typeof Menu, platform = process.platform): void {
  // An explicit empty native menu prevents macOS restoring the default menu
  // when windows are created or become active.
  api.setApplicationMenu(platform === 'darwin' ? api.buildFromTemplate([]) : null)
}
