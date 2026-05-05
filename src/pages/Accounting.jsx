import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

const INCOME_CATS  = ['sale','service','investment','other']
const EXPENSE_CATS = ['purchase','refund','salary','rent','utilities','marketing','other']
const TABS = ['Summary','Transactions','Cash Flow']

const today = new Date().toISOString().slice(0,10)
const monthStart = new Date().toISOString().slice(0,7) + '-01'

function DateBar({ from, to, onChange }) {
  const presets = [
    { l: 'Today',      f: today,      t: today },
    { l: 'This Week',  f: (() => { const d=new Date(); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10) })(), t: today },
    { l: 'This Month', f: monthStart, t: today },
    { l: 'All Time',   f: '',         t: '' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {presets.map(p => (
        <button key={p.l} onClick={() => onChange(p.f, p.t)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 500, background: from===p.f && to===p.t ? '#4f46e5' : '#fff', color: from===p.f && to===p.t ? '#fff' : '#475569', borderColor: from===p.f && to===p.t ? '#4f46e5' : '#e2e8f0' }}>{p.l}</button>
      ))}
      <input type="date" value={from} onChange={e => onChange(e.target.value, to)} style={{ ...C.input, width: 140 }} />
      <span style={{ fontSize: 12, color: '#94a3b8' }}>to</span>
      <input type="date" value={to} onChange={e => onChange(from, e.target.value)} style={{ ...C.input, width: 140 }} />
    </div>
  )
}

export default function Accounting() {
  const can = usePerm()
  const [tab,          setTab]          = useState(0)
  const [from,         setFrom]         = useState(monthStart)
  const [to,           setTo]           = useState(today)
  const [summary,      setSummary]      = useState({ income: 0, expense: 0, profit: 0 })
  const [transactions, setTransactions] = useState([])
  const [cashFlow,     setCashFlow]     = useState([])
  const [typeFilter,   setTypeFilter]   = useState('')
  const [entryModal,   setEntryModal]   = useState(false)
  const [form,         setForm]         = useState({ type: 'income', category: 'sale', amount: '', note: '' })

  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const load = () => {
    const filters = { from: from || undefined, to: to || undefined }
    window.api.accounting.getSummary(filters).then(setSummary).catch(() => {})
    window.api.accounting.getTransactions({ ...filters, type: typeFilter || undefined }).then(setTransactions).catch(() => {})
    window.api.accounting.getCashFlow(filters).then(setCashFlow).catch(() => {})
  }

  useEffect(() => { load() }, [from, to, typeFilter])

  const handleSave = async () => {
    if (!form.amount || +form.amount <= 0) return
    await window.api.accounting.addTransaction({ ...form, amount: +form.amount })
    setForm({ type: 'income', category: 'sale', amount: '', note: '' })
    setEntryModal(false); load()
  }

  // Bar chart
  const days   = [...new Set(cashFlow.map(d => d.day))].sort()
  const maxVal = Math.max(...cashFlow.map(d => d.total), 1)
  const byDay  = days.map(day => ({
    day,
    income:  cashFlow.find(d => d.day === day && d.type === 'income')?.total  || 0,
    expense: cashFlow.find(d => d.day === day && d.type === 'expense')?.total || 0,
  }))

  return (
    <div style={C.page}>
      {/* Header */}
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Accounting</h2>
          <p style={C.subtitle}>Income, Expenses & Cash Flow</p>
        </div>
        {can('accounting','add') && (
          <button style={C.btn} onClick={() => setEntryModal(true)}><Plus size={14} /> Add Entry</button>
        )}
      </div>

      {/* Date range */}
      <DateBar from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />

      {/* Summary cards */}
      <div style={C.g3}>
        {[
          { label: 'Total Income',  value: summary.income,  icon: TrendingUp,   bg: '#ecfdf5', ic: '#059669', sub: 'All income' },
          { label: 'Total Expense', value: summary.expense, icon: TrendingDown, bg: '#fef2f2', ic: '#dc2626', sub: 'All expenses' },
          { label: 'Net Profit',    value: summary.profit,  icon: DollarSign,   bg: summary.profit >= 0 ? '#eef2ff' : '#fff7ed', ic: summary.profit >= 0 ? '#4f46e5' : '#ea580c', sub: summary.profit >= 0 ? 'Profitable' : 'Loss period' },
        ].map(({ label, value, icon: Icon, bg, ic, sub }) => (
          <div key={label} style={{ ...C.cardP, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={ic} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: '2px 0 0' }}>${fmt(value)}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={C.tabBar}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={C.tab(tab === i)}>{t}</button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === 0 && (
        <div style={C.g2}>
          {/* P&L */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Profit & Loss</p>
            {[
              { label: 'Total Revenue',  value: summary.income,  color: '#059669', barColor: '#34d399' },
              { label: 'Total Expenses', value: summary.expense, color: '#dc2626', barColor: '#f87171' },
              { label: 'Net Profit',     value: summary.profit,  color: summary.profit >= 0 ? '#4f46e5' : '#ea580c', barColor: summary.profit >= 0 ? '#818cf8' : '#fb923c', border: true },
            ].map(({ label, value, color, barColor, border }) => {
              const max = Math.max(summary.income, summary.expense, 1)
              return (
                <div key={label} style={{ marginBottom: 14, paddingTop: border ? 14 : 0, borderTop: border ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>${fmt(value)}</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: barColor, borderRadius: 99, width: `${Math.min(100, (Math.abs(value) / max) * 100)}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recent transactions */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 16 }}>Recent Transactions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transactions.slice(0, 8).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.type === 'income' ? '#ecfdf5' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.type === 'income' ? <ArrowDownRight size={14} color="#059669" /> : <ArrowUpRight size={14} color="#dc2626" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#334155', margin: 0, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.category || t.type}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || t.created_at?.slice(0,10)}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.type === 'income' ? '#059669' : '#dc2626', flexShrink: 0 }}>
                    {t.type === 'income' ? '+' : '-'}${fmt(t.amount)}
                  </span>
                </div>
              ))}
              {!transactions.length && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>No transactions yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Transactions tab */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['','All'],['income','Income'],['expense','Expense']].map(([v,l]) => (
              <button key={v} onClick={() => setTypeFilter(v)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 8, border: '1px solid', cursor: 'pointer', fontWeight: 500, background: typeFilter===v ? '#4f46e5' : '#fff', color: typeFilter===v ? '#fff' : '#475569', borderColor: typeFilter===v ? '#4f46e5' : '#e2e8f0' }}>{l}</button>
            ))}
          </div>
          <div style={C.card}>
            <div style={{ overflowX: 'auto' }}>
              <table style={C.table}>
                <thead>
                  <tr>{['Type','Category','Amount','Note','Date'].map(h => <th key={h} style={C.th(h==='Amount')}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      <td style={C.td()}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: t.type === 'income' ? '#059669' : '#dc2626' }}>
                          {t.type === 'income' ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{t.type}
                        </span>
                      </td>
                      <td style={{ ...C.td(), textTransform: 'capitalize', fontSize: 12 }}>{t.category || '—'}</td>
                      <td style={{ ...C.tdb(true), color: t.type === 'income' ? '#059669' : '#dc2626' }}>{t.type === 'income' ? '+' : '-'}${fmt(t.amount)}</td>
                      <td style={{ ...C.td(), fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                      <td style={{ ...C.td(), fontSize: 12, whiteSpace: 'nowrap' }}>{t.created_at?.slice(0,16).replace('T',' ')}</td>
                    </tr>
                  ))}
                  {!transactions.length && <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No transactions for selected period.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow tab */}
      {tab === 2 && (
        <div style={C.cardP}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BarChart2 size={16} color="#4f46e5" />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>Daily Cash Flow</p>
          </div>
          {!byDay.length
            ? <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '32px 0' }}>No data for selected period.</p>
            : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, minWidth: 'max-content', padding: '0 8px 8px', height: 160 }}>
                    {byDay.map(({ day, income, expense }) => (
                      <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                          <div style={{ width: 14, background: '#34d399', borderRadius: '3px 3px 0 0', height: `${(income / maxVal) * 100}%`, minHeight: income > 0 ? 4 : 0 }} title={`Income: $${fmt(income)}`} />
                          <div style={{ width: 14, background: '#f87171', borderRadius: '3px 3px 0 0', height: `${(expense / maxVal) * 100}%`, minHeight: expense > 0 ? 4 : 0 }} title={`Expense: $${fmt(expense)}`} />
                        </div>
                        <span style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{day.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 16, padding: '8px 8px 0' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#34d399', display: 'inline-block' }} />Income</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#475569' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f87171', display: 'inline-block' }} />Expense</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', marginTop: 20 }}>
                  <table style={C.table}>
                    <thead><tr>{['Date','Income','Expense','Net'].map(h => <th key={h} style={C.th(['Income','Expense','Net'].includes(h))}>{h}</th>)}</tr></thead>
                    <tbody>
                      {byDay.map(({ day, income, expense }) => {
                        const net = income - expense
                        return (
                          <tr key={day} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <td style={C.td()}>{day}</td>
                            <td style={{ ...C.tdb(true), color: '#059669' }}>+${fmt(income)}</td>
                            <td style={{ ...C.tdb(true), color: '#dc2626' }}>-${fmt(expense)}</td>
                            <td style={{ ...C.tdb(true), color: net >= 0 ? '#4f46e5' : '#ea580c' }}>{net >= 0 ? '+' : ''}${fmt(net)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )
          }
        </div>
      )}

      {/* Add Entry Modal */}
      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Add Transaction">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Type">
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {[['income','Income','#059669'],['expense','Expense','#dc2626']].map(([v,l,c]) => (
                <button key={v} onClick={() => { f('type',v); f('category', v==='income' ? 'sale' : 'purchase') }} style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: form.type===v ? c : '#fff', color: form.type===v ? '#fff' : '#475569' }}>{l}</button>
              ))}
            </div>
          </FormField>
          <FormField label="Category">
            <Select value={form.category} onChange={e => f('category', e.target.value)}>
              {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Amount ($) *"><Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e => f('amount', e.target.value)} autoFocus /></FormField>
          <FormField label="Note"><Input placeholder="Description or reference…" value={form.note} onChange={e => f('note', e.target.value)} /></FormField>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}><Plus size={14} /> Save Entry</Btn>
            <Btn variant="secondary" onClick={() => setEntryModal(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
