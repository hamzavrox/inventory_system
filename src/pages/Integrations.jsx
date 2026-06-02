import { useState, useEffect } from 'react'
import { CreditCard, ShoppingBag, CheckCircle, XCircle, RefreshCw, Save, Webhook, Copy, Check, ExternalLink, Sparkles, Settings, Zap } from 'lucide-react'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'

const LS_KEY  = 'integration_settings'
const DEFAULTS = { payment_gateway: '', payment_key: '', payment_secret: '', shopify_store: '', shopify_token: '', shopify_sync: false, shopify_webhook_url: '', shopify_webhook_secret: '' }
function load() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY)||'{}') } } catch { return DEFAULTS } }

export default function Integrations() {
  const [cfg,        setCfg]        = useState(load)
  const [saved,      setSaved]      = useState(false)
  const [testing,    setTesting]    = useState({})
  const [testResult, setTestResult] = useState({})
  const [testMessage, setTestMessage] = useState({})
  const [webhookStatus, setWebhookStatus] = useState('')
  const [registeringWebhooks, setRegisteringWebhooks] = useState(false)
  const [importingProducts, setImportingProducts] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeShopifyTab, setActiveShopifyTab] = useState(0) // 0: Connection, 1: Bidirectional Sync
  
  const f = (k, v) => setCfg(s => ({ ...s, [k]: v }))

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    window.api.integrations.loadSettings().then(savedCfg => {
      if (savedCfg) {
        setCfg(savedCfg)
        localStorage.setItem(LS_KEY, JSON.stringify(savedCfg))
      }
    }).catch(err => console.error("Failed to load settings via IPC:", err))
  }, [])

  const handleSave = async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg))
    try {
      await window.api.integrations.saveSettings(cfg)
    } catch (err) {
      console.error("Failed to save settings via IPC:", err)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testConnection = async (type) => {
    setTesting(s => ({ ...s, [type]: true }))
    setTestResult(s => ({ ...s, [type]: null }))
    setTestMessage(s => ({ ...s, [type]: '' }))

    let res = { success: false, message: 'Invalid test execution.' }
    try {
      if (type === 'payment') {
        res = await window.api.integrations.testPayment(cfg.payment_gateway, cfg.payment_key, cfg.payment_secret)
      } else if (type === 'shopify') {
        res = await window.api.integrations.testShopify(cfg.shopify_store, cfg.shopify_token)
      }
    } catch (err) {
      res = { success: false, message: err.message || 'IPC invocation failed.' }
    }

    setTestResult(s => ({ ...s, [type]: res.success ? 'success' : 'failed' }))
    setTestMessage(s => ({ ...s, [type]: res.message || '' }))
    setTesting(s => ({ ...s, [type]: false }))
  }

  const registerWebhooks = async () => {
    console.log('[Webhook Registration] Starting...')
    console.log('[Webhook Registration] URL:', cfg.shopify_webhook_url)
    
    if (!cfg.shopify_webhook_url) {
      setWebhookStatus('⚠️ Please enter webhook URL first')
      setTimeout(() => setWebhookStatus(''), 3000)
      return
    }

    if (!cfg.shopify_store || !cfg.shopify_token) {
      setWebhookStatus('⚠️ Please configure Shopify store and token first')
      setTimeout(() => setWebhookStatus(''), 3000)
      return
    }
    
    // Auto-save settings before registering
    console.log('[Webhook Registration] Auto-saving settings...')
    localStorage.setItem(LS_KEY, JSON.stringify(cfg))
    try {
      await window.api.integrations.saveSettings(cfg)
      console.log('[Webhook Registration] Settings saved successfully')
    } catch (err) {
      console.error('[Webhook Registration] Failed to save settings:', err)
      setWebhookStatus('❌ Failed to save settings')
      setTimeout(() => setWebhookStatus(''), 3000)
      return
    }
    
    setRegisteringWebhooks(true)
    setWebhookStatus('🔄 Registering webhooks...')
    
    try {
      console.log('[Webhook Registration] Calling window.api.webhooks.register...')
      const result = await window.api.webhooks.register(cfg.shopify_webhook_url)
      console.log('[Webhook Registration] Full Result:', JSON.stringify(result, null, 2))
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length
        const failedResults = result.results.filter(r => !r.success)
        
        if (failedResults.length > 0) {
          console.error('[Webhook Registration] Failed webhooks:', failedResults)
          const firstError = failedResults[0].error
          const errorMsg = typeof firstError === 'object' ? JSON.stringify(firstError) : firstError
          setWebhookStatus(`⚠️ Registered ${successCount}/${result.results.length} webhooks. Error: ${errorMsg}`)
        } else {
          setWebhookStatus(`✅ Successfully registered ${successCount}/${result.results.length} webhooks`)
        }
        console.log('[Webhook Registration] Success:', successCount, 'webhooks registered')
      } else {
        setWebhookStatus(`❌ Failed: ${result.error}`)
        console.error('[Webhook Registration] Failed:', result.error)
      }
    } catch (err) {
      setWebhookStatus(`❌ Error: ${err.message}`)
      console.error('[Webhook Registration] Exception:', err)
    }
    
    setRegisteringWebhooks(false)
    setTimeout(() => setWebhookStatus(''), 10000)
  }

  const testWebhookUrl = async () => {
    if (!cfg.shopify_webhook_url) {
      setWebhookStatus('⚠️ Please enter webhook URL first')
      setTimeout(() => setWebhookStatus(''), 3000)
      return
    }
    
    setWebhookStatus('🔄 Testing webhook URL...')
    
    try {
      const result = await window.api.webhooks.test(cfg.shopify_webhook_url)
      
      if (result.success) {
        setWebhookStatus('✅ Webhook URL is accessible!')
      } else {
        setWebhookStatus(`❌ ${result.message}`)
      }
    } catch (err) {
      setWebhookStatus(`❌ Error: ${err.message}`)
    }
    
    setTimeout(() => setWebhookStatus(''), 6000)
  }

  const handleBulkImport = async () => {
    if (!cfg.shopify_store || !cfg.shopify_token) {
      setWebhookStatus('⚠️ Please configure Shopify store and token first')
      setTimeout(() => setWebhookStatus(''), 3000)
      return
    }

    setImportingProducts(true)
    setWebhookStatus('🔄 Importing products from Shopify...')

    try {
      const result = await window.api.shopify.importAll()
      if (result.success) {
        setWebhookStatus(`✅ Bulk Import Completed! Imported: ${result.imported}, Skipped (already exist): ${result.skipped}, Errors: ${result.errors}`)
      } else {
        setWebhookStatus(`❌ Bulk Import Failed: ${result.error}`)
      }
    } catch (err) {
      setWebhookStatus(`❌ Bulk Import Error: ${err.message}`)
    }

    setImportingProducts(false)
    setTimeout(() => setWebhookStatus(''), 10000)
  }

  const Toggle = ({ k, label, sub }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>}
      </div>
      <div onClick={() => f(k, !cfg[k])} style={{ width: 44, height: 24, borderRadius: 99, background: cfg[k] ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0, boxShadow: cfg[k] ? '0 2px 8px rgba(5, 150, 105, 0.3)' : 'none' }}>
        <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.3s', transform: cfg[k] ? 'translateX(23px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )

  const paymentConnected = !!(cfg.payment_key && cfg.payment_secret);
  const shopifyConnected = !!(cfg.shopify_store && cfg.shopify_token);

  return (
    <div style={{ ...C.page, overflowY: 'auto', maxHeight: 'calc(100vh - 80px)', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ ...C.header, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ ...C.title, fontSize: 22, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            Integrations
          </h2>
          <p style={C.subtitle}>Connect central external services and payment gateways to IMS</p>
        </div>
        <button 
          style={{ 
            ...C.btn, 
            background: 'linear-gradient(135deg, #00deab 0%, #059669 100%)', 
            boxShadow: '0 4px 12px rgba(0, 222, 171, 0.3)',
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.2s'
          }} 
          onClick={handleSave}
        >
          <Save size={16} /> {saved ? 'Saved Successfully ✅' : 'Save All Settings'}
        </button>
      </div>

      {/* Two Column Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'start', marginTop: 8 }}>
        
        {/* Left Column: Payment Gateway */}
        <div style={{ ...C.card, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #fafbfd 0%, #ffffff 100%)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(186, 230, 253, 0.4)' }}>
              <CreditCard size={22} color="#0284c7" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Payment Gateway</p>
                {paymentConnected ? (
                  <span style={{ ...C.badge('#ecfdf5', '#059669'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontWeight: 600 }}>
                    <CheckCircle size={11} /> Connected
                  </span>
                ) : (
                  <span style={{ ...C.badge('#f1f5f9', '#64748b'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}>
                    <XCircle size={11} /> Disconnected
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>Accept card payments at POS checkout</p>
            </div>
          </div>

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Gateway Provider">
              <Select value={cfg.payment_gateway} onChange={e => f('payment_gateway', e.target.value)} style={{ border: '2px solid #e2e8f0', padding: '10px 12px' }}>
                <option value="">- Select Provider -</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
                <option value="razorpay">Razorpay</option>
                <option value="custom">Custom / Local</option>
              </Select>
            </FormField>

            <FormField label="API Key / Publishable Key">
              <Input 
                placeholder="pk_live_..." 
                value={cfg.payment_key} 
                onChange={e => f('payment_key', e.target.value)} 
                style={{ border: '2px solid #e2e8f0', padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}
              />
            </FormField>

            <FormField label="Secret Key">
              <Input 
                type="password" 
                placeholder="sk_live_..." 
                value={cfg.payment_secret} 
                onChange={e => f('payment_secret', e.target.value)} 
                style={{ border: '2px solid #e2e8f0', padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}
              />
            </FormField>

            {testResult['payment'] && (
              <div style={{ background: testResult['payment'] === 'success' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: `1px solid ${testResult['payment'] === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: testResult['payment'] === 'success' ? '#047857' : '#b91c1c', fontWeight: 600, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)' }}>
                {testResult['payment'] === 'success' ? '✅ Payment Gateway API settings are active and correct!' : `❌ Connection failed: ${testMessage['payment'] || 'Invalid credentials.'}`}
              </div>
            )}

            <button 
              style={{ 
                ...C.btn2, 
                justifyContent: 'center', 
                padding: '12px', 
                fontWeight: 600, 
                border: '2px solid #e2e8f0', 
                borderRadius: 10,
                background: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginTop: 8
              }} 
              onClick={() => testConnection('payment')} 
              disabled={testing['payment']}
            >
              <RefreshCw size={14} className={testing['payment'] ? 'animate-spin' : ''} />
              {testing['payment'] ? 'Testing Connection...' : 'Test Gateway Connection'}
            </button>
          </div>
        </div>

        {/* Right Column: Shopify Integration with Internal Tabs */}
        <div style={{ ...C.card, borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.03)' }}>
          {/* Card Title Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #fafbfd 0%, #ffffff 100%)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(209, 250, 229, 0.6)' }}>
              <ShoppingBag size={22} color="#059669" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Shopify Integration</p>
                {shopifyConnected ? (
                  <span style={{ ...C.badge('#ecfdf5', '#059669'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontWeight: 600 }}>
                    <CheckCircle size={11} /> Active
                  </span>
                ) : (
                  <span style={{ ...C.badge('#f1f5f9', '#64748b'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}>
                    <XCircle size={11} /> Unconfigured
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>Sync stock, products, and orders dynamically</p>
            </div>
          </div>

          {/* Internal Tab Bar Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 12px' }}>
            <button 
              onClick={() => setActiveShopifyTab(0)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                borderBottom: activeShopifyTab === 0 ? '3px solid #059669' : '3px solid transparent',
                color: activeShopifyTab === 0 ? '#059669' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <Settings size={15} />
              Shopify Connection
            </button>
            <button 
              onClick={() => setActiveShopifyTab(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                borderBottom: activeShopifyTab === 1 ? '3px solid #059669' : '3px solid transparent',
                color: activeShopifyTab === 1 ? '#059669' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              <Webhook size={15} />
              Bidirectional Sync
            </button>
          </div>

          {/* Tab 0: Connection / Basic Settings */}
          {activeShopifyTab === 0 && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Store Domain URL">
                <div style={{ position: 'relative' }}>
                  <Input 
                    placeholder="your-store-name.myshopify.com" 
                    value={cfg.shopify_store} 
                    onChange={e => f('shopify_store', e.target.value)} 
                    style={{ border: '2px solid #e2e8f0', padding: '10px 12px', paddingRight: 40 }}
                  />
                  {cfg.shopify_store && (
                    <a href={`https://${cfg.shopify_store}/admin`} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </FormField>

              <FormField label="Admin API Access Token">
                <Input 
                  type="password" 
                  placeholder="shpat_..." 
                  value={cfg.shopify_token} 
                  onChange={e => f('shopify_token', e.target.value)} 
                  style={{ border: '2px solid #e2e8f0', padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}
                />
              </FormField>

              <div style={{ background: '#f8fafc', padding: '6px 16px', borderRadius: 12, border: '1px solid #f1f5f9', marginTop: 4 }}>
                <Toggle 
                  k="shopify_sync" 
                  label="Auto-sync Products" 
                  sub="Push product information and stock updates from IMS to Shopify automatically" 
                />
              </div>

              {testResult['shopify'] && (
                <div style={{ background: testResult['shopify'] === 'success' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: `1px solid ${testResult['shopify'] === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: testResult['shopify'] === 'success' ? '#047857' : '#b91c1c', fontWeight: 600, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)' }}>
                  {testResult['shopify'] === 'success' ? '✅ Shopify connection is successfully verified! APIs are fully responsive.' : `❌ Connection failed: ${testMessage['shopify'] || 'Invalid details.'}`}
                </div>
              )}

              <button 
                style={{ 
                  ...C.btn2, 
                  justifyContent: 'center', 
                  padding: '12px', 
                  fontWeight: 600, 
                  border: '2px solid #e2e8f0', 
                  borderRadius: 10,
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: 8
                }} 
                onClick={() => testConnection('shopify')} 
                disabled={testing['shopify']}
              >
                <RefreshCw size={14} className={testing['shopify'] ? 'animate-spin' : ''} />
                {testing['shopify'] ? 'Testing API...' : 'Test Shopify Connection'}
              </button>
            </div>
          )}

          {/* Tab 1: Bidirectional Sync */}
          {activeShopifyTab === 1 && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info banner */}
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #93c5fd', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: 12, color: '#1e40af', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                  Enable real-time synchronization from Shopify to IMS. Any inventory adjustments or item additions made inside Shopify will instantly sync back to your IMS system.
                </p>
              </div>

              <FormField label="Webhook URL (ngrok HTTPS URL)">
                <div style={{ position: 'relative' }}>
                  <Input 
                    placeholder="https://abc1234.ngrok-free.app" 
                    value={cfg.shopify_webhook_url} 
                    onChange={e => f('shopify_webhook_url', e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 12, paddingRight: 40, background: '#fafbfc', border: '2px solid #e2e8f0', padding: '10px 12px' }}
                  />
                  {cfg.shopify_webhook_url && (
                    <button onClick={() => copyToClipboard(cfg.shopify_webhook_url)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#64748b', padding: 4 }}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              </FormField>

              <FormField label="Webhook Secret (Optional Custom App API Secret)">
                <Input 
                  type="password" 
                  placeholder="Secret key for verifying signatures..." 
                  value={cfg.shopify_webhook_secret} 
                  onChange={e => f('shopify_webhook_secret', e.target.value)} 
                  style={{ fontFamily: 'monospace', fontSize: 12, background: '#fafbfc', border: '2px solid #e2e8f0', padding: '10px 12px' }} 
                />
              </FormField>

              {/* Status Alert logs */}
              {webhookStatus && (
                <div style={{ background: webhookStatus.includes('✅') ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : webhookStatus.includes('🔄') ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: `1px solid ${webhookStatus.includes('✅') ? '#86efac' : webhookStatus.includes('🔄') ? '#93c5fd' : '#fca5a5'}`, borderRadius: 10, padding: '12px 16px', fontSize: 12, color: webhookStatus.includes('✅') ? '#047857' : webhookStatus.includes('🔄') ? '#1e40af' : '#b91c1c', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  {webhookStatus}
                </div>
              )}

              {/* Action Buttons list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <button 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 10, 
                    fontSize: 13, 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8, 
                    transition: 'all 0.3s', 
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' 
                  }} 
                  onClick={testWebhookUrl}
                >
                  <RefreshCw size={15} />
                  Test Webhook Connection
                </button>
                
                <button 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: registeringWebhooks ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 10, 
                    fontSize: 13, 
                    fontWeight: 700, 
                    cursor: registeringWebhooks ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8, 
                    transition: 'all 0.3s', 
                    boxShadow: registeringWebhooks ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)' 
                  }} 
                  onClick={registerWebhooks} 
                  disabled={registeringWebhooks}
                >
                  <Webhook size={15} />
                  {registeringWebhooks ? 'Registering Webhooks...' : 'Register Webhooks with Shopify'}
                </button>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '6px 0' }} />

                <button 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: importingProducts ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 10, 
                    fontSize: 13, 
                    fontWeight: 700, 
                    cursor: importingProducts ? 'not-allowed' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 8, 
                    transition: 'all 0.3s', 
                    boxShadow: importingProducts ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.3)' 
                  }} 
                  onClick={handleBulkImport} 
                  disabled={importingProducts}
                >
                  <ShoppingBag size={15} />
                  {importingProducts ? 'Importing Products...' : 'Bulk Import Products from Shopify'}
                </button>
              </div>

              {/* Instructions banner */}
              <div style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', border: '1px solid #fde047', borderRadius: 10, padding: '14px', marginTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15 }}>📋</span>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Webhook Guide</p>
                </div>
                <ol style={{ fontSize: 11, color: '#713f12', margin: 0, paddingLeft: 18, lineHeight: 1.7, fontWeight: 600 }}>
                  <li>Run <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#92400e', border: '1px solid #fde047' }}>ngrok http 3456</code> in your terminal</li>
                  <li>Copy the generated **HTTPS URL** (e.g. https://abc1234.ngrok-free.app)</li>
                  <li>Paste in the **Webhook URL** field above</li>
                  <li>Click **"Register Webhooks with Shopify"** to enable real-time sync!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Alert */}
      <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 20px', fontSize: 12, color: '#92400e', fontWeight: 600, boxShadow: '0 4px 12px rgba(253, 230, 138, 0.1)', marginTop: 8 }}>
        <strong>🔒 Privacy & Security:</strong> All API keys, Access Tokens, and configurations are saved locally on your computer inside the Electron workspace.
      </div>
    </div>
  )
}
