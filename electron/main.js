require('dotenv').config()
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const { initDB } = require('./db/database')
const { registerHandlers } = require('./ipc/handlers')
const { runSync, getSyncStatus, resetFailed, pullAll } = require('./syncEngine')

let win
let tray

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'IMS',
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/Inventory_Management_System_Logo.png')
      : path.join(process.resourcesPath, 'public/Inventory_Management_System_Logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Prevent Ctrl+R hard reload (breaks IPC context in production)
  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key === 'r') {
      event.preventDefault()
    }
  })

  // Close button â†’ minimize to tray instead of quit
  win.on('close', (e) => {
    if (!app.isQuiting) {
      e.preventDefault()
      win.hide()
    }
  })
}

app.whenReady().then(() => {
  initDB()
  registerHandlers()

  // â”€â”€ Auto Backup Scheduler (main process â€” works even if Sync page not open) â”€â”€
  function runAutoBackupIfNeeded() {
    try {
      const fs  = require('fs')
      const cfgFile  = path.join(app.getPath('userData'), 'auto_backup.json')
      const lastFile = path.join(app.getPath('userData'), 'auto_backup_last.txt')
      
      let cfg = { enabled: true, time: '17:00' }
      if (fs.existsSync(cfgFile)) {
        cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'))
      } else {
        fs.writeFileSync(cfgFile, JSON.stringify(cfg))
      }
      
      if (!cfg.enabled) return

      const [h, m] = (cfg.time || '17:00').split(':').map(Number)
      const now  = new Date()
      const last = fs.existsSync(lastFile) ? fs.readFileSync(lastFile, 'utf8').trim() : ''

      // Check today's scheduled time has passed but backup not done yet
      const scheduledToday = new Date(now)
      scheduledToday.setHours(h, m, 0, 0)
      const todayKey = `${now.toDateString()}_${cfg.time}`

      if (now >= scheduledToday && last !== todayKey) {
        fs.writeFileSync(lastFile, todayKey)
        const db      = require('./db/database').getDB()
        const srcPath = path.join(app.getPath('userData'), 'inventory.db')
        const pad     = n => String(n).padStart(2, '0')
        const stamp   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
        const fileName = `inventory-${stamp}.db`
        db.pragma('wal_checkpoint(TRUNCATE)')
        const localDir = path.join(app.getPath('documents'), 'FloriManager Backups')
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true })
        const destPath = path.join(localDir, fileName)
        fs.copyFileSync(srcPath, destPath)
        const size_kb = Math.round(fs.statSync(destPath).size / 1024)
        const { v4: uuid } = require('uuid')
        db.prepare(`INSERT INTO backups (id, path, type, size_kb) VALUES (?, ?, 'local', ?)`).run(uuid(), destPath, size_kb)
        if (win) win.webContents.send('auto:backup:done', { size_kb })
        console.log(`[AutoBackup] Created: ${fileName} (${size_kb} KB)`)
      }
    } catch (e) { console.error('[AutoBackup] Error:', e.message) }
  }

  // Run on startup (catches missed backups)
  setTimeout(runAutoBackupIfNeeded, 3000)

  // Run every minute (catches real-time scheduled time)
  setInterval(runAutoBackupIfNeeded, 60000)

  // â”€â”€ System Tray â”€â”€
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/Inventory_Management_System_Logo.png')
    : path.join(process.resourcesPath, 'public/Inventory_Management_System_Logo.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open IMS',  click: () => { win.show(); win.focus() } },
    { type: 'separator' },
    { label: 'Quit',      click: () => { app.isQuiting = true; app.quit() } },
  ])
  tray.setToolTip('IMS â€” Inventory Management')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { win.isVisible() ? win.hide() : win.show() })

  ipcMain.handle('sync:run',         async (_, url, token) => {
    const apiUrl   = url   || process.env.API_URL
    const apiToken = token || process.env.API_TOKEN
    if (!apiUrl) return { synced: 0, skipped: true }
    return runSync(apiUrl, apiToken)
  })

  ipcMain.handle('sync:pullAll',      async (_, url, token) => {
    const apiUrl   = url   || process.env.API_URL
    const apiToken = token || process.env.API_TOKEN
    if (!apiUrl) return { pulled: 0, skipped: true }
    return pullAll(apiUrl, apiToken)
  })

  ipcMain.handle('sync:status',     () => getSyncStatus())
  ipcMain.handle('sync:resetFailed',() => resetFailed())

  // Auto backup config save/load
  ipcMain.handle('autobackup:save', (_, cfg) => {
    require('fs').writeFileSync(
      path.join(app.getPath('userData'), 'auto_backup.json'),
      JSON.stringify(cfg)
    )
    return { success: true }
  })
  ipcMain.handle('autobackup:load', () => {
    try {
      const f = path.join(app.getPath('userData'), 'auto_backup.json')
      if (require('fs').existsSync(f)) {
        return JSON.parse(require('fs').readFileSync(f, 'utf8'))
      }
      return { enabled: true, time: '17:00' }
    } catch { return { enabled: true, time: '17:00' } }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// â”€â”€ Print HTML â†’ PDF â†’ open in system viewer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fs = require('fs')
const os = require('os')
ipcMain.handle('print:html', async (e, html) => {
  const printWin = new BrowserWindow({
    width: 800, height: 600, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })
  await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  // wait for content to render
  await new Promise(r => setTimeout(r, 500))
  const pdfData = await printWin.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
  printWin.close()
  const tmpPath = path.join(os.tmpdir(), `receipt_${Date.now()}.pdf`)
  fs.writeFileSync(tmpPath, pdfData)
  shell.openPath(tmpPath)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit â€” minimize to tray
  }
})


