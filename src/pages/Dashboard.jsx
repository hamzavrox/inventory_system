import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Package, Users, AlertTriangle, TrendingUp } from 'lucide-react'

function StatCard({ id, icon: Icon, label, value, bg, iconColor, onClick, activeId }) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = activeId === id;

  return (
    <button
      onClick={() => onClick(id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="glass-card"
      style={{
        padding: isActive ? '15px 19px' : '16px 20px', // Compensate for 2px vs 1px border to prevent layout shift
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        border: isActive 
          ? `2px solid var(--primary)` 
          : isHovered 
            ? `1px solid var(--primary)` 
            : '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', margin: '2px 0 0' }}>
          {value ?? '-'}
        </p>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const [stats, setStats] = useState({})
  const [activeCard, setActiveCard] = useState(null)

  useEffect(() => {
    Promise.all([
      window.api.products.getAll(),
      window.api.customers.getAll(),
      window.api.products.getLowStock(),
      window.api.accounting.getSummary(),
      window.api.sales.getAll({ limit: 8 }),
    ]).then(([products, customers, lowStock, summary, recentSales]) => {
      setStats({ products, customers, lowStock, summary, recentSales })
    }).catch(() => { })
  }, [])

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleCardClick = (id, route) => {
    setActiveCard(id);
    // Add a small delay so the user can see the active border effect before navigating
    setTimeout(() => nav(route), 150);
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard id="products" activeId={activeCard} icon={Package} label="Total Products" value={stats.products?.length} bg="#ecfdf5" iconColor="#00deab" onClick={(id) => handleCardClick(id, '/products')} />
        <StatCard id="customers" activeId={activeCard} icon={Users} label="Customers" value={stats.customers?.length} bg="#f0fdf4" iconColor="#16a34a" onClick={(id) => handleCardClick(id, '/customers')} />
        <StatCard id="lowStock" activeId={activeCard} icon={AlertTriangle} label="Low Stock" value={stats.lowStock?.length} bg="#fffbeb" iconColor="#d97706" onClick={(id) => handleCardClick(id, '/inventory')} />
        <StatCard id="profit" activeId={activeCard} icon={TrendingUp} label="Net Profit" value={stats.summary ? `$${fmt(stats.summary.profit)}` : null} bg="#faf5ff" iconColor="#9333ea" onClick={(id) => handleCardClick(id, '/accounting')} />
      </div>

      {/* Recent Sales Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Recent Transactions</h2>
          </div>
          <button onClick={() => nav('/pos')} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            View all
          </button>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table style={{ fontSize: 13 }}>
            <thead>
              <tr>
                {['Invoice', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '9px 16px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats.recentSales || []).map(s => (
                <tr key={s.id}>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', fontSize: 12 }}>{s.invoice_no}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{s.customer_name || 'Walk-in'}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-main)' }}>${fmt(s.total)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-light)' }}>{s.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {!stats.recentSales?.length && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>
                    No recent sales found
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




