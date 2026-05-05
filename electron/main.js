require('dotenv').config()
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const { initDB } = require('./db/database')
const { registerHandlers } = require('./ipc/handlers')
const { runSync, getSyncStatus, resetFailed } = require('./syncEngine')

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
      ? path.join(__dirname, '../public/IMS.png')
      : path.join(process.resourcesPath, 'app/public/IMS.png'),
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

  // Close button → minimize to tray instead of quit
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

  // ── System Tray ──
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/IMS.png')
    : path.join(process.resourcesPath, 'app/public/IMS.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open IMS',  click: () => { win.show(); win.focus() } },
    { type: 'separator' },
    { label: 'Quit',      click: () => { app.isQuiting = true; app.quit() } },
  ])
  tray.setToolTip('IMS — Inventory Management')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { win.isVisible() ? win.hide() : win.show() })

  ipcMain.handle('sync:run', async (_, url, token) => {
    const apiUrl   = url   || process.env.API_URL
    const apiToken = token || process.env.API_TOKEN
    if (!apiUrl) return { synced: 0, skipped: true }
    return runSync(apiUrl, apiToken)
  })

  ipcMain.handle('sync:status',     () => getSyncStatus())
  ipcMain.handle('sync:resetFailed',() => resetFailed())

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ── Print HTML → PDF → open in system viewer ────────────────────────────────
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
    // Don't quit — minimize to tray
  }
})
