const { ipcMain } = require('electron')
const { getDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const { enqueue } = require('./syncHelper')
const { syncProduct } = require('../shopifySync')


function nextInvoiceNo(db) {
  const row = db.prepare(`SELECT invoice_no FROM sales ORDER BY created_at DESC LIMIT 1`).get()
  if (!row) return 'INV-0001'
  const num = parseInt(row.invoice_no.split('-')[1] || '0') + 1
  return `INV-${String(num).padStart(4, '0')}`
}

module.exports = function registerSalesHandlers() {
  ipcMain.handle('sales:create', (_, { customer_id, branch_id, items, discount, tax, paid, payment_method, note }) => {
    const db = getDB()
    const id = uuid()
    const invoice_no = nextInvoiceNo(db)

    const subtotal  = items.reduce((s, i) => s + i.total, 0)
    const total     = subtotal - (discount || 0) + (tax || 0)
    const change_due = (paid || 0) - total

    const saleRow = { id, invoice_no, customer_id: customer_id || null, branch_id: branch_id || null, subtotal, discount: discount || 0, tax: tax || 0, total, paid: paid || 0, change_due, payment_method: payment_method || 'cash', note: note || null }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO sales (id, invoice_no, customer_id, branch_id, subtotal, discount, tax, total, paid, change_due, payment_method, note)
        VALUES (@id, @invoice_no, @customer_id, @branch_id, @subtotal, @discount, @tax, @total, @paid, @change_due, @payment_method, @note)
      `).run(saleRow)
      enqueue(db, 'sales', 'insert', saleRow)

      for (const item of items) {
        const itemRow = { id: uuid(), sale_id: id, product_id: item.product_id, variant_id: item.variant_id || null, name: item.name, qty: item.qty, price: item.price, discount: item.discount || 0, total: item.total }
        db.prepare(`
          INSERT INTO sale_items (id, sale_id, product_id, variant_id, name, qty, price, discount, total)
          VALUES (@id, @sale_id, @product_id, @variant_id, @name, @qty, @price, @discount, @total)
        `).run(itemRow)
        enqueue(db, 'sale_items', 'insert', itemRow)

        db.prepare(`UPDATE products SET quantity = quantity - ?, synced=0 WHERE id = ?`).run(item.qty, item.product_id)
        const logRow = { id: uuid(), product_id: item.product_id, type: 'out', quantity: item.qty, note: `Sale ${invoice_no}` }
        db.prepare(`INSERT INTO stock_log (id, product_id, type, quantity, note) VALUES (@id, @product_id, @type, @quantity, @note)`).run(logRow)
        enqueue(db, 'stock_log', 'insert', logRow)
      }

      if (customer_id) {
        db.prepare(`UPDATE customers SET balance = balance - ? WHERE id = ?`).run(total - (paid || 0), customer_id)
        const ledgerRow = { id: uuid(), customer_id, type: 'sale', amount: total, note: invoice_no, ref_id: id }
        db.prepare(`INSERT INTO customer_ledger (id, customer_id, type, amount, note, ref_id) VALUES (@id, @customer_id, @type, @amount, @note, @ref_id)`).run(ledgerRow)
        enqueue(db, 'customer_ledger', 'insert', ledgerRow)
      }

      const txRow = { id: uuid(), type: 'income', category: 'sale', amount: total, note: invoice_no, ref_id: id }
      db.prepare(`INSERT INTO transactions (id, type, category, amount, note, ref_id) VALUES (@id, @type, @category, @amount, @note, @ref_id)`).run(txRow)
      enqueue(db, 'transactions', 'insert', txRow)
    })()

    // Shopify sync trigger after transaction commits (non-blocking)
    for (const item of items) {
      syncProduct(item.product_id).catch(err => console.error('[Shopify Sale sync error]:', err))
    }

    return { id, invoice_no, total, change_due }
  })

  ipcMain.handle('sales:getAll', (_, { limit = 100000, offset = 0 } = {}) =>
    getDB().prepare(`
      SELECT s.*, c.name AS customer_name
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY s.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset)
  )

  ipcMain.handle('sales:getById', (_, id) => {
    const db = getDB()
    const sale  = db.prepare(`SELECT * FROM sales WHERE id = ?`).get(id)
    const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id = ?`).all(id)
    return { ...sale, items }
  })

  ipcMain.handle('sales:return', (_, { sale_id, reason, refund_amount }) => {
    const db = getDB()
    const id = uuid()
    const items = db.prepare(`SELECT * FROM sale_items WHERE sale_id = ?`).all(sale_id)

    db.transaction(() => {
      const retRow = { id, sale_id, reason: reason || null, refund_amount: refund_amount || 0 }
      db.prepare(`INSERT INTO returns (id, sale_id, reason, refund_amount) VALUES (@id, @sale_id, @reason, @refund_amount)`).run(retRow)
      enqueue(db, 'returns', 'insert', retRow)
      db.prepare(`UPDATE sales SET status='returned' WHERE id = ?`).run(sale_id)
      enqueue(db, 'sales', 'update', { id: sale_id, status: 'returned' })

      for (const item of items) {
        db.prepare(`UPDATE products SET quantity = quantity + ? WHERE id = ?`).run(item.qty, item.product_id)
        const logRow = { id: uuid(), product_id: item.product_id, type: 'in', quantity: item.qty, note: `Return ${sale_id}` }
        db.prepare(`INSERT INTO stock_log (id, product_id, type, quantity, note) VALUES (@id, @product_id, @type, @quantity, @note)`).run(logRow)
        enqueue(db, 'stock_log', 'insert', logRow)
      }

      if (refund_amount > 0) {
        const txRow = { id: uuid(), type: 'expense', category: 'refund', amount: refund_amount, note: `Refund for ${sale_id}`, ref_id: id }
        db.prepare(`INSERT INTO transactions (id, type, category, amount, note, ref_id) VALUES (@id, @type, @category, @amount, @note, @ref_id)`).run(txRow)
        enqueue(db, 'transactions', 'insert', txRow)
      }
    })()

    // Shopify sync trigger after transaction commits (non-blocking)
    for (const item of items) {
      syncProduct(item.product_id).catch(err => console.error('[Shopify Return sync error]:', err))
    }

    return { id, success: true }
  })
}


