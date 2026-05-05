const { ipcMain } = require('electron')
const { getDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const { enqueue, dequeue } = require('./syncHelper')

module.exports = function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', () =>
    getDB().prepare(`SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY name`).all()
  )

  ipcMain.handle('customers:add', (_, data) => {
    const db  = getDB()
    const id  = uuid()
    const row = { id, phone: null, email: null, address: null, credit_limit: 0, ...data }
    db.prepare(`INSERT INTO customers (id, name, phone, email, address, credit_limit) VALUES (@id, @name, @phone, @email, @address, @credit_limit)`).run(row)
    enqueue(db, 'customers', 'insert', row)
    return row
  })

  ipcMain.handle('customers:update', (_, id, data) => {
    const db  = getDB()
    const row = { id, ...data }
    db.prepare(`UPDATE customers SET name=@name, phone=@phone, email=@email, address=@address, credit_limit=@credit_limit WHERE id=@id`).run(row)
    enqueue(db, 'customers', 'update', row)
    return row
  })

  ipcMain.handle('customers:delete', (_, id) => {
    const db = getDB()
    db.prepare(`UPDATE customers SET deleted_at=datetime('now') WHERE id=?`).run(id)
    const synced = db.prepare(`SELECT id FROM sync_queue WHERE table_name='customers' AND record_id=? AND status='synced'`).get(id)
    if (synced) enqueue(db, 'customers', 'delete', { id })
    else dequeue(db, 'customers', id)
    return { success: true }
  })

  ipcMain.handle('customers:getLedger', (_, customerId) =>
    getDB().prepare(`SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC`).all(customerId)
  )

  ipcMain.handle('customers:getPurchaseHistory', (_, customerId) =>
    getDB().prepare(`
      SELECT s.*, GROUP_CONCAT(si.name, ', ') AS items_summary
      FROM sales s LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.customer_id = ? GROUP BY s.id ORDER BY s.created_at DESC
    `).all(customerId)
  )

  ipcMain.handle('customers:addPayment', (_, { customer_id, amount, note }) => {
    const db  = getDB()
    const id  = uuid()
    db.transaction(() => {
      db.prepare(`UPDATE customers SET balance = balance + ? WHERE id = ?`).run(amount, customer_id)
      const ledgerRow = { id, customer_id, type: 'payment', amount, note: note || null }
      db.prepare(`INSERT INTO customer_ledger (id, customer_id, type, amount, note) VALUES (@id, @customer_id, @type, @amount, @note)`).run(ledgerRow)
      enqueue(db, 'customer_ledger', 'insert', ledgerRow)
    })()
    return { id, success: true }
  })
}
