const { ipcMain } = require('electron')
const { startWebhookServer, stopWebhookServer, registerShopifyWebhooks, importAllShopifyProducts, getShopifyConfig } = require('../shopifyWebhooks')
const { getDB } = require('../db/database')

module.exports = function registerWebhookHandlers() {

  // ── Server lifecycle ───────────────────────────────────────────────────────
  ipcMain.handle('webhooks:start', (_, port) => {
    return startWebhookServer(port || 3456)
  })

  ipcMain.handle('webhooks:stop', () => {
    return stopWebhookServer()
  })

  // ── Register webhooks with Shopify ─────────────────────────────────────────
  ipcMain.handle('webhooks:register', (_, webhookUrl) => {
    return registerShopifyWebhooks(webhookUrl)
  })

  // ── Test that the webhook URL is reachable ─────────────────────────────────
  ipcMain.handle('webhooks:test', async (_, webhookUrl) => {
    try {
      const testUrl = `${webhookUrl}/shopify-webhook`
      console.log('[Webhook Test] Testing URL:', testUrl)

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'FloriManager-Webhook-Test'
        }
      })

      const data = await response.json()
      if (response.ok && data.status === 'ok') {
        return { success: true, message: 'Webhook URL is accessible' }
      } else {
        return { success: false, message: 'Unexpected response from webhook URL' }
      }
    } catch (err) {
      console.error('[Webhook Test] Error:', err.message)
      return { success: false, message: err.message }
    }
  })

  // ── List registered webhooks from Shopify ─────────────────────────────────
  ipcMain.handle('webhooks:list', async () => {
    try {
      const config = getShopifyConfig()
      if (!config.enabled) return { success: false, error: 'Shopify not configured' }

      const { domain, token } = config
      const response = await fetch(`https://${domain}/admin/api/2024-10/webhooks.json`, {
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, webhooks: data.webhooks || [] }
      } else {
        const error = await response.json().catch(() => ({}))
        return { success: false, error: error.errors || error.error || response.statusText }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // ── Bulk import all Shopify products into IMS ──────────────────────────────
  ipcMain.handle('shopify:importAll', async () => {
    try {
      return await importAllShopifyProducts()
    } catch (err) {
      console.error('[Shopify Import All] Error:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ── Webhook audit log — read ────────────────────────────────────────────────
  ipcMain.handle('shopify:getWebhookLogs', (_, limit = 100) => {
    try {
      const db = getDB()
      const logs = db.prepare(`
        SELECT * FROM shopify_webhook_log
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit)
      return { success: true, logs }
    } catch (err) {
      console.error('[Shopify Logs] Error:', err.message)
      return { success: false, error: err.message, logs: [] }
    }
  })

  // ── Webhook audit log — clear ──────────────────────────────────────────────
  ipcMain.handle('shopify:clearWebhookLogs', () => {
    try {
      const db = getDB()
      db.prepare(`DELETE FROM shopify_webhook_log`).run()
      console.log('[Shopify Logs]: Audit log cleared')
      return { success: true }
    } catch (err) {
      console.error('[Shopify Logs Clear] Error:', err.message)
      return { success: false, error: err.message }
    }
  })

  // ── Webhook sync status summary ────────────────────────────────────────────
  ipcMain.handle('shopify:syncStatus', () => {
    try {
      const db = getDB()
      const total     = db.prepare(`SELECT COUNT(*) AS c FROM shopify_webhook_log`).get().c
      const success   = db.prepare(`SELECT COUNT(*) AS c FROM shopify_webhook_log WHERE status = 'success'`).get().c
      const errors    = db.prepare(`SELECT COUNT(*) AS c FROM shopify_webhook_log WHERE status = 'error'`).get().c
      const skipped   = db.prepare(`SELECT COUNT(*) AS c FROM shopify_webhook_log WHERE status = 'skipped'`).get().c
      const lastEvent = db.prepare(`SELECT created_at, topic, source, status FROM shopify_webhook_log ORDER BY created_at DESC LIMIT 1`).get()
      const mappedProducts = db.prepare(`SELECT COUNT(*) AS c FROM products WHERE shopify_product_id IS NOT NULL AND (deleted_at IS NULL OR deleted_at = '')`).get().c
      return { success: true, total, success: success, errors, skipped, lastEvent, mappedProducts }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}
