const { ipcMain } = require('electron')
const { getDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const { enqueue } = require('./syncHelper')

module.exports = function registerInventoryHandlers() {
  ipcMain.handle('inventory:adjustStock', (_, { productId, type, qty, note, batch_no, expiry_date, branch_id }) => {
    const db   = getDB()
    const sign = type === 'out' ? -1 : 1
    db.transaction(() => {
      db.prepare(`UPDATE products SET quantity = quantity + ?, synced=0 WHERE id = ?`).run(sign * qty, productId)
      const logRow = { id: uuid(), product_id: productId, type, quantity: qty, batch_no: batch_no || null, expiry_date: expiry_date || null, note: note || null, branch_id: branch_id || null }
      db.prepare(`INSERT INTO stock_log (id, product_id, type, quantity, batch_no, expiry_date, note, branch_id) VALUES (@id, @product_id, @type, @quantity, @batch_no, @expiry_date, @note, @branch_id)`).run(logRow)
      enqueue(db, 'stock_log', 'insert', logRow)
    })()
    return { success: true }
  })

  ipcMain.handle('inventory:getStockLog', (_, productId) =>
    getDB().prepare(`
      SELECT s.*, p.name AS product_name FROM stock_log s
      LEFT JOIN products p ON p.id = s.product_id
      WHERE s.product_id = ? ORDER BY s.created_at DESC
    `).all(productId)
  )

  ipcMain.handle('inventory:getAllStockLog', () =>
    getDB().prepare(`
      SELECT s.*, p.name AS product_name FROM stock_log s
      LEFT JOIN products p ON p.id = s.product_id
      ORDER BY s.created_at DESC LIMIT 500
    `).all()
  )

  ipcMain.handle('inventory:transfer', (_, { from_shop_id, to_shop_id, product_id, quantity, note }) => {
    const db  = getDB()
    const id  = uuid()
    const row = { id, from_shop_id, to_shop_id, product_id, quantity, note: note || null }
    db.prepare(`INSERT INTO stock_transfers (id, from_shop_id, to_shop_id, product_id, quantity, note) VALUES (@id, @from_shop_id, @to_shop_id, @product_id, @quantity, @note)`).run(row)
    enqueue(db, 'stock_transfers', 'insert', row)
    return { id, success: true }
  })

  ipcMain.handle('inventory:getTransfers', () =>
    getDB().prepare(`
      SELECT t.*, p.name AS product_name, s1.name AS from_shop, s2.name AS to_shop
      FROM stock_transfers t
      LEFT JOIN products p ON p.id = t.product_id
      LEFT JOIN shops s1 ON s1.id = t.from_shop_id
      LEFT JOIN shops s2 ON s2.id = t.to_shop_id
      ORDER BY t.created_at DESC
    `).all()
  )
}
