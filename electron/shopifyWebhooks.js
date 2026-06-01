const { getDB } = require('./db/database')
const { v4: uuid } = require('uuid')
const crypto = require('crypto')
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

let webhookServer = null

// ── In-memory dedup guard ────────────────────────────────────────────────────
// Shopify can deliver the same webhook twice. We track recently-processed
// (topic + shopify_id) pairs for 30 s to skip exact duplicates.
const recentlyProcessed = new Map()
function isDuplicate(topic, shopifyId) {
  const key = `${topic}::${shopifyId}`
  const ts = recentlyProcessed.get(key)
  if (ts && Date.now() - ts < 30000) return true
  recentlyProcessed.set(key, Date.now())
  // Clean up old entries to prevent unbounded growth
  if (recentlyProcessed.size > 500) {
    const cutoff = Date.now() - 60000
    for (const [k, v] of recentlyProcessed) {
      if (v < cutoff) recentlyProcessed.delete(k)
    }
  }
  return false
}

// ── Config reader ────────────────────────────────────────────────────────────
function getShopifyConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'integrations.json')
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (cfg && cfg.shopify_sync && cfg.shopify_store && cfg.shopify_token) {
        let domain = cfg.shopify_store.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
        if (!domain.includes('.')) domain = `${domain}.myshopify.com`
        return { domain, token: cfg.shopify_token, webhookSecret: cfg.shopify_webhook_secret, enabled: true }
      }
    }
  } catch (err) {
    console.error('[Shopify Webhook Config Error]:', err.message)
  }
  return { enabled: false }
}

// ── Webhook HMAC verification ────────────────────────────────────────────────
function verifyWebhook(body, hmacHeader, secret) {
  if (!secret) return true // Skip verification if no secret configured
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return hash === hmacHeader
}

// ── Audit logger ─────────────────────────────────────────────────────────────
function logWebhookEvent({ source, topic, shopifyId, imsId, status, message }) {
  try {
    const db = getDB()
    db.prepare(`
      INSERT INTO shopify_webhook_log (id, source, topic, shopify_id, ims_id, status, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuid(), source, topic, shopifyId || null, imsId || null, status, message || null)
  } catch (err) {
    console.error('[Shopify Webhook Log Error]:', err.message)
  }
}

// ── Renderer notifier ─────────────────────────────────────────────────────────
// Sends an IPC event to the renderer so the React UI can auto-refresh
function notifyRenderer(event, data = {}) {
  try {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      if (!win.isDestroyed()) win.webContents.send(event, data)
    }
  } catch (err) {
    console.error('[Shopify Webhook Notify Error]:', err.message)
  }
}

// ── Register webhooks with Shopify ───────────────────────────────────────────
async function registerShopifyWebhooks(webhookUrl) {
  const config = getShopifyConfig()
  if (!config.enabled) {
    console.log('[Shopify Webhooks]: Not configured')
    return { success: false, error: 'Shopify not configured' }
  }

  const { domain, token } = config
  const topics = [
    'products/create',
    'products/update',
    'products/delete',
    'inventory_levels/update'
  ]

  // Delete existing webhooks for our topics first (avoids duplicates in Shopify)
  console.log('[Shopify Webhooks]: Checking for existing webhooks...')
  try {
    const listResponse = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
    })
    if (listResponse.ok) {
      const { webhooks = [] } = await listResponse.json()
      console.log(`[Shopify Webhooks]: Found ${webhooks.length} existing webhooks`)
      for (const wh of webhooks) {
        if (topics.includes(wh.topic)) {
          console.log(`[Shopify Webhooks]: Deleting existing ${wh.topic} webhook (ID: ${wh.id})`)
          await fetch(`https://${domain}/admin/api/2024-10/webhooks/${wh.id}.json`, {
            method: 'DELETE',
            headers: { 'X-Shopify-Access-Token': token }
          }).catch(e => console.error(`[Shopify Webhooks]: Failed to delete ${wh.id}:`, e.message))
        }
      }
    }
  } catch (err) {
    console.error('[Shopify Webhooks]: Error listing webhooks:', err.message)
  }

  const results = []
  for (const topic of topics) {
    try {
      const response = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook: { topic, address: `${webhookUrl}/shopify-webhook`, format: 'json' } })
      })
      let data
      try { data = await response.json() } catch { data = {} }

      if (response.ok) {
        console.log(`[Shopify Webhooks]: Registered ${topic} (ID: ${data.webhook?.id})`)
        results.push({ topic, success: true, id: data.webhook?.id })
      } else {
        const errStr = JSON.stringify(data.errors || data.error || response.statusText)
        if (errStr.includes('already exists')) {
          console.log(`[Shopify Webhooks]: ${topic} already registered`)
          results.push({ topic, success: true, existing: true })
        } else {
          console.error(`[Shopify Webhooks]: Failed to register ${topic}:`, errStr)
          results.push({ topic, success: false, error: errStr })
        }
      }
    } catch (err) {
      console.error(`[Shopify Webhooks]: Exception registering ${topic}:`, err.message)
      results.push({ topic, success: false, error: err.message })
    }
  }

  return { success: true, results }
}

// ── Handle: Product Create from Shopify ──────────────────────────────────────
function handleProductCreate(shopifyProduct) {
  const db = getDB()

  // Check if product already exists by shopify_product_id
  const existing = db.prepare(`SELECT id FROM products WHERE shopify_product_id = ?`).get(String(shopifyProduct.id))
  if (existing) {
    console.log(`[Shopify Webhook]: Product ${shopifyProduct.id} already exists — updating instead`)
    return handleProductUpdate(shopifyProduct)
  }

  // Also guard against duplicate SKU
  const variant = shopifyProduct.variants && shopifyProduct.variants[0]
  if (variant?.sku) {
    const bySku = db.prepare(`SELECT id FROM products WHERE sku = ? AND (deleted_at IS NULL OR deleted_at = '')`).get(variant.sku)
    if (bySku) {
      console.log(`[Shopify Webhook]: SKU ${variant.sku} already exists locally — mapping to existing product`)
      db.prepare(`UPDATE products SET shopify_product_id=?, shopify_variant_id=?, shopify_inventory_item_id=?, synced=1, updated_at=datetime('now') WHERE id=?`)
        .run(String(shopifyProduct.id), variant ? String(variant.id) : null, variant ? String(variant.inventory_item_id) : null, bySku.id)
      
      const { enqueue } = require('./ipc/syncHelper')
      const updatedProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(bySku.id)
      enqueue(db, 'products', 'update', updatedProduct)

      logWebhookEvent({ source: 'shopify_to_ims', topic: 'products/create', shopifyId: String(shopifyProduct.id), imsId: bySku.id, status: 'skipped', message: `Mapped to existing product by SKU: ${variant.sku}` })
      notifyRenderer('shopify:webhook:event', { topic: 'products/create', action: 'mapped', productId: bySku.id })
      return { success: true, productId: bySku.id, mapped: true }
    }
  }

  const productId = uuid()
  const product = {
    id: productId,
    name: shopifyProduct.title,
    sku: variant?.sku || null,
    barcode: variant?.barcode || null,
    brand_id: null,
    category_id: null,
    price: parseFloat(variant?.price || 0),
    cost_price: 0,
    quantity: 0,  // Updated by inventory_levels/update webhook
    unit: 'pcs',
    low_stock_threshold: 10,
    shopify_product_id: String(shopifyProduct.id),
    shopify_variant_id: variant ? String(variant.id) : null,
    shopify_inventory_item_id: variant ? String(variant.inventory_item_id) : null,
    synced: 1,    // Mark as synced — came from Shopify, don't echo back
    updated_at: new Date().toISOString(),
    deleted_at: null
  }

  db.prepare(`
    INSERT INTO products (id, name, sku, barcode, brand_id, category_id, price, cost_price, quantity, unit,
      low_stock_threshold, shopify_product_id, shopify_variant_id, shopify_inventory_item_id, synced, updated_at, deleted_at)
    VALUES (@id, @name, @sku, @barcode, @brand_id, @category_id, @price, @cost_price, @quantity, @unit,
      @low_stock_threshold, @shopify_product_id, @shopify_variant_id, @shopify_inventory_item_id, @synced, @updated_at, @deleted_at)
  `).run(product)

  const { enqueue } = require('./ipc/syncHelper')
  enqueue(db, 'products', 'insert', product)

  logWebhookEvent({ source: 'shopify_to_ims', topic: 'products/create', shopifyId: String(shopifyProduct.id), imsId: productId, status: 'success', message: `Created product "${product.name}"` })
  notifyRenderer('shopify:webhook:event', { topic: 'products/create', action: 'created', productId })
  console.log(`[Shopify Webhook]: Created product "${product.name}" (IMS ID: ${productId})`)
  return { success: true, productId }
}

// ── Handle: Product Update from Shopify ──────────────────────────────────────
function handleProductUpdate(shopifyProduct) {
  const db = getDB()

  const existing = db.prepare(`SELECT id FROM products WHERE shopify_product_id = ?`).get(String(shopifyProduct.id))
  if (!existing) {
    console.log(`[Shopify Webhook]: Product ${shopifyProduct.id} not found locally — creating`)
    return handleProductCreate(shopifyProduct)
  }

  const variant = shopifyProduct.variants && shopifyProduct.variants[0]

  db.prepare(`
    UPDATE products SET
      name = ?,
      sku = ?,
      barcode = ?,
      price = ?,
      shopify_variant_id = ?,
      shopify_inventory_item_id = ?,
      synced = 1,
      updated_at = datetime('now')
    WHERE shopify_product_id = ?
  `).run(
    shopifyProduct.title,
    variant?.sku || null,
    variant?.barcode || null,
    parseFloat(variant?.price || 0),
    variant ? String(variant.id) : null,
    variant ? String(variant.inventory_item_id) : null,
    String(shopifyProduct.id)
  )

  const { enqueue } = require('./ipc/syncHelper')
  const updatedProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(existing.id)
  enqueue(db, 'products', 'update', updatedProduct)

  logWebhookEvent({ source: 'shopify_to_ims', topic: 'products/update', shopifyId: String(shopifyProduct.id), imsId: existing.id, status: 'success', message: `Updated product "${shopifyProduct.title}"` })
  notifyRenderer('shopify:webhook:event', { topic: 'products/update', action: 'updated', productId: existing.id })
  console.log(`[Shopify Webhook]: Updated product "${shopifyProduct.title}" (Shopify ID: ${shopifyProduct.id})`)
  return { success: true, productId: existing.id }
}

// ── Handle: Product Delete from Shopify ──────────────────────────────────────
function handleProductDelete(shopifyProductId) {
  const { enqueue, dequeue } = require('./ipc/syncHelper')
  const db = getDB()

  const existing = db.prepare(`SELECT id, name FROM products WHERE shopify_product_id = ?`).get(String(shopifyProductId))
  if (!existing) {
    console.log(`[Shopify Webhook]: Product ${shopifyProductId} not found locally — nothing to delete`)
    logWebhookEvent({ source: 'shopify_to_ims', topic: 'products/delete', shopifyId: String(shopifyProductId), status: 'skipped', message: 'Product not found in IMS' })
    return { success: true, message: 'Product not found' }
  }

  // Check if there's a pending insert in sync queue
  const pendingInsert = db.prepare(`SELECT id FROM sync_queue WHERE table_name = 'products' AND record_id = ? AND operation = 'insert' AND status IN ('pending', 'failed')`).get(existing.id)

  // Hard delete locally
  db.prepare(`DELETE FROM products WHERE shopify_product_id = ?`).run(String(shopifyProductId))

  // Sync delete to MySQL backend
  if (pendingInsert) {
    dequeue(db, 'products', existing.id)
  } else {
    enqueue(db, 'products', 'delete', { id: existing.id })
  }

  logWebhookEvent({ source: 'shopify_to_ims', topic: 'products/delete', shopifyId: String(shopifyProductId), imsId: existing.id, status: 'success', message: `Deleted product "${existing.name}"` })
  notifyRenderer('shopify:webhook:event', { topic: 'products/delete', action: 'deleted', productId: existing.id })
  console.log(`[Shopify Webhook]: Deleted product "${existing.name}" (Shopify ID: ${shopifyProductId})`)
  return { success: true, productId: existing.id }
}

// ── Handle: Inventory Level Update from Shopify ───────────────────────────────
function handleInventoryUpdate(inventoryLevel) {
  const db = getDB()

  const existing = db.prepare(`SELECT id, name, quantity FROM products WHERE shopify_inventory_item_id = ?`).get(String(inventoryLevel.inventory_item_id))
  if (!existing) {
    console.log(`[Shopify Webhook]: No product found for inventory_item_id ${inventoryLevel.inventory_item_id}`)
    logWebhookEvent({ source: 'shopify_to_ims', topic: 'inventory_levels/update', shopifyId: String(inventoryLevel.inventory_item_id), status: 'skipped', message: 'No matching product in IMS' })
    return { success: true, message: 'Product not found' }
  }

  const newQty = inventoryLevel.available ?? 0
  const oldQty = existing.quantity ?? 0

  db.prepare(`UPDATE products SET quantity = ?, synced = 1, updated_at = datetime('now') WHERE shopify_inventory_item_id = ?`)
    .run(newQty, String(inventoryLevel.inventory_item_id))

  const { enqueue } = require('./ipc/syncHelper')

  // Write stock log entry if quantity actually changed
  if (newQty !== oldQty) {
    const diff = newQty - oldQty
    const stockLogId = uuid()
    db.prepare(`
      INSERT INTO stock_log (id, product_id, type, quantity, note, created_at, synced)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
    `).run(stockLogId, existing.id, diff > 0 ? 'in' : 'out', Math.abs(diff), 'Synced from Shopify')

    enqueue(db, 'stock_log', 'insert', {
      id: stockLogId,
      product_id: existing.id,
      type: diff > 0 ? 'in' : 'out',
      quantity: Math.abs(diff),
      note: 'Synced from Shopify',
      created_at: new Date().toISOString(),
      synced: 1
    })
  }

  const updatedProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(existing.id)
  enqueue(db, 'products', 'update', updatedProduct)

  logWebhookEvent({ source: 'shopify_to_ims', topic: 'inventory_levels/update', shopifyId: String(inventoryLevel.inventory_item_id), imsId: existing.id, status: 'success', message: `Inventory updated: ${oldQty} → ${newQty}` })
  notifyRenderer('shopify:webhook:event', { topic: 'inventory_levels/update', action: 'inventory_updated', productId: existing.id, oldQty, newQty })
  console.log(`[Shopify Webhook]: Inventory for "${existing.name}": ${oldQty} → ${newQty}`)
  return { success: true, productId: existing.id }
}

// ── Process webhook payload ───────────────────────────────────────────────────
function processWebhook(topic, payload) {
  const shopifyId = String(payload.id || payload.inventory_item_id || 'unknown')

  // Skip if this exact event was processed within the last 30 s (Shopify duplicate delivery)
  if (isDuplicate(topic, shopifyId)) {
    console.log(`[Shopify Webhook]: Duplicate event ignored — ${topic} ${shopifyId}`)
    return { success: true, skipped: true, reason: 'duplicate' }
  }

  try {
    switch (topic) {
      case 'products/create':
        return handleProductCreate(payload)
      case 'products/update':
        return handleProductUpdate(payload)
      case 'products/delete':
        return handleProductDelete(payload.id)
      case 'inventory_levels/update':
        return handleInventoryUpdate(payload)
      default:
        console.log(`[Shopify Webhook]: Unknown topic "${topic}"`)
        return { success: false, error: `Unknown topic: ${topic}` }
    }
  } catch (err) {
    console.error(`[Shopify Webhook]: Error processing ${topic}:`, err.message)
    logWebhookEvent({ source: 'shopify_to_ims', topic, shopifyId, status: 'error', message: err.message })
    return { success: false, error: err.message }
  }
}

// ── Bulk import all Shopify products into IMS ─────────────────────────────────
async function importAllShopifyProducts() {
  const config = getShopifyConfig()
  if (!config.enabled) return { success: false, error: 'Shopify not configured' }

  const { domain, token } = config
  let imported = 0, skipped = 0, errors = 0
  let pageInfo = null

  console.log('[Shopify Import]: Starting bulk product import...')

  do {
    const url = pageInfo
      ? `https://${domain}/admin/api/2024-10/products.json?limit=250&page_info=${pageInfo}`
      : `https://${domain}/admin/api/2024-10/products.json?limit=250&status=active`

    try {
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Shopify API error: ${JSON.stringify(err.errors || res.statusText)}`)
      }

      const data = await res.json()
      const products = data.products || []

      for (const sp of products) {
        try {
          const result = processWebhook('products/create', sp)
          if (result.skipped) skipped++
          else if (result.success) imported++
          else errors++
        } catch (e) {
          errors++
          console.error('[Shopify Import]: Error importing product:', sp.id, e.message)
        }
      }

      // Handle pagination via Link header
      const linkHeader = res.headers.get('Link') || ''
      const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/)
      pageInfo = nextMatch ? nextMatch[1] : null
    } catch (err) {
      console.error('[Shopify Import]: Fetch error:', err.message)
      return { success: false, error: err.message, imported, skipped, errors }
    }
  } while (pageInfo)

  console.log(`[Shopify Import]: Done — imported: ${imported}, skipped: ${skipped}, errors: ${errors}`)
  notifyRenderer('shopify:webhook:event', { topic: 'bulk_import', action: 'completed', imported, skipped, errors })
  return { success: true, imported, skipped, errors }
}

// ── HTTP Webhook Server ───────────────────────────────────────────────────────
function startWebhookServer(port = 3456) {
  if (webhookServer) {
    console.log('[Shopify Webhook Server]: Already running')
    return { success: true, port }
  }

  const http = require('http')

  webhookServer = http.createServer((req, res) => {
    // Health-check
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/shopify-webhook')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ status: 'ok', service: 'shopify-webhook-server' }))
    }

    if (req.method === 'POST' && req.url === '/shopify-webhook') {
      let body = ''
      req.on('data', chunk => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const hmac = req.headers['x-shopify-hmac-sha256']
          const topic = req.headers['x-shopify-topic']
          const config = getShopifyConfig()

          if (!topic) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ error: 'Missing x-shopify-topic header' }))
          }

          let payload = null
          try {
            payload = JSON.parse(body)
          } catch (jsonErr) {
            console.error('[Shopify Webhook]: Failed to parse body JSON:', jsonErr.message)
          }

          // Verify HMAC signature if secret is configured
          if (config.webhookSecret && !verifyWebhook(body, hmac, config.webhookSecret)) {
            console.error('[Shopify Webhook]: HMAC verification failed')
            logWebhookEvent({
              source: 'shopify_to_ims',
              topic: topic,
              shopifyId: payload ? String(payload.id || payload.inventory_item_id || '') : null,
              status: 'error',
              message: 'HMAC signature verification failed. Please check that your Webhook Secret matches the Shopify Custom App Client Secret (API Secret Key), or clear the Webhook Secret in settings.'
            })
            res.writeHead(401, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ error: 'Unauthorized' }))
          }
          console.log(`[Shopify Webhook]: Received ${topic} (ID: ${payload.id || payload.inventory_item_id})`)

          const result = processWebhook(topic, payload)

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (err) {
          console.error('[Shopify Webhook]: Error processing request:', err.message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        }
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  webhookServer.listen(port, () => {
    console.log(`[Shopify Webhook Server]: Listening on port ${port}`)
  })

  webhookServer.on('error', err => {
    console.error('[Shopify Webhook Server]: Error:', err.message)
  })

  return { success: true, port }
}

function stopWebhookServer() {
  if (webhookServer) {
    webhookServer.close()
    webhookServer = null
    console.log('[Shopify Webhook Server]: Stopped')
    return { success: true }
  }
  return { success: false, error: 'Server not running' }
}

// ── Single, consolidated module.exports ──────────────────────────────────────
module.exports = {
  startWebhookServer,
  stopWebhookServer,
  registerShopifyWebhooks,
  processWebhook,
  importAllShopifyProducts,
  getShopifyConfig,
}
