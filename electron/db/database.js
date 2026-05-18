const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')
const { schema, SCHEMA_VERSION } = require('./migrations')

let db

function initDB() {
  const dbPath = path.join(app.getPath('userData'), 'inventory.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(schema)

  // Track schema version
  const row = db.prepare('SELECT version FROM schema_version').get()
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION)
    _seedDefaults()
  }

  // â”€â”€ Run column migrations for existing databases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _migrateColumns()
}

function _migrateColumns() {
  // Helper: add column only if it doesn't exist yet
  const addCol = (table, column, definition) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all()
    if (!cols.find(c => c.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
    }
  }

  // Products table â€” columns added after initial release
  addCol('products', 'barcode',             'TEXT')
  addCol('products', 'brand_id',            'TEXT')
  addCol('products', 'category_id',         'TEXT')
  addCol('products', 'cost_price',          'REAL DEFAULT 0')
  addCol('products', 'unit',                "TEXT DEFAULT 'pcs'")
  addCol('products', 'low_stock_threshold', 'INTEGER DEFAULT 10')

  // Stock log â€” batch tracking columns
  addCol('stock_log', 'batch_no',    'TEXT')
  addCol('stock_log', 'expiry_date', 'TEXT')
  addCol('stock_log', 'branch_id',   'TEXT')
}

function _seedDefaults() {
  const { v4: uuid } = require('uuid')

  // Default branch
  const branchId = uuid()
  db.prepare(`INSERT OR IGNORE INTO branches (id, name) VALUES (?, ?)`).run(branchId, 'Main Branch')

  // Default admin role
  const roleId = uuid()
  db.prepare(`INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)`).run(
    roleId, 'Admin', JSON.stringify({ all: true })
  )

  // Default admin user  (password: admin123 â€” change in production)
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, username, password, role_id, branch_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuid(), 'Administrator', 'admin', 'admin123', roleId, branchId)
}

function getDB() { return db }

function reloadDB() {
  if (db) { try { db.close() } catch {} }
  db = null
  initDB()
}

module.exports = { initDB, getDB, reloadDB }


