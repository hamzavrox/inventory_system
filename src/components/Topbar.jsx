import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { RefreshCw, AlertTriangle } from 'lucide-react'

const TITLES = {
  '/':             'Dashboard',
  '/pos':          'POS / Sales',
  '/products':     'Products',
  '/categories':   'Categories',
  '/brands':       'Brands',
  '/barcode':      'Barcode Generator',
  '/inventory':    'Inventory / Stock',
  '/customers':    'Customers',
  '/accounting':   'Accounting',
  '/discounts':    'Discounts & Coupons',
  '/branches':     'Branches',
  '/shops':        'Shops',
  '/reports':      'Reports',
  '/users':        'Users & Roles',
  '/sync':         'Sync & Backup',
  '/print':        'Print Settings',
  '/integrations': 'Integrations',
}

export default function Topbar() {
  const { pathname }              = useLocation()
  const [syncing,  setSyncing]    = useState(false)
  const [lowStock, setLowStock]   = useState(0)
  const [syncMsg,  setSyncMsg]    = useState('')

  useEffect(() => {
    window.api?.products.getLowStock().then(r => setLowStock(r.length)).catch(() => {})
  }, [])

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const res = await window.api.sync.run()
      setSyncMsg(res.skipped ? 'Offline' : `Synced ${res.synced}`)
    } catch {
      setSyncMsg('Failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 2500)
    }
  }

  return (
    <header style={{
      height: 48, minHeight: 48, maxHeight: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', gap: 16,
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Title */}
      <h1 style={{
        fontSize: 14, fontWeight: 600, color: '#1e293b',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        flex: 1, minWidth: 0,
      }}>
        {TITLES[pathname] ?? 'FloriManager'}
      </h1>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {syncMsg && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{syncMsg}</span>
        )}

        {lowStock > 0 && (
          <button
            onClick={() => { window.location.hash = '#/inventory' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: '#fffbeb', color: '#d97706',
              border: '1px solid #fde68a',
              padding: '4px 10px', borderRadius: 99,
              fontSize: 11, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <AlertTriangle size={11} />
            <span>{lowStock} low</span>
          </button>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#eef2ff', color: '#4f46e5',
            border: '1px solid #c7d2fe',
            padding: '5px 12px', borderRadius: 99,
            fontSize: 11, fontWeight: 500,
            cursor: syncing ? 'not-allowed' : 'pointer',
            opacity: syncing ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>
      </div>
    </header>
  )
}
