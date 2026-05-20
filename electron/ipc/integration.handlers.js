const { ipcMain, app } = require('electron')
const fs = require('fs')
const path = require('path')

module.exports = function registerIntegrationHandlers() {
  ipcMain.handle('integrations:testPayment', async (_, gateway, key, secret) => {
    if (!key || !secret) {
      return { success: false, message: 'API Key / Secret Key cannot be empty.' }
    }
    
    if (gateway === 'stripe') {
      try {
        const response = await fetch('https://api.stripe.com/v1/balance', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${secret}`
          }
        })
        const data = await response.json()
        if (response.ok) {
          return { success: true }
        } else {
          return { success: false, message: data.error?.message || `Stripe Error: ${response.statusText}` }
        }
      } catch (e) {
        return { success: false, message: `Network error: ${e.message}` }
      }
    } else if (gateway === 'paypal') {
      try {
        const isLive = secret.startsWith('E') || key.startsWith('A')
        const host = isLive ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com'
        const auth = Buffer.from(`${key}:${secret}`).toString('base64')
        const response = await fetch(`https://${host}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        })
        const data = await response.json()
        if (response.ok) {
          return { success: true }
        } else {
          return { success: false, message: data.error_description || data.error || `PayPal Error: ${response.statusText}` }
        }
      } catch (e) {
        return { success: false, message: `Network error: ${e.message}` }
      }
    }
    
    return { success: true }
  })

  ipcMain.handle('integrations:testShopify', async (_, storeUrl, token) => {
    if (!storeUrl || !token) {
      return { success: false, message: 'Store URL / Token cannot be empty.' }
    }
    
    let domain = storeUrl.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
    if (!domain.includes('.')) {
      domain = `${domain}.myshopify.com`
    }
    
    try {
      const response = await fetch(`https://${domain}/admin/api/2023-10/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (response.ok && data.shop) {
        return { success: true }
      } else {
        const errMsg = data.errors || `Shopify Error: ${response.statusText}`
        return { success: false, message: typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg }
      }
    } catch (e) {
      return { success: false, message: `Network error: ${e.message}` }
    }
  })

  ipcMain.handle('integrations:saveSettings', (_, cfg) => {
    try {
      const p = path.join(app.getPath('userData'), 'integrations.json')
      fs.writeFileSync(p, JSON.stringify(cfg), 'utf8')
      return { success: true }
    } catch (e) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('integrations:loadSettings', () => {
    try {
      const p = path.join(app.getPath('userData'), 'integrations.json')
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'))
      }
    } catch {}
    return null
  })

  ipcMain.handle('shopify:syncProduct', async (_, productId) => {
    const { syncProduct } = require('../shopifySync')
    const logs = []
    const origLog   = console.log
    const origWarn  = console.warn
    const origError = console.error
    console.log   = (...a) => { origLog(...a);   logs.push({ level: 'info',  msg: a.join(' ') }) }
    console.warn  = (...a) => { origWarn(...a);  logs.push({ level: 'warn',  msg: a.join(' ') }) }
    console.error = (...a) => { origError(...a); logs.push({ level: 'error', msg: a.join(' ') }) }
    try {
      await syncProduct(productId)
      return { success: true, logs }
    } catch (e) {
      return { success: false, error: e.message, logs }
    } finally {
      console.log   = origLog
      console.warn  = origWarn
      console.error = origError
    }
  })
}
