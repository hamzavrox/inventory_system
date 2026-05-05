import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, BookOpen, History, DollarSign, X, Check, User } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

const emptyForm = { name: '', phone: '', email: '', address: '', credit_limit: 0 }

function BalanceBadge({ balance }) {
  if (balance > 0)  return <span style={C.badge('#ecfdf5','#059669')}>Credit ${fmt(balance)}</span>
  if (balance < 0)  return <span style={C.badge('#fef2f2','#dc2626')}>Owes ${fmt(Math.abs(balance))}</span>
  return <span style={C.badge('#f1f5f9','#64748b')}>Settled</span>
}

function LedgerDrawer({ customer, onClose }) {
  const [ledger,  setLedger]  = useState([])
  const [history, setHistory] = useState([])
  const [tab,     setTab]     = useState('ledger')
  const [payAmt,  setPayAmt]  = useState('')
  const [payNote, setPayNote] = useState('')

  useEffect(() => {
    if (!customer) return
    window.api.customers.getLedger(customer.id).then(setLedger).catch(() => {})
    window.api.customers.getPurchaseHistory(customer.id).then(setHistory).catch(() => {})
  }, [customer])

  const handlePayment = async () => {
    if (!payAmt || +payAmt <= 0) return
    await window.api.customers.addPayment({ customer_id: customer.id, amount: +payAmt, note: payNote })
    setPayAmt(''); setPayNote('')
    window.api.customers.getLedger(customer.id).then(setLedger).catch(() => {})
  }

  if (!customer) return null

  return (
    <div style={{ position: 'fixed', inset: '0 0 0 auto', width: 360, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', borderLeft: '1px solid #e2e8f0', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} color="#4f46e5" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{customer.name}</p>
            <BalanceBadge balance={customer.balance} />
          </div>
        </div>
        <button style={C.iBtn} onClick={onClose}><X size={16} color="#94a3b8" /></button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
        {[['ledger','Ledger',BookOpen],['history','Purchases',History]].map(([k,l,Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 0', fontSize: 12, fontWeight: 500, border: 'none', borderBottom: tab === k ? '2px solid #4f46e5' : '2px solid transparent', marginBottom: -1, background: 'none', cursor: 'pointer', color: tab === k ? '#4f46e5' : '#64748b' }}>
            <Icon size={13} />{l}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'ledger' && (
          <div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Record Payment</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...C.input, flex: 1 }} type="number" placeholder="Amount" value={payAmt} onChange={e => setPayAmt(e.target.value)} />
                <input style={{ ...C.input, flex: 1 }} placeholder="Note" value={payNote} onChange={e => setPayNote(e.target.value)} />
                <button style={{ ...C.btn, padding: '8px 12px' }} onClick={handlePayment}><DollarSign size={13} /></button>
              </div>
            </div>
            {ledger.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.type === 'payment' ? '#059669' : l.type === 'refund' ? '#3b82f6' : '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#334155', margin: 0, textTransform: 'capitalize' }}>{l.type}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note || l.ref_id || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: l.type === 'payment' || l.type === 'refund' ? '#059669' : '#ef4444' }}>
                    {l.type === 'payment' || l.type === 'refund' ? '+' : '-'}${fmt(l.amount)}
                  </p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{l.created_at?.slice(0,10)}</p>
                </div>
              </div>
            ))}
            {!ledger.length && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '32px 0' }}>No ledger entries.</p>}
          </div>
        )}
        {tab === 'history' && (
          <div>
            {history.map(s => (
              <div key={s.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5' }}>{s.invoice_no}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>${fmt(s.total)}</span>
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.items_summary || '—'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <span style={C.badge(s.status === 'completed' ? '#ecfdf5' : '#fef2f2', s.status === 'completed' ? '#059669' : '#dc2626')}>{s.status}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.created_at?.slice(0,10)}</span>
                </div>
              </div>
            ))}
            {!history.length && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '32px 0' }}>No purchases yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const can = usePerm()
  const [customers, setCustomers] = useState([])
  const [search,    setSearch]    = useState('')
  const [form,      setForm]      = useState(emptyForm)
  const [editId,    setEditId]    = useState(null)
  const [showForm,  setShowForm]  = useState(false)
  const [drawer,    setDrawer]    = useState(null)
  const [toast,     setToast]     = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => window.api.customers.getAll().then(setCustomers).catch(() => {})
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editId) await window.api.customers.update(editId, form)
    else        await window.api.customers.add(form)
    setForm(emptyForm); setEditId(null); setShowForm(false); load()
    showToast(editId ? 'Customer updated successfully' : 'Customer added successfully')
  }

  const handleEdit = (c) => {
    setEditId(c.id)
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', credit_limit: c.credit_limit || 0 })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this customer?')) { await window.api.customers.delete(id); load(); showToast('Customer deleted', 'error') }
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalOwed   = customers.filter(c => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0)
  const totalCredit = customers.filter(c => c.balance > 0).reduce((s, c) => s + c.balance, 0)

  return (
    <div style={{ ...C.page, overflow: 'hidden' }}>
      <div style={{ ...C.header, flexShrink: 0 }}>
        <div>
          <h2 style={C.title}>Customers</h2>
          <p style={C.subtitle}>{customers.length} customers</p>
        </div>
        {can('customers','add') && (
          <button style={C.btn} onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}>
            <Plus size={14} /> Add Customer
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ ...C.g3, flexShrink: 0 }}>
        {[
          { label: 'Total Customers', value: customers.length,       color: '#4f46e5' },
          { label: 'Total Owed',      value: `$${fmt(totalOwed)}`,   color: '#dc2626' },
          { label: 'Total Credit',    value: `$${fmt(totalCredit)}`, color: '#059669' },
        ].map(({ label, value, color }) => (
          <div key={label} style={C.cardP}>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color, margin: '4px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...C.card, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={C.searchWrap}>
            <span style={C.searchIcon}><Search size={14} /></span>
            <input style={{ ...C.searchInput, border: 'none', outline: 'none', boxShadow: 'none' }} placeholder="Search by name, phone, or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={C.table}>
            <thead>
              <tr>
                {['Name','Phone','Email','Credit Limit','Balance','Actions'].map(h =>
                  <th key={h} style={C.th(['Credit Limit'].includes(h))}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <td style={C.td()}>
                    <button onClick={() => setDrawer(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4f46e5', padding: 0 }}>
                      {c.name}
                    </button>
                  </td>
                  <td style={C.td()}>{c.phone || '—'}</td>
                  <td style={{ ...C.td(), fontSize: 12 }}>{c.email || '—'}</td>
                  <td style={C.td(true)}>${fmt(c.credit_limit)}</td>
                  <td style={{ ...C.td(), textAlign: 'center' }}><BalanceBadge balance={c.balance} /></td>
                  <td style={{ ...C.td(), textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <button style={C.iBtn} onClick={() => setDrawer(c)} title="Ledger"><BookOpen size={14} color="#94a3b8" /></button>
                      {can('customers','edit')   && <button style={C.iBtn} onClick={() => handleEdit(c)}><Pencil size={14} color="#6366f1" /></button>}
                      {can('customers','delete') && <button style={C.iBtn} onClick={() => handleDelete(c.id)}><Trash2 size={14} color="#ef4444" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {search ? 'No customers match your search.' : 'No customers yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }} title={editId ? 'Edit Customer' : 'New Customer'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Full Name *"><Input placeholder="John Smith" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField>
          <div style={C.g2}>
            <FormField label="Phone"><Input placeholder="+1 234 567 8900" value={form.phone} onChange={e => f('phone', e.target.value)} /></FormField>
            <FormField label="Email"><Input type="email" placeholder="email@example.com" value={form.email} onChange={e => f('email', e.target.value)} /></FormField>
          </div>
          <FormField label="Address"><Input placeholder="Street, City, Country" value={form.address} onChange={e => f('address', e.target.value)} /></FormField>
          <FormField label="Credit Limit ($)"><Input type="number" min="0" step="0.01" value={form.credit_limit} onChange={e => f('credit_limit', +e.target.value)} /></FormField>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}><Check size={14} /> {editId ? 'Update' : 'Save Customer'}</Btn>
            <Btn variant="secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      {/* Drawer */}
      {drawer && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 30 }} onClick={() => setDrawer(null)} />
          <LedgerDrawer customer={drawer} onClose={() => setDrawer(null)} />
        </>
      )}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}
