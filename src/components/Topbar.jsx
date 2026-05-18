import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, HelpCircle, RefreshCw, AlertTriangle } from 'lucide-react'

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
      height: 48, minHeight: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', gap: 16,
      background: '#fff',
      borderBottom: '1px solid var(--border-color)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Page Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          FloriManager
        </h1>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {lowStock > 0 && (
          <button
            onClick={() => { window.location.hash = '#/inventory' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fffbeb', color: '#d97706',
              border: '1px solid #fde68a',
              padding: '6px 12px', borderRadius: 99,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={14} />
            <span>{lowStock} Low Stock</span>
          </button>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px',
            fontSize: 13,
          }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  )
}




