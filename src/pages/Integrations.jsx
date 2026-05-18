import { useState } from 'react'
import { CreditCard, ShoppingBag, CheckCircle, XCircle, RefreshCw, Save } from 'lucide-react'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'

const LS_KEY  = 'integration_settings'
const DEFAULTS = { payment_gateway: '', payment_key: '', payment_secret: '', shopify_store: '', shopify_token: '', shopify_sync: false }
function load() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY)||'{}') } } catch { return DEFAULTS } }

export default function Integrations() {
  const [cfg,        setCfg]        = useState(load)
  const [saved,      setSaved]      = useState(false)
  const [testing,    setTesting]    = useState({})
  const [testResult, setTestResult] = useState({})
  const f = (k, v) => setCfg(s => ({ ...s, [k]: v }))

  const handleSave = () => { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const testConnection = async (type) => {
    setTesting(s => ({ ...s, [type]: true })); setTestResult(s => ({ ...s, [type]: null }))
    await new Promise(r => setTimeout(r, 1200))
    const ok = type === 'payment' ? cfg.payment_key && cfg.payment_secret : cfg.shopify_store && cfg.shopify_token
    setTestResult(s => ({ ...s, [type]: ok ? 'success' : 'missing' }))
    setTesting(s => ({ ...s, [type]: false }))
  }

  const Toggle = ({ k, label, sub }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#334155', margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{sub}</p>}
      </div>
      <div onClick={() => f(k, !cfg[k])} style={{ width: 40, height: 22, borderRadius: 99, background: cfg[k] ? '#059669' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: cfg[k] ? 'translateX(21px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )

  const IntCard = ({ icon: Icon, title, desc, iconBg, iconColor, connected, type, children }) => (
    <div style={C.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={iconColor} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{title}</p>
            {connected
              ? <span style={{ ...C.badge('#ecfdf5','#059669'), display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> Connected</span>
              : <span style={{ ...C.badge('#f1f5f9','#64748b'), display: 'inline-flex', alignItems: 'center', gap: 4 }}><XCircle size={10} /> Not configured</span>}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>{desc}</p>
        </div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        {testResult[type] && (
          <div style={{ background: testResult[type]==='success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${testResult[type]==='success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: testResult[type]==='success' ? '#059669' : '#dc2626' }}>
            {testResult[type]==='success' ? '✔ Configuration looks valid.' : '✖ Missing required credentials.'}
          </div>
        )}
        <button style={{ ...C.btn2, justifyContent: 'center' }} onClick={() => testConnection(type)} disabled={testing[type]}>
          <RefreshCw size={13} className={testing[type] ? 'animate-spin' : ''} />
          {testing[type] ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Integrations</h2>
          <p style={C.subtitle}>Connect external services and payment gateways</p>
        </div>
        <button style={C.btn} onClick={handleSave}><Save size={14} /> {saved ? 'Saved ✔' : 'Save All'}</button>
      </div>

      <div style={C.g2}>
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
          <FormField label="Store URL"><Input placeholder="your-store.myshopify.com" value={cfg.shopify_store} onChange={e => f('shopify_store', e.target.value)} /></FormField>
          <FormField label="Admin API Access Token"><Input type="password" placeholder="shpat_..." value={cfg.shopify_token} onChange={e => f('shopify_token', e.target.value)} /></FormField>
          <Toggle k="shopify_sync" label="Auto-sync Products" sub="Push product changes to Shopify automatically" />
        </IntCard>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e' }}>
        <strong>Note:</strong> API keys are stored locally in browser storage. For production, configure keys via environment variables for better security.
      </div>
    </div>
  )
}


