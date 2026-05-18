const { ipcMain } = require('electron')
const { getDB } = require('../db/database')
const { v4: uuid } = require('uuid')
const { enqueue } = require('./syncHelper')

module.exports = function registerAccountingHandlers() {
  ipcMain.handle('accounting:getTransactions', (_, { type, from, to } = {}) => {
    let q = `SELECT * FROM transactions WHERE 1=1`
    const params = []
    if (type) { q += ` AND type = ?`;        params.push(type) }
    if (from) { q += ` AND created_at >= ?`; params.push(from) }
    if (to)   { q += ` AND created_at <= ?`; params.push(to) }
    q += ` ORDER BY created_at DESC LIMIT 500`
    return getDB().prepare(q).all(...params)
  })

  ipcMain.handle('accounting:addTransaction', (_, { type, category, amount, note, branch_id }) => {
    const db  = getDB()
    const id  = uuid()
    const row = { id, type, category: category || null, amount, note: note || null, branch_id: branch_id || null }
    db.prepare(`INSERT INTO transactions (id, type, category, amount, note, branch_id) VALUES (@id, @type, @category, @amount, @note, @branch_id)`).run(row)
    enqueue(db, 'transactions', 'insert', row)
    return { id, success: true }
  })

  ipcMain.handle('accounting:getSummary', (_, { from, to } = {}) => {
    const db = getDB()
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND created_at <= ?`; params.push(to) }

    const income  = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions ${where} AND type='income'`).get(...params)
    const expense = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions ${where} AND type='expense'`).get(...params)
    return { income: income.total, expense: expense.total, profit: income.total - expense.total }
  })

  ipcMain.handle('accounting:getCashFlow', (_, { from, to } = {}) => {
    const params = []
    let where = `WHERE 1=1`
    if (from) { where += ` AND created_at >= ?`; params.push(from) }
    if (to)   { where += ` AND created_at <= ?`; params.push(to) }
    return getDB().prepare(`
      SELECT date(created_at) AS day, type, SUM(amount) AS total
      FROM transactions ${where} GROUP BY day, type ORDER BY day
    `).all(...params)
  })
}


