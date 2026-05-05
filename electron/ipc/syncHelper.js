const { v4: uuid } = require('uuid')

function enqueue(db, table, operation, payload) {
  try {
    const record_id = payload.id || ''
    // Remove existing pending/failed entries for same record to avoid duplicates
    db.prepare(`
      DELETE FROM sync_queue
      WHERE table_name = ? AND record_id = ? AND status IN ('pending', 'failed')
    `).run(table, record_id)
    db.prepare(`
      INSERT INTO sync_queue (id, table_name, record_id, operation, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuid(), table, record_id, operation, JSON.stringify(payload))
  } catch {}
}

// Remove all pending/failed queue entries for a record (used when local delete cancels unsynced insert)
function dequeue(db, table, record_id) {
  try {
    db.prepare(`
      DELETE FROM sync_queue
      WHERE table_name = ? AND record_id = ? AND status IN ('pending', 'failed')
    `).run(table, record_id)
  } catch {}
}

module.exports = { enqueue, dequeue }
