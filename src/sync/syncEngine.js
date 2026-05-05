// electron/sync/syncEngine.js
const { getDB } = require('../db/database')

async function runSync(apiUrl, authToken) {
  const db = getDB()

  // 1. Fetch all unsynced products
  const pending = db.prepare(
    `SELECT * FROM products WHERE synced = 0`
  ).all()

  if (!pending.length) return { synced: 0 }

  // 2. Push to cloud (batch upsert)
  const res = await fetch(`${apiUrl}/products/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ records: pending }),
  })

  if (!res.ok) throw new Error('Sync failed: ' + res.status)

  // 3. Mark as synced
  const ids = pending.map(p => p.id)
  const marks = db.prepare(`UPDATE products SET synced = 1 WHERE id = ?`)
  const markAll = db.transaction(() => ids.forEach(id => marks.run(id)))
  markAll()

  return { synced: ids.length }
}

module.exports = { runSync }