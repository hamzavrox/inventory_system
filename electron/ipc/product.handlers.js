const { ipcMain } = require('electron')
const { getDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const { enqueue, dequeue } = require('./syncHelper')

module.exports = function registerProductHandlers() {
  // â”€â”€ Brands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('brands:getAll', () =>
    getDB().prepare(`SELECT * FROM brands ORDER BY name`).all()
  )
  ipcMain.handle('brands:add', (_, { name }) => {
    const db = getDB()
    const id = uuid()
    db.prepare(`INSERT INTO brands (id, name) VALUES (?, ?)`).run(id, name)
    enqueue(db, 'brands', 'insert', { id, name })
    return { id, name }
  })
  ipcMain.handle('brands:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='brands' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM brands WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'brands', id)
    else enqueue(db, 'brands', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('categories:getAll', () =>
    getDB().prepare(`SELECT * FROM categories ORDER BY name`).all()
  )
  ipcMain.handle('categories:add', (_, { name, parent_id = null }) => {
    const db = getDB()
    const id = uuid()
    db.prepare(`INSERT INTO categories (id, name, parent_id) VALUES (?, ?, ?)`).run(id, name, parent_id)
    enqueue(db, 'categories', 'insert', { id, name, parent_id })
    return { id, name, parent_id }
  })
  ipcMain.handle('categories:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='categories' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'categories', id)
    else enqueue(db, 'categories', 'delete', { id })
    return { success: true }
  })

  // â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('products:getAll', () =>
    getDB().prepare(`
      SELECT p.*, c.name AS category_name, b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE (p.deleted_at IS NULL OR p.deleted_at = '' OR p.deleted_at = 'null')
      ORDER BY p.name
    `).all()
  )

  ipcMain.handle('products:add', (_, data) => {
    const db = getDB()
    const id = uuid()
    const row = { id, brand_id: null, category_id: null, barcode: null, unit: 'pcs', low_stock_threshold: 10, cost_price: 0, ...data, sku: data.sku || null }
    db.prepare(`
      INSERT INTO products (id, name, sku, barcode, brand_id, category_id, price, cost_price, quantity, unit, low_stock_threshold)
      VALUES (@id, @name, @sku, @barcode, @brand_id, @category_id, @price, @cost_price, @quantity, @unit, @low_stock_threshold)
    `).run(row)
    enqueue(db, 'products', 'insert', row)
    return { ...row }
  })

  ipcMain.handle('products:update', (_, id, data) => {
    const db = getDB()
    const row = { id, ...data }
    db.prepare(`
      UPDATE products SET
        name=@name, sku=@sku, barcode=@barcode, brand_id=@brand_id,
        category_id=@category_id, price=@price, cost_price=@cost_price,
        quantity=@quantity, unit=@unit, low_stock_threshold=@low_stock_threshold,
        updated_at=datetime('now'), synced=0
      WHERE id=@id
    `).run(row)
    enqueue(db, 'products', 'update', row)
    return row
  })

  ipcMain.handle('products:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='products' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM products WHERE id=?`).run(id)
    if (pendingInsert) dequeue(db, 'products', id)
    else enqueue(db, 'products', 'delete', { id })
    return { success: true }
  })

  ipcMain.handle('products:getLowStock', () =>
    getDB().prepare(`
      SELECT * FROM products
      WHERE (deleted_at IS NULL OR deleted_at = '' OR deleted_at = 'null') AND quantity <= low_stock_threshold
      ORDER BY quantity ASC
    `).all()
  )

  // â”€â”€ Variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  ipcMain.handle('variants:getByProduct', (_, productId) =>
    getDB().prepare(`SELECT * FROM product_variants WHERE product_id = ?`).all(productId)
  )
  ipcMain.handle('variants:add', (_, data) => {
    const db = getDB()
    const id = uuid()
    const row = { id, ...data }
    db.prepare(`
      INSERT INTO product_variants (id, product_id, name, sku, price, quantity)
      VALUES (@id, @product_id, @name, @sku, @price, @quantity)
    `).run(row)
    enqueue(db, 'product_variants', 'insert', row)
    return row
  })
  ipcMain.handle('variants:delete', (_, id) => {
    const db = getDB()
    const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name='product_variants' AND record_id=? AND operation='insert' AND status IN ('pending', 'failed')`).get(id)
    db.prepare(`DELETE FROM product_variants WHERE id = ?`).run(id)
    if (pendingInsert) dequeue(db, 'product_variants', id)
    else enqueue(db, 'product_variants', 'delete', { id })
    return { success: true }
  })
}


