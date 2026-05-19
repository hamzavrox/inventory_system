const { getDB } = require('./db/database')
const { v4: uuid } = require('uuid')

const MAX_RETRIES = 3

// â”€â”€ HTTP helper using Node http/https (avoids Electron fetch issues) â”€â”€â”€â”€â”€â”€â”€â”€â”€
function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed   = new URL(url)
    const isHttps  = parsed.protocol === 'https:'
    const mod      = isHttps ? require('https') : require('http')

    const reqOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || (isHttps ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers:  options.headers || {},
      timeout:  15000,
    }

    const req = mod.request(reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        resolve({
          ok:     res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json:   () => Promise.resolve(JSON.parse(data)),
          text:   () => Promise.resolve(data),
        })
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })

    if (body) req.write(body)
    req.end()
  })
}

// Normalize URL: strip trailing slash
function normalizeUrl(url) {
  return (url || '').replace(/\/+$/, '')
}

// â”€â”€ PUSH: SQLite sync_queue â†’ server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function pushSync(apiUrl, authToken) {
  const db      = getDB()
  const pending = db.prepare(`
    SELECT * FROM sync_queue
    WHERE status = 'pending' AND retries < ?
    ORDER BY created_at ASC LIMIT 100
  `).all(MAX_RETRIES)

  if (!pending.length) return { synced: 0, failed: 0 }

  const body = JSON.stringify({
    records: pending.map(p => ({
      id:        p.id,
      table:     p.table_name,
      operation: p.operation,
      payload:   p.payload,
    }))
  })

  const res = await httpRequest(
    `${normalizeUrl(apiUrl)}/sync/push`,
    {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization':  `Bearer ${authToken || ''}`,
      },
    },
    body
  )

  if (!res.ok) throw new Error(`Push failed: HTTP ${res.status}`)

  const { results } = await res.json()
  let synced = 0, failed = 0

  for (const r of results) {
    if (r.status === 'ok' || r.status === 'skipped') {
      db.prepare(`UPDATE sync_queue SET status='synced', synced_at=datetime('now') WHERE id=?`).run(r.id)
      synced++
    } else {
      db.prepare(`UPDATE sync_queue SET retries=retries+1, status=CASE WHEN retries+1 >= ? THEN 'failed' ELSE 'pending' END WHERE id=?`).run(MAX_RETRIES, r.id)
      failed++
    }
  }

  return { synced, failed }
}

// â”€â”€ PULL: server â†’ SQLite â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function pullSync(apiUrl, authToken) {
  const db = getDB()

  let since = '1970-01-01T00:00:00Z'
  try {
    const row = db.prepare(`SELECT detail FROM activity_logs WHERE action='__pull_ts__' ORDER BY created_at DESC LIMIT 1`).get()
    if (row?.detail) since = row.detail
  } catch {}

  const res = await httpRequest(
    `${normalizeUrl(apiUrl)}/sync/pull?since=${encodeURIComponent(since)}&limit=999999`,
    {
      headers: { 'Authorization': `Bearer ${authToken || ''}` },
    }
  )

  if (!res.ok) throw new Error(`Pull failed: HTTP ${res.status}`)

  const { data, pulledAt } = await res.json()
  let pulled = 0
  const tableInfoCache = {}
  function getTableCols(tableName) {
    if (tableInfoCache[tableName]) return tableInfoCache[tableName]
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all()
    if (!info.length) return null
    const cols = info.map(c => c.name)
    tableInfoCache[tableName] = cols
    return cols
  }

  for (const [table, rows] of Object.entries(data)) {
    const validCols = getTableCols(table)
    if (!validCols) continue

    for (const row of rows) {
      try {
        const cols    = Object.keys(row).filter(c => validCols.includes(c))
        if (!cols.length) continue
        const vals    = cols.map(c => row[c] instanceof Date ? row[c].toISOString() : row[c])
        const setCols = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(', ')
        
        db.prepare(`
          INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
          ON CONFLICT(id) DO UPDATE SET ${setCols}
        `).run(...vals)
        pulled++
      } catch (err) { console.error('Pull Error on', table, err.message) }
    }
  }

  try {
    db.prepare(`INSERT INTO activity_logs (id, action, detail) VALUES (?, '__pull_ts__', ?)`).run(uuid(), pulledAt)
  } catch {}

  return { pulled, pulledAt }
}

// â”€â”€ MAIN SYNC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runSync(apiUrl, authToken) {
  if (!apiUrl) return { synced: 0, skipped: true }

  const push = await pushSync(apiUrl, authToken)
  const pull = await pullSync(apiUrl, authToken)

  return { synced: push.synced, failed: push.failed, pulled: pull.pulled }
}

// Pull ALL data from server (since beginning of time) â€” for fresh installs
async function pullAll(apiUrl, authToken) {
  if (!apiUrl) return { pulled: 0, skipped: true }
  const db = getDB()

  const res = await httpRequest(
    `${normalizeUrl(apiUrl)}/sync/pull?since=${encodeURIComponent('1970-01-01T00:00:00Z')}&limit=999999`,
    { headers: { 'Authorization': `Bearer ${authToken || ''}` } }
  )

  if (!res.ok) throw new Error(`Pull failed: HTTP ${res.status}`)

  const { data } = await res.json()
  let pulled = 0
  const tableInfoCache = {}
  function getTableCols(tableName) {
    if (tableInfoCache[tableName]) return tableInfoCache[tableName]
    const info = db.prepare(`PRAGMA table_info(${tableName})`).all()
    if (!info.length) return null
    const cols = info.map(c => c.name)
    tableInfoCache[tableName] = cols
    return cols
  }

  for (const [table, rows] of Object.entries(data)) {
    const validCols = getTableCols(table)
    if (!validCols) continue

    for (const row of rows) {
      try {
        const cols    = Object.keys(row).filter(c => validCols.includes(c))
        if (!cols.length) continue
        const vals    = cols.map(c => row[c] instanceof Date ? row[c].toISOString() : row[c])
        const setCols = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(', ')
        
        db.prepare(`
          INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
          ON CONFLICT(id) DO UPDATE SET ${setCols}
        `).run(...vals)
        pulled++
      } catch (err) { console.error('PullAll Error on', table, err.message) }
    }
  }

  return { pulled }
}

function getSyncStatus() {
  const db = getDB()
  return {
    pending: db.prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE status='pending'`).get().c,
    failed:  db.prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE status='failed'`).get().c,
    synced:  db.prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE status='synced'`).get().c,
  }
}

function resetFailed() {
  getDB().prepare(`UPDATE sync_queue SET status='pending', retries=0 WHERE status='failed'`).run()
  return { success: true }
}

module.exports = { runSync, getSyncStatus, resetFailed, pullAll }


