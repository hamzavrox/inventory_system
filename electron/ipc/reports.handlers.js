const { ipcMain } = require('electron')
const { getDB } = require('../db/database')

module.exports = function registerReportHandlers() {
  ipcMain.handle('reports:sales', (_, { from, to, branch_id } = {}) => {
    const params = []
    let where = `WHERE 1=1`
    if (from)      { where += ` AND s.created_at >= ?`; params.push(from) }
    if (to)        { where += ` AND s.created_at <= ?`; params.push(to) }
    if (branch_id) { where += ` AND s.branch_id = ?`;   params.push(branch_id) }

    return getDB().prepare(`
      SELECT date(s.created_at) AS day,
        COUNT(*) AS total_sales,
        SUM(s.total) AS revenue,
        SUM(s.discount) AS discounts,
        SUM(s.tax) AS taxes
      FROM sales s ${where}
      GROUP BY day ORDER BY day
    `).all(...params)
  })

  ipcMain.handle('reports:topProducts', (_, { from, to, limit = 10 } = {}) => {
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND s.created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND s.created_at <= ?`; params.push(to) }
    params.push(limit)

    return getDB().prepare(`
      SELECT si.product_id, si.name,
        SUM(si.qty) AS total_qty,
        SUM(si.total) AS total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      ${where}
      GROUP BY si.product_id ORDER BY total_qty DESC LIMIT ?
    `).all(...params)
  })

  ipcMain.handle('reports:profitLoss', (_, { from, to } = {}) => {
    const db = getDB()
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND created_at <= ?`; params.push(to) }

    const income  = db.prepare(`SELECT COALESCE(SUM(amount),0) AS v FROM transactions ${where} AND type='income'`).get(...params)
    const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) AS v FROM transactions ${where} AND type='expense'`).get(...params)
    const cogs    = db.prepare(`
      SELECT COALESCE(SUM(si.qty * p.cost_price),0) AS v
      FROM sale_items si JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      ${where.replace('created_at', 's.created_at')}
    `).get(...params)

    return {
      revenue: income.v,
      cogs: cogs.v,
      gross_profit: income.v - cogs.v,
      expenses: expense.v,
      net_profit: income.v - cogs.v - expense.v,
    }
  })

  ipcMain.handle('reports:tax', (_, { from, to } = {}) => {
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND created_at <= ?`; params.push(to) }

    return getDB().prepare(`
      SELECT date(created_at) AS day, SUM(tax) AS total_tax, SUM(total) AS revenue
      FROM sales ${where}
      GROUP BY day ORDER BY day
    `).all(...params)
  })

  ipcMain.handle('reports:inventory', () =>
    getDB().prepare(`
      SELECT p.*, c.name AS category_name, b.name AS brand_name,
        (p.quantity * p.cost_price) AS stock_value
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      WHERE p.deleted_at IS NULL
      ORDER BY p.name
    `).all()
  )

  ipcMain.handle('reports:branchSales', (_, { from, to } = {}) => {
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND s.created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND s.created_at <= ?`; params.push(to) }

    return getDB().prepare(`
      SELECT b.name AS branch, COUNT(s.id) AS sales_count, SUM(s.total) AS revenue
      FROM sales s LEFT JOIN branches b ON b.id = s.branch_id
      ${where}
      GROUP BY s.branch_id ORDER BY revenue DESC
    `).all(...params)
  })
}


