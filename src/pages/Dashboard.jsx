import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Package, Users, AlertTriangle, TrendingUp } from 'lucide-react'

function StatCard({ icon: Icon, label, value, bg, iconColor, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer', textAlign: 'left', width: '100%',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '2px 0 0' }}>
          {value ?? '—'}
        </p>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState({})

  useEffect(() => {
    Promise.all([
      window.api.products.getAll(),
      window.api.customers.getAll(),
      window.api.products.getLowStock(),
      window.api.accounting.getSummary(),
      window.api.sales.getAll({ limit: 5 }),
    ]).then(([products, customers, lowStock, summary, recentSales]) => {
      setStats({ products, customers, lowStock, summary, recentSales })
    }).catch(() => {})
  }, [])

  const fmt = (n) => Number(n || 0).toFixed(2)

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard icon={Package}       label="Total Products"  value={stats.products?.length}  bg="#eef2ff" iconColor="#4f46e5" onClick={() => nav('/products')} />
        <StatCard icon={Users}         label="Customers"       value={stats.customers?.length} bg="#ecfdf5" iconColor="#059669" onClick={() => nav('/customers')} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={stats.lowStock?.length}  bg="#fffbeb" iconColor="#d97706" onClick={() => nav('/inventory')} />
        <StatCard icon={TrendingUp}    label="Net Profit"      value={stats.summary ? `$${fmt(stats.summary.profit)}` : null} bg="#f5f3ff" iconColor="#7c3aed" onClick={() => nav('/accounting')} />
      </div>

      {/* P&L row */}
      {stats.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Income',  value: stats.summary.income,  color: '#059669' },
            { label: 'Total Expense', value: stats.summary.expense, color: '#dc2626' },
            { label: 'Net Profit',    value: stats.summary.profit,  color: '#4f46e5' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color, margin: '4px 0 0' }}>${fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Sales */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Recent Sales</span>
          <button onClick={() => nav('/pos')} style={{ fontSize: 12, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}>
            View all
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Invoice', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: h === 'Total' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats.recentSales || []).map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{s.invoice_no}</td>
                  <td style={{ padding: '10px 16px', color: '#475569' }}>{s.customer_name || 'Walk-in'}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>${fmt(s.total)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                      background: s.status === 'completed' ? '#ecfdf5' : '#fef2f2',
                      color: s.status === 'completed' ? '#059669' : '#dc2626',
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: 12 }}>{s.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {!stats.recentSales?.length && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No sales yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
