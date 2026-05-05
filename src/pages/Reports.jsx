import { useEffect, useState } from 'react'
import { BarChart2, TrendingUp, Package, Receipt, GitBranch, DollarSign, Download } from 'lucide-react'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

const today = new Date().toISOString().slice(0,10)
const monthStart = new Date().toISOString().slice(0,7) + '-01'

const TABS = [
  { key: 'sales',     label: 'Sales',         icon: BarChart2  },
  { key: 'products',  label: 'Top Products',  icon: TrendingUp },
  { key: 'pl',        label: 'Profit & Loss', icon: DollarSign },
  { key: 'tax',       label: 'Tax',           icon: Receipt    },
  { key: 'inventory', label: 'Inventory',     icon: Package    },
  { key: 'branch',    label: 'By Branch',     icon: GitBranch  },
]

function exportCSV(rows, filename) {
  if (!rows || !rows.length) return
  const headers = Object.keys(rows[0]).join(',')
  const body    = rows.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(',')).join('\n')
  const blob    = new Blob([headers + '\n' + body], { type: 'text/csv' })
  const a       = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

function StatCard({ label, value, color }) {
  return (
    <div style={C.cardP}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, margin: '4px 0 0' }}>{value}</p>
    </div>
  )
}

function ReportTable({ cols, rows, emptyMsg = 'No data for selected period.' }) {
  return (
    <div style={C.card}>
      <div style={{ overflowX: 'auto' }}>
        <table style={C.table}>
          <thead>
            <tr>{cols.map(c => <th key={c.key} style={C.th(c.right)}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                {cols.map(c => {
                  const val = c.render ? c.render(r) : (r[c.key] ?? '—')
                  const extraStyle = c.color ? { color: c.color(r) } : {}
                  return <td key={c.key} style={{ ...C.td(c.right), ...(c.bold ? { fontWeight: 600 } : {}), ...extraStyle }}>{val}</td>
                })}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cols.length} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{emptyMsg}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Reports() {
  const can = usePerm()
  const [tab,     setTab]     = useState('sales')
  const [from,    setFrom]    = useState(monthStart)
  const [to,      setTo]      = useState(today)
  const [data,    setData]    = useState({})
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const filters = { from: from || undefined, to: to || undefined }
      const [sales, products, pl, tax, inventory, branch] = await Promise.all([
        window.api.reports.sales(filters), window.api.reports.topProducts(filters),
        window.api.reports.profitLoss(filters), window.api.reports.tax(filters),
        window.api.reports.inventory(), window.api.reports.branchSales(filters),
      ])
      setData({ sales, products, pl, tax, inventory, branch })
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to])

  const salesTotals = (data.sales || []).reduce((a, r) => ({ sales: a.sales+(r.total_sales||0), revenue: a.revenue+(r.revenue||0), discounts: a.discounts+(r.discounts||0), taxes: a.taxes+(r.taxes||0) }), { sales:0, revenue:0, discounts:0, taxes:0 })
  const invValue    = (data.inventory || []).reduce((s, p) => s + (p.stock_value || 0), 0)

  const presets = [
    { l: 'Today',      f: today,      t: today },
    { l: 'This Week',  f: (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10) })(), t: today },
    { l: 'This Month', f: monthStart, t: today },
    { l: 'All Time',   f: '',         t: '' },
  ]

  return (
    <div style={C.page}>
      {/* Header */}
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Reports</h2>
          <p style={C.subtitle}>Business analytics & insights</p>
        </div>
        {can('reports','view') && (
          <button style={C.btn2} onClick={() => exportCSV(data[tab] || [], `${tab}-report.csv`)}>
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p.l} onClick={() => { setFrom(p.f); setTo(p.t) }} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 500, background: from===p.f && to===p.t ? '#4f46e5' : '#fff', color: from===p.f && to===p.t ? '#fff' : '#475569', borderColor: from===p.f && to===p.t ? '#4f46e5' : '#e2e8f0' }}>{p.l}</button>
        ))}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...C.input, width: 140 }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...C.input, width: 140 }} />
      </div>

      {/* Tabs */}
      <div style={{ ...C.tabBar, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={C.tab(tab === t.key)}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 13 }}>Loading report…</div>}

      {!loading && (
        <>
          {/* Sales */}
          {tab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={C.g4}>
                <StatCard label="Total Sales"     value={salesTotals.sales}                    color="#4f46e5" />
                <StatCard label="Revenue"         value={`$${fmt(salesTotals.revenue)}`}        color="#059669" />
                <StatCard label="Discounts Given" value={`$${fmt(salesTotals.discounts)}`}      color="#d97706" />
                <StatCard label="Tax Collected"   value={`$${fmt(salesTotals.taxes)}`}          color="#475569" />
              </div>
              <ReportTable
                cols={[
                  { key: 'day',         label: 'Date' },
                  { key: 'total_sales', label: 'Sales',     right: true, bold: true, color: () => '#4f46e5' },
                  { key: 'revenue',     label: 'Revenue',   right: true, bold: true, color: () => '#059669', render: r => `$${fmt(r.revenue)}` },
                  { key: 'discounts',   label: 'Discounts', right: true, color: r => r.discounts > 0 ? '#d97706' : '#94a3b8', render: r => r.discounts > 0 ? `-$${fmt(r.discounts)}` : '—' },
                  { key: 'taxes',       label: 'Tax',       right: true, render: r => r.taxes > 0 ? `$${fmt(r.taxes)}` : '—' },
                ]}
                rows={data.sales || []}
              />
            </div>
          )}

          {/* Top Products */}
          {tab === 'products' && (
            <ReportTable
              cols={[
                { key: 'name',          label: 'Product' },
                { key: 'total_qty',     label: 'Units Sold', right: true, bold: true, color: () => '#4f46e5' },
                { key: 'total_revenue', label: 'Revenue',    right: true, bold: true, color: () => '#059669', render: r => `$${fmt(r.total_revenue)}` },
              ]}
              rows={data.products || []}
            />
          )}

          {/* P&L */}
          {tab === 'pl' && data.pl && (
            <div style={C.g2}>
              <div style={C.cardP}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Profit & Loss Statement</p>
                {[
                  { label: 'Gross Revenue',  value: data.pl.revenue,      color: '#059669', border: false },
                  { label: 'Cost of Goods',  value: -data.pl.cogs,        color: '#dc2626', border: false },
                  { label: 'Gross Profit',   value: data.pl.gross_profit, color: data.pl.gross_profit >= 0 ? '#4f46e5' : '#ea580c', border: true },
                  { label: 'Other Expenses', value: -data.pl.expenses,    color: '#dc2626', border: false },
                  { label: 'Net Profit',     value: data.pl.net_profit,   color: data.pl.net_profit >= 0 ? '#059669' : '#dc2626', border: true },
                ].map(({ label, value, color, border }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: border ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: border ? 600 : 400 }}>{label}</span>
                    <span style={{ fontSize: border ? 16 : 13, fontWeight: 700, color }}>{value >= 0 ? '+' : ''}${fmt(value)}</span>
                  </div>
                ))}
              </div>
              <div style={C.cardP}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Visual Breakdown</p>
                {[
                  { label: 'Revenue',      value: data.pl.revenue,      bar: '#34d399' },
                  { label: 'COGS',         value: data.pl.cogs,         bar: '#f87171' },
                  { label: 'Gross Profit', value: data.pl.gross_profit, bar: '#818cf8' },
                  { label: 'Expenses',     value: data.pl.expenses,     bar: '#fb923c' },
                  { label: 'Net Profit',   value: data.pl.net_profit,   bar: data.pl.net_profit >= 0 ? '#34d399' : '#f87171' },
                ].map(({ label, value, bar }) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>${fmt(Math.abs(value))}</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: bar, borderRadius: 99, width: `${Math.min(100, data.pl.revenue > 0 ? (Math.abs(value) / data.pl.revenue) * 100 : 0)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax */}
          {tab === 'tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={C.g2}>
                <StatCard label="Total Tax Collected" value={`$${fmt((data.tax||[]).reduce((s,r) => s+(r.total_tax||0), 0))}`} color="#4f46e5" />
                <StatCard label="Taxable Revenue"     value={`$${fmt((data.tax||[]).reduce((s,r) => s+(r.revenue||0), 0))}`}   color="#059669" />
              </div>
              <ReportTable
                cols={[
                  { key: 'day',       label: 'Date' },
                  { key: 'revenue',   label: 'Revenue',       right: true, render: r => `$${fmt(r.revenue)}` },
                  { key: 'total_tax', label: 'Tax Collected', right: true, bold: true, color: () => '#4f46e5', render: r => `$${fmt(r.total_tax)}` },
                  { key: 'pct',       label: 'Effective Rate',right: true, render: r => r.revenue > 0 ? `${((r.total_tax/r.revenue)*100).toFixed(1)}%` : '—' },
                ]}
                rows={data.tax || []}
              />
            </div>
          )}

          {/* Inventory */}
          {tab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={C.g3}>
                <StatCard label="Total Products"    value={(data.inventory||[]).length}                                                    color="#4f46e5" />
                <StatCard label="Total Stock Value" value={`$${fmt(invValue)}`}                                                            color="#059669" />
                <StatCard label="Low / Out of Stock" value={(data.inventory||[]).filter(p => p.quantity <= p.low_stock_threshold).length}  color="#d97706" />
              </div>
              <ReportTable
                cols={[
                  { key: 'name',          label: 'Product' },
                  { key: 'category_name', label: 'Category' },
                  { key: 'quantity',      label: 'Stock',       right: true, bold: true, color: r => r.quantity <= r.low_stock_threshold ? '#ef4444' : '#059669' },
                  { key: 'cost_price',    label: 'Cost Price',  right: true, render: r => `$${fmt(r.cost_price)}` },
                  { key: 'stock_value',   label: 'Stock Value', right: true, bold: true, color: () => '#4f46e5', render: r => `$${fmt(r.stock_value)}` },
                ]}
                rows={data.inventory || []}
              />
            </div>
          )}

          {/* Branch */}
          {tab === 'branch' && (
            <ReportTable
              cols={[
                { key: 'branch',      label: 'Branch' },
                { key: 'sales_count', label: 'Total Sales', right: true, bold: true, color: () => '#4f46e5' },
                { key: 'revenue',     label: 'Revenue',     right: true, bold: true, color: () => '#059669', render: r => `$${fmt(r.revenue)}` },
              ]}
              rows={data.branch || []}
              emptyMsg="No branch sales data for selected period."
            />
          )}
        </>
      )}
    </div>
  )
}
