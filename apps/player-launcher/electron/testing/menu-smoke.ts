import { app, BrowserWindow, Menu } from 'electron'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { hideApplicationMenu } from '../runtime/application-menu'

const directory =
  process.env.BOX_LAUNCHER_TEST_USER_DATA ||
  fs.mkdtempSync(path.join(os.tmpdir(), 'box-player-menu-check-'))
app.setPath('userData', directory)
app
  .whenReady()
  .then(async () => {
    hideApplicationMenu(Menu)
    for (let index = 0; index < 2; index++) {
      const window = new BrowserWindow({
        show: false,
        autoHideMenuBar: true,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      })
      await window.loadURL('about:blank')
      if (process.platform === 'darwin')
        assert.equal(
          Menu.getApplicationMenu()?.items.length,
          0,
          'macOS must keep the explicitly empty menu after window creation',
        )
      else assert.equal(window.isMenuBarVisible(), false)
      window.destroy()
    }
    console.log('PASS: launcher/game window creation does not restore the application menu')
    app.exit(0)
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
app.on('window-all-closed', () => {})
app.on('quit', () => {
  if (!process.env.BOX_LAUNCHER_TEST_USER_DATA)
    fs.rmSync(directory, { recursive: true, force: true })
})
