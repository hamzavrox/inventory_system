import { useState, useEffect } from 'react'
import { CreditCard, ShoppingBag, CheckCircle, XCircle, RefreshCw, Save, Webhook, Copy, Check, ExternalLink, Sparkles } from 'lucide-react'
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>}
      </div>
      <div onClick={() => f(k, !cfg[k])} style={{ width: 44, height: 24, borderRadius: 99, background: cfg[k] ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', flexShrink: 0, boxShadow: cfg[k] ? '0 2px 8px rgba(5, 150, 105, 0.3)' : 'none' }}>
        <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.3s', transform: cfg[k] ? 'translateX(23px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )

  const IntCard = ({ icon: Icon, title, desc, iconBg, iconColor, connected, type, children }) => (
    <div style={{ ...C.card, overflow: 'hidden', transition: 'all 0.3s', border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', borderBottom: '2px solid #f1f5f9', background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <Icon size={22} color={iconColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{title}</p>
            {connected
              ? <span style={{ ...C.badge('#ecfdf5','#059669'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontWeight: 600 }}><CheckCircle size={11} /> Connected</span>
              : <span style={{ ...C.badge('#f1f5f9','#64748b'), display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}><XCircle size={11} /> Not configured</span>}
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>{desc}</p>
        </div>
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
        {testResult[type] && (
          <div style={{ background: testResult[type]==='success' ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: `2px solid ${testResult[type]==='success' ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: testResult[type]==='success' ? '#047857' : '#b91c1c', fontWeight: 600, boxShadow: testResult[type]==='success' ? '0 4px 12px rgba(5, 150, 105, 0.15)' : '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
            {testResult[type]==='success' ? '✅ Connection successful! Configuration is valid.' : `❌ Connection failed: ${testMessage[type] || 'Invalid credentials.'}`}
          </div>
        )}
        <button style={{ ...C.btn2, justifyContent: 'center', padding: '10px', fontWeight: 600 }} onClick={() => testConnection(type)} disabled={testing[type]}>
          <RefreshCw size={14} className={testing[type] ? 'animate-spin' : ''} />
          {testing[type] ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ ...C.page, overflowY: 'auto', maxHeight: 'calc(100vh - 80px)' }}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Integrations</h2>
          <p style={C.subtitle}>Connect external services and payment gateways</p>
        </div>
        <button style={C.btn} onClick={handleSave}><Save size={14} /> {saved ? 'Saved ✅' : 'Save All'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 20, marginBottom: 20 }}>
        <IntCard icon={CreditCard} title="Payment Gateway" desc="Accept card payments at POS" iconBg="#ecfdf5" iconColor="#00deab" connected={!!(cfg.payment_key && cfg.payment_secret)} type="payment">
          <FormField label="Gateway Provider">
            <Select value={cfg.payment_gateway} onChange={e => f('payment_gateway', e.target.value)}>
              <option value="">- Select Provider -</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="square">Square</option>
              <option value="razorpay">Razorpay</option>
              <option value="custom">Custom / Local</option>
            </Select>
          </FormField>
          <FormField label="API Key / Publishable Key"><Input placeholder="pk_live_..." value={cfg.payment_key} onChange={e => f('payment_key', e.target.value)} /></FormField>
          <FormField label="Secret Key"><Input type="password" placeholder="sk_live_..." value={cfg.payment_secret} onChange={e => f('payment_secret', e.target.value)} /></FormField>
        </IntCard>

        <IntCard icon={ShoppingBag} title="Shopify Integration" desc="Sync products and orders with Shopify" iconBg="#ecfdf5" iconColor="#059669" connected={!!(cfg.shopify_store && cfg.shopify_token)} type="shopify">
          <FormField label="Store URL">
            <div style={{ position: 'relative' }}>
              <Input placeholder="your-store.myshopify.com" value={cfg.shopify_store} onChange={e => f('shopify_store', e.target.value)} />
              {cfg.shopify_store && (
                <a href={`https://${cfg.shopify_store}/admin`} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </FormField>
          <FormField label="Admin API Access Token"><Input type="password" placeholder="shpat_..." value={cfg.shopify_token} onChange={e => f('shopify_token', e.target.value)} /></FormField>
          <Toggle k="shopify_sync" label="Auto-sync Products" sub="Push product changes to Shopify automatically" />
          
          <div style={{ borderTop: '2px solid #f1f5f9', marginTop: 8, paddingTop: 16, background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', borderRadius: 12, padding: 16, marginLeft: -20, marginRight: -20, marginBottom: -20, maxHeight: '600px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)' }}>
                <Webhook size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Bidirectional Sync</p>
                <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0', fontWeight: 600 }}>Real-time webhooks</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde047 100%)', border: '1px solid #fbbf24', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 2px 6px rgba(251, 191, 36, 0.3)' }}>
                <Sparkles size={10} style={{ display: 'inline', marginRight: 3 }} />Beta
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '2px solid #93c5fd', borderRadius: 10, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8 }}>
              <div style={{ fontSize: 16, flexShrink: 0 }}>💡</div>
              <p style={{ fontSize: 11, color: '#1e40af', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                Enable real-time sync from Shopify to IMS. Any product changes in Shopify will instantly reflect in your inventory system.
                <br/><br/>
                <strong>Note:</strong> Test Connection may fail due to ngrok's browser warning page, but webhook registration will work directly with Shopify.
              </p>
            </div>
            
            <FormField label="Webhook URL">
              <div style={{ position: 'relative' }}>
                <Input 
                  placeholder="https://abc123.ngrok.io" 
                  value={cfg.shopify_webhook_url} 
                  onChange={e => f('shopify_webhook_url', e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12, paddingRight: 40, background: '#f8fafc', border: '2px solid #e2e8f0' }}
                />
                {cfg.shopify_webhook_url && (
                  <button onClick={() => copyToClipboard(cfg.shopify_webhook_url)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#64748b', padding: 4 }}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </FormField>
            
            <FormField label="Webhook Secret (Optional)">
              <Input type="password" placeholder="f3931553aab2812602e..." value={cfg.shopify_webhook_secret} onChange={e => f('shopify_webhook_secret', e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12, background: '#f8fafc', border: '2px solid #e2e8f0' }} />
            </FormField>
            
            {webhookStatus && (
              <div style={{ background: webhookStatus.includes('✅') ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : webhookStatus.includes('🔄') ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', border: `2px solid ${webhookStatus.includes('✅') ? '#86efac' : webhookStatus.includes('🔄') ? '#93c5fd' : '#fca5a5'}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: webhookStatus.includes('✅') ? '#047857' : webhookStatus.includes('🔄') ? '#1e40af' : '#b91c1c', marginBottom: 14, fontWeight: 700, boxShadow: webhookStatus.includes('✅') ? '0 4px 14px rgba(5, 150, 105, 0.2)' : 'none' }}>
                {webhookStatus}
              </div>
            )}
            
            <button style={{ width: '100%', padding: '12px 18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s', boxShadow: '0 6px 18px rgba(59, 130, 246, 0.4)', letterSpacing: '0.02em', marginBottom: 10 }} onClick={testWebhookUrl}>
              <RefreshCw size={15} />
              Test Connection
            </button>
            
            <button style={{ width: '100%', padding: '12px 18px', background: registeringWebhooks ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: registeringWebhooks ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s', boxShadow: registeringWebhooks ? 'none' : '0 6px 18px rgba(5, 150, 105, 0.4)', letterSpacing: '0.02em', marginBottom: 10 }} onClick={registerWebhooks} disabled={registeringWebhooks}>
              <Webhook size={15} />
              {registeringWebhooks ? 'Registering Webhooks...' : 'Register Webhooks with Shopify'}
            </button>

            <button style={{ width: '100%', padding: '12px 18px', background: importingProducts ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: importingProducts ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s', boxShadow: importingProducts ? 'none' : '0 6px 18px rgba(124, 58, 237, 0.4)', letterSpacing: '0.02em' }} onClick={handleBulkImport} disabled={importingProducts}>
              <ShoppingBag size={15} />
              {importingProducts ? 'Importing Products...' : 'Bulk Import Products from Shopify'}
            </button>
            
            <div style={{ background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)', border: '2px solid #fde047', borderRadius: 10, padding: '12px 14px', marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>📋</span>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Setup</p>
              </div>
              <ol style={{ fontSize: 10, color: '#713f12', margin: 0, paddingLeft: 18, lineHeight: 1.7, fontWeight: 600 }}>
                <li>Run <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#92400e', border: '1px solid #fde047' }}>ngrok http 3456</code></li>
                <li>Copy <strong>HTTPS URL</strong> (https://abc123.ngrok.io)</li>
                <li>Paste in <strong>Webhook URL</strong> above</li>
                <li>Click <strong>"Register Webhooks"</strong></li>
                <li>Verify in Shopify: Settings → Notifications → Webhooks</li>
              </ol>
            </div>
          </div>
        </IntCard>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '2px solid #fde68a', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#92400e', fontWeight: 600, boxShadow: '0 4px 12px rgba(253, 230, 138, 0.3)' }}>
        <strong>🔒 Security:</strong> API keys stored locally. Use environment variables in production.
      </div>
    </div>
  )
}
