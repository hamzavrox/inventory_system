const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const { getDB } = require('./db/database')

let cachedLocationId = null

function getShopifyConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'integrations.json')
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (cfg && cfg.shopify_sync && cfg.shopify_store && cfg.shopify_token) {
        let domain = cfg.shopify_store.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
        if (!domain.includes('.')) {
          domain = `${domain}.myshopify.com`
        }
        return { domain, token: cfg.shopify_token, enabled: true }
      }
    }
  } catch (err) {
    console.error('[Shopify Config Error]:', err.message)
  }
  return { enabled: false }
}

async function getShopifyLocationId(domain, token) {
  if (cachedLocationId) return cachedLocationId
  try {
    const response = await fetch(`https://${domain}/admin/api/2023-10/locations.json`, {
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error(`Locations API failed: ${response.statusText}`)
    const data = await response.json()
    if (data.locations && data.locations.length > 0) {
      cachedLocationId = data.locations[0].id
      console.log(`[Shopify Sync]: Location ID cached: ${cachedLocationId}`)
      return cachedLocationId
    }
  } catch (err) {
    console.error('[Shopify Get Location Error]:', err.message)
  }
  return null
}

// Step 1: Connect inventory item to a location (required before set)
async function connectInventoryToLocation(domain, token, inventoryItemId, locationId) {
  try {
    const response = await fetch(`https://${domain}/admin/api/2023-10/inventory_levels/connect.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: Number(inventoryItemId),
        relocate_if_necessary: true
      })
    })
    const data = await response.json()
    if (!response.ok) {
      // Ignore "already connected" errors (422)
      if (response.status !== 422) {
        console.warn('[Shopify Connect Inventory Warning]:', JSON.stringify(data.errors || data))
      }
    } else {
      console.log(`[Shopify Sync]: Inventory item ${inventoryItemId} connected to location ${locationId}`)
    }
  } catch (err) {
    console.error('[Shopify Connect Inventory Error]:', err.message)
  }
}

// Step 2: Set the actual inventory quantity
async function setInventoryLevel(domain, token, inventoryItemId, locationId, quantity) {
  try {
    const response = await fetch(`https://${domain}/admin/api/2023-10/inventory_levels/set.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: Number(inventoryItemId),
        available: quantity
      })
    })
    const data = await response.json()
    if (!response.ok) {
      console.error('[Shopify Set Inventory Failed]:', JSON.stringify(data.errors || data))
    } else {
      console.log(`[Shopify Sync]: Inventory set to ${quantity} for item ${inventoryItemId}`)
    }
  } catch (err) {
    console.error('[Shopify Set Inventory Error]:', err.message)
  }
}

async function syncProduct(productId) {
  const config = getShopifyConfig()
  if (!config.enabled) {
    console.log('[Shopify Sync]: Disabled or not configured, skipping.')
    return
  }

  const db = getDB()
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId)

  if (!product || product.deleted_at) {
    // If deleted, trigger delete on Shopify
    const row = db.prepare(`SELECT shopify_product_id FROM products WHERE id = ?`).get(productId)
    if (row && row.shopify_product_id) await deleteProduct(row.shopify_product_id)
    return
  }

  const { domain, token } = config

  try {
    const locationId = await getShopifyLocationId(domain, token)
    if (!locationId) {
      console.warn('[Shopify Sync]: No location found, cannot sync inventory.')
    }

    if (!product.shopify_product_id) {
      // ── CREATE NEW PRODUCT ON SHOPIFY ──
      console.log(`[Shopify Sync]: Creating "${product.name}" on Shopify...`)

      const createRes = await fetch(`https://${domain}/admin/api/2023-10/products.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            title: product.name,
            body_html: `SKU: ${product.sku || 'N/A'}`,
            vendor: 'FloriManager',
            product_type: product.category_id ? product.category_id : 'General',
            status: 'active',
            variants: [{
              sku: product.sku || undefined,
              price: String(product.price || 0),
              barcode: product.barcode || undefined,
              inventory_management: 'shopify',
              inventory_policy: 'deny'
            }]
          }
        })
      })

      const createData = await createRes.json()
      if (!createRes.ok || !createData.product) {
        console.error('[Shopify Create Failed]:', JSON.stringify(createData.errors || createData))
        return
      }

      const shopifyProductId       = String(createData.product.id)
      const shopifyVariantId       = String(createData.product.variants[0].id)
      const shopifyInventoryItemId = String(createData.product.variants[0].inventory_item_id)

      // Persist Shopify IDs to local DB
      db.prepare(`
        UPDATE products
        SET shopify_product_id = ?, shopify_variant_id = ?, shopify_inventory_item_id = ?
        WHERE id = ?
      `).run(shopifyProductId, shopifyVariantId, shopifyInventoryItemId, product.id)

      console.log(`[Shopify Sync]: Product created. Shopify ID: ${shopifyProductId}`)

      // ── SET INVENTORY ── connect first, then set quantity
      if (locationId && shopifyInventoryItemId) {
        await connectInventoryToLocation(domain, token, shopifyInventoryItemId, locationId)
        await setInventoryLevel(domain, token, shopifyInventoryItemId, locationId, product.quantity)
      }

    } else {
      // ── UPDATE EXISTING PRODUCT ON SHOPIFY ──
      console.log(`[Shopify Sync]: Updating "${product.name}" (ID: ${product.shopify_product_id})...`)

      const updateRes = await fetch(`https://${domain}/admin/api/2023-10/products/${product.shopify_product_id}.json`, {
        method: 'PUT',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            id: Number(product.shopify_product_id),
            title: product.name,
            variants: [{
              id: Number(product.shopify_variant_id),
              price: String(product.price || 0),
              sku: product.sku || undefined,
              barcode: product.barcode || undefined,
              inventory_management: 'shopify'
            }]
          }
        })
      })

      const updateData = await updateRes.json()
      if (!updateRes.ok) {
        console.error('[Shopify Update Failed]:', JSON.stringify(updateData.errors || updateData))
        return
      }

      console.log(`[Shopify Sync]: Product updated. ID: ${product.shopify_product_id}`)

      // ── SYNC INVENTORY LEVEL ──
      if (locationId && product.shopify_inventory_item_id) {
        await connectInventoryToLocation(domain, token, product.shopify_inventory_item_id, locationId)
        await setInventoryLevel(domain, token, product.shopify_inventory_item_id, locationId, product.quantity)
      }
    }
  } catch (err) {
    console.error('[Shopify Sync Execution Error]:', err.message)
  }
}

async function deleteProduct(shopifyProductId) {
  const config = getShopifyConfig()
  if (!config.enabled || !shopifyProductId) return

  const { domain, token } = config
  try {
    console.log(`[Shopify Sync]: Deleting Shopify product ID: ${shopifyProductId}`)
    const res = await fetch(`https://${domain}/admin/api/2023-10/products/${shopifyProductId}.json`, {
      method: 'DELETE',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
    })
    if (res.ok) {
      console.log(`[Shopify Sync]: Deleted product ${shopifyProductId}`)
    } else {
      const data = await res.json()
      console.error('[Shopify Delete Failed]:', JSON.stringify(data.errors || data))
    }
  } catch (err) {
    console.error('[Shopify Delete Error]:', err.message)
  }
}

module.exports = { syncProduct, deleteProduct }
