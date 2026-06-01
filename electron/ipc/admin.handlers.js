const { ipcMain, app, dialog, BrowserWindow } = require('electron')
const { getDB, reloadDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const path = require('path')
const fs = require('fs')
const gdrive = require('../gdrive.service')

module.exports = function registerAdminHandlers() {

  const { enqueue, dequeue } = require('./syncHelper')

  // â”€â”€ Branches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('branches:getAll', () =>
    getDB().prepare(`SELECT * FROM branches ORDER BY name`).all()
  )
  ipcMain.handle('branches:add', (_, { name, address, phone }) => {
    const db = getDB()
    const id = uuid()
    const row = { id, name, address: address || null, phone: phone || null }
    db.prepare(`INSERT INTO branches (id, name, address, phone) VALUES (?, ?, ?, ?)`).run(id, name, row.address, row.phone)
    enqueue(db, 'branches', 'insert', row)
    return { id, name }
  })
  ipcMain.handle('branches:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='branches' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM branches WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'branches', id)
    else enqueue(db, 'branches', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Shops â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('shops:getAll', () =>
    getDB().prepare(`
      SELECT s.*, b.name AS branch_name FROM shops s
      LEFT JOIN branches b ON b.id = s.branch_id ORDER BY s.name
    `).all()
  )
  ipcMain.handle('shops:add', (_, { name, branch_id }) => {
    const db = getDB()
    const id = uuid()
    const row = { id, name, branch_id: branch_id || null }
    db.prepare(`INSERT INTO shops (id, name, branch_id) VALUES (?, ?, ?)`).run(id, name, row.branch_id)
    enqueue(db, 'shops', 'insert', row)
    return { id, name }
  })
  ipcMain.handle('shops:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='shops' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM shops WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'shops', id)
    else enqueue(db, 'shops', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('users:getAll', () =>
    getDB().prepare(`
      SELECT u.id, u.name, u.username, u.active, r.name AS role_name, b.name AS branch_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN branches b ON b.id = u.branch_id
    `).all()
  )
  ipcMain.handle('users:add', (_, { name, username, password, role_id, branch_id }) => {
    const db = getDB()
    const id = uuid()
    const row = { id, name, username, password, role_id: role_id || null, branch_id: branch_id || null }
    db.prepare(`INSERT INTO users (id, name, username, password, role_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, name, username, password, row.role_id, row.branch_id)
    enqueue(db, 'users', 'insert', row)
    return { id, name, username }
  })
  ipcMain.handle('users:update', (_, { id, ...data }) => {
    const db = getDB()
    db.prepare(`UPDATE users SET name=@name, username=@username, role_id=@role_id, branch_id=@branch_id, active=@active WHERE id=@id`)
      .run({ id, ...data })
    enqueue(db, 'users', 'update', { id, ...data })
    return { success: true }
  })
  ipcMain.handle('users:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='users' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'users', id)
    else enqueue(db, 'users', 'delete', { id })
    return { success: true }
  })
  ipcMain.handle('users:login', (_, { username, password }) => {
    const user = getDB().prepare(`
      SELECT u.*, r.name AS role_name, r.permissions
      FROM users u LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.username = ? AND u.password = ? AND u.active = 1
    `).get(username, password)
    return user || null
  })

  // â”€â”€ Roles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('roles:getAll', () =>
    getDB().prepare(`SELECT * FROM roles`).all()
  )
  ipcMain.handle('roles:add', (_, { name, permissions }) => {
    const db = getDB()
    const id = uuid()
    const row = { id, name, permissions: JSON.stringify(permissions || {}) }
    db.prepare(`INSERT INTO roles (id, name, permissions) VALUES (?, ?, ?)`).run(id, name, row.permissions)
    enqueue(db, 'roles', 'insert', row)
    return { id, name }
  })
  ipcMain.handle('roles:update', (_, { id, name, permissions }) => {
    const db = getDB()
    const perms = JSON.stringify(permissions || {})
    db.prepare(`UPDATE roles SET name=?, permissions=? WHERE id=?`).run(name, perms, id)
    enqueue(db, 'roles', 'update', { id, name, permissions: perms })
    return { success: true }
  })
  ipcMain.handle('roles:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='roles' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM roles WHERE id=?`).run(id)
    if (pendingInsert) dequeue(db, 'roles', id)
    else enqueue(db, 'roles', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Activity Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('logs:add', (_, { user_id, action, module, detail }) => {
    getDB().prepare(`INSERT INTO activity_logs (id, user_id, action, module, detail) VALUES (?, ?, ?, ?, ?)`)
      .run(uuid(), user_id || null, action, module || null, detail || null)
    return { success: true }
  })
  ipcMain.handle('logs:getAll', () =>
    getDB().prepare(`
      SELECT l.*, u.name AS user_name FROM activity_logs l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.created_at DESC LIMIT 100000
    `).all()
  )

  // â”€â”€ Discounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('discounts:getAll', () =>
    getDB().prepare(`SELECT * FROM discounts ORDER BY created_at DESC`).all()
  )
  ipcMain.handle('discounts:add', (_, { code, type, value, min_amount, expires_at }) => {
    const id = uuid()
    const db = getDB()
    db.prepare(`INSERT INTO discounts (id, code, type, value, min_amount, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, code || null, type || 'percent', value, min_amount || 0, expires_at || null)
    const row = db.prepare(`SELECT * FROM discounts WHERE id = ?`).get(id)
    enqueue(db, 'discounts', 'insert', row)
    return { id, success: true }
  })
  ipcMain.handle('discounts:validate', (_, { code, amount }) => {
    const d = getDB().prepare(`
      SELECT * FROM discounts WHERE code = ? AND active = 1
      AND (expires_at IS NULL OR expires_at >= date('now'))
      AND min_amount <= ?
    `).get(code, amount)
    if (!d) return { valid: false }
    const discount = d.type === 'percent' ? (amount * d.value / 100) : d.value
    return { valid: true, discount, coupon: d }
  })
  ipcMain.handle('discounts:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='discounts' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM discounts WHERE id=?`).run(id)
    if (pendingInsert) dequeue(db, 'discounts', id)
    else enqueue(db, 'discounts', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Backup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const CLOUD_DIRS = [
    { p: path.join(require('os').homedir(), 'My Drive', 'FloriManager Backups'), type: 'google_drive' },
    { p: path.join(require('os').homedir(), 'OneDrive', 'FloriManager Backups'), type: 'onedrive' },
    { p: path.join(require('os').homedir(), 'OneDrive - Personal', 'FloriManager Backups'), type: 'onedrive' },
  ]

  function cleanOldBackups() {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 1); cutoff.setHours(0, 0, 0, 0)
    const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19)
    const old = getDB().prepare(`SELECT * FROM backups WHERE created_at < ?`).all(cutoffStr)
    for (const b of old) {
      try { if (b.path && fs.existsSync(b.path)) fs.unlinkSync(b.path) } catch { }
      getDB().prepare(`DELETE FROM backups WHERE id = ?`).run(b.id)
    }
    const allDirs = [
      path.join(app.getPath('documents'), 'FloriManager Backups'),
      ...CLOUD_DIRS.map(c => c.p),
    ]
    for (const dir of allDirs) {
      if (!fs.existsSync(dir)) continue
      try {
        for (const file of fs.readdirSync(dir)) {
          if (!file.endsWith('.db')) continue
          const fp = path.join(dir, file)
          if (fs.statSync(fp).mtimeMs < cutoff.getTime()) try { fs.unlinkSync(fp) } catch { }
        }
      } catch { }
    }
  }

  ipcMain.handle('backup:create', async () => {
    const db = getDB()
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    const fileName = `inventory-${stamp}.db`

    cleanOldBackups()

    // 1. Save to local Documents using SQLite hot-backup API
    const localDir = path.join(app.getPath('documents'), 'FloriManager Backups')
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true })
    const localPath = path.join(localDir, fileName)
    await db.backup(localPath)
    const size_kb = Math.round(fs.statSync(localPath).size / 1024)
    getDB().prepare(`INSERT INTO backups (id, path, type, size_kb) VALUES (?, ?, 'local', ?)`)
      .run(uuid(), localPath, size_kb)

    // 2. Copy to OneDrive sync folder
    for (const { p, type } of CLOUD_DIRS) {
      if (type === 'google_drive' && gdrive.isAuthenticated()) {
        continue
      }
      const parent = path.dirname(p)
      if (!fs.existsSync(parent)) continue
      try {
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
        const cloudPath = path.join(p, fileName)
        fs.copyFileSync(localPath, cloudPath)
        if (fs.existsSync(cloudPath) && fs.statSync(cloudPath).size > 0) {
          getDB().prepare(`INSERT INTO backups (id, path, type, size_kb) VALUES (?, ?, ?, ?)`)
            .run(uuid(), cloudPath, type, size_kb)
          break
        }
      } catch (e) { console.error('Cloud backup failed:', p, e.message) }
    }

    // 3. Upload to Google Drive via API if connected
    try {
      if (gdrive.isAuthenticated()) {
        const fileId = await gdrive.uploadFile(localPath, fileName)
        getDB().prepare(`INSERT INTO backups (id, path, type, size_kb, gdrive_file_id) VALUES (?, ?, 'google_drive', ?, ?)`)
          .run(uuid(), localPath, size_kb, fileId)
      }
    } catch (e) {
      console.error('Google Drive API backup failed:', e.message)
    }

    return { size_kb, path: localPath }
  })

  ipcMain.handle('backup:getAll', () => {
    cleanOldBackups()
    return getDB().prepare(`SELECT * FROM backups ORDER BY created_at DESC`).all()
  })

  ipcMain.handle('backup:restore', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Select Backup File',
      filters: [{ name: 'SQLite DB', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (!filePaths?.length) return { success: false, cancelled: true }

    const destPath = path.join(app.getPath('userData'), 'inventory.db')
    const walPath = destPath + '-wal'
    const shmPath = destPath + '-shm'

    try {
      // 1. Flush + close DB
      const db = getDB()
      try { db.pragma('wal_checkpoint(TRUNCATE)') } catch { }
      try { db.close() } catch { }

      // 2. Remove WAL/SHM files
      try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath) } catch { }
      try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath) } catch { }

      // 3. Copy backup file over current DB
      fs.copyFileSync(filePaths[0], destPath)

      // 4. Relaunch app â€” cleanest way to reload restored DB
      setTimeout(() => { app.relaunch(); app.exit(0) }, 500)

      return { success: true }
    } catch (e) {
      try { reloadDB() } catch { }
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('backup:openFolder', () => {
    const destDir = path.join(app.getPath('documents'), 'FloriManager Backups')
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    require('electron').shell.openPath(destDir)
    return { success: true }
  })

  // ── Google Drive ──────────────────────────────────────────────────────────

  ipcMain.handle('gdrive:connect', async () => {
    try {
      const url = await gdrive.getAuthUrl()
      await gdrive.startAuthServer(url)
      const status = await gdrive.getStatus()
      return status
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('gdrive:disconnect', async () => {
    try {
      await gdrive.disconnect()
      return { success: true }
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('gdrive:status', async () => {
    try {
      return await gdrive.getStatus()
    } catch (e) {
      return { connected: false }
    }
  })

  ipcMain.handle('gdrive:uploadBackup', async (e, backupPath) => {
    try {
      const fileId = await gdrive.uploadFile(backupPath, 'inventory.db')
      return { success: true, fileId }
    } catch (error) {
      return { error: error.message }
    }
  })

  // ── Cleanup deleted records ───────────────────────────────────────────────
  ipcMain.handle('db:cleanup', () => {
    const db = getDB()
    const p = db.prepare(`DELETE FROM products WHERE deleted_at IS NOT NULL`).run()
    const c = db.prepare(`DELETE FROM customers WHERE deleted_at IS NOT NULL`).run()
    return { products: p.changes, customers: c.changes }
  })

  // â”€â”€ Full Sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('sync:fullSync', () => {
    const db = getDB()
    const tables = [
      { name: 'branches', query: `SELECT * FROM branches` },
      { name: 'shops', query: `SELECT * FROM shops` },
      { name: 'roles', query: `SELECT * FROM roles` },
      { name: 'users', query: `SELECT * FROM users` },
      { name: 'brands', query: `SELECT * FROM brands` },
      { name: 'categories', query: `SELECT * FROM categories` },
      { name: 'products', query: `SELECT * FROM products WHERE (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 'null')` },
      { name: 'product_variants', query: `SELECT * FROM product_variants` },
      { name: 'customers', query: `SELECT * FROM customers WHERE (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 'null')` },
      { name: 'discounts', query: `SELECT * FROM discounts` },
      { name: 'sales', query: `SELECT * FROM sales` },
      { name: 'sale_items', query: `SELECT * FROM sale_items` },
      { name: 'stock_log', query: `SELECT * FROM stock_log` },
      { name: 'stock_transfers', query: `SELECT * FROM stock_transfers` },
      { name: 'transactions', query: `SELECT * FROM transactions` },
      { name: 'customer_ledger', query: `SELECT * FROM customer_ledger` },
      { name: 'returns', query: `SELECT * FROM returns` },
      { name: 'sync_queue', query: `SELECT * FROM sync_queue` },
      { name: 'backups', query: `SELECT * FROM backups` },
    ]
    let total = 0
    for (const { name, query } of tables) {
      try {
        const rows = db.prepare(query).all()
        for (const row of rows) {
          const exists = db.prepare(`SELECT id FROM sync_queue WHERE table_name=? AND record_id=? AND status IN ('synced','pending')`).get(name, row.id)
          if (!exists) {
            db.prepare(`INSERT INTO sync_queue (id, table_name, record_id, operation, payload, status) VALUES (?, ?, ?, 'insert', ?, 'pending')`)
              .run(uuid(), name, row.id, JSON.stringify(row))
            total++
          }
        }
      } catch { }
    }
    return { total }
  })
}


