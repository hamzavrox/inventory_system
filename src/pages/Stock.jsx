import { useEffect, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle, ArrowLeftRight, ClipboardList, Search, Filter } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

const TABS = [
  { key: 'overview',  label: 'Stock Overview', icon: ClipboardList },
  { key: 'adjust',    label: 'Stock In / Out',  icon: ArrowDownCircle },
  { key: 'log',       label: 'Stock Log',       icon: Filter },
  { key: 'transfers', label: 'Transfers',       icon: ArrowLeftRight },
]

const emptyAdj = { productId: '', type: 'in', qty: 1, note: '', batch_no: '', expiry_date: '' }
const emptyTransfer = { product_id: '', from_shop_id: '', to_shop_id: '', quantity: 1, note: '' }

function TypeBadge({ type }) {
  const map = { in: ['#ecfdf5','#059669'], out: ['#fef2f2','#dc2626'], adjust: ['#fffbeb','#d97706'], transfer: ['#eff6ff','#3b82f6'] }
  const [bg, color] = map[type] || ['#f1f5f9','#64748b']
  return <span style={C.badge(bg, color)}>{type}</span>
}

function OverviewTab({ products, onAdjust }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').includes(search)
    if (filter === 'low') return ms && p.quantity > 0 && p.quantity <= p.low_stock_threshold
    if (filter === 'out') return ms && p.quantity <= 0
    return ms
  })

  const lowCount = products.filter(p => p.quantity > 0 && p.quantity <= p.low_stock_threshold).length
  const outCount = products.filter(p => p.quantity <= 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>
      {(lowCount > 0 || outCount > 0) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {outCount > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, padding: '8px 14px', borderRadius: 8 }}><AlertTriangle size={14} /><span><strong>{outCount}</strong> out of stock</span></div>}
          {lowCount > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', fontSize: 13, padding: '8px 14px', borderRadius: 8 }}><AlertTriangle size={14} /><span><strong>{lowCount}</strong> running low</span></div>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={C.searchWrap}>
          <span style={C.searchIcon}><Search size={13} /></span>
          <input style={C.searchInput} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          {[['all','All'],['low','Low Stock'],['out','Out of Stock']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: filter === v ? '#4f46e5' : '#fff', color: filter === v ? '#fff' : '#475569' }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ ...C.card, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={C.table}>
            <thead>
              <tr>
                {['Product','SKU','Category','Stock','Alert At','Status','Action'].map(h =>
                  <th key={h} style={C.th(['Stock','Alert At'].includes(h))}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOut = p.quantity <= 0
                const isLow = !isOut && p.quantity <= p.low_stock_threshold
                return (
                  <tr key={p.id} style={{ background: isOut ? '#fff5f5' : isLow ? '#fffdf0' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = isOut ? '#fff5f5' : isLow ? '#fffdf0' : '#fff'}
                  >
                    <td style={C.tdb()}>{p.name}</td>
                    <td style={{ ...C.td(), fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{p.sku || '—'}</td>
                    <td style={{ ...C.td(), fontSize: 12 }}>{p.category_name || '—'}</td>
                    <td style={{ ...C.tdb(true), color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#059669', fontSize: 15 }}>
                      {p.quantity} <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>{p.unit}</span>
                    </td>
                    <td style={{ ...C.td(true), fontSize: 12 }}>{p.low_stock_threshold}</td>
                    <td style={{ ...C.td(), textAlign: 'center' }}>
                      {isOut ? <span style={C.badge('#fee2e2','#dc2626')}>Out of Stock</span>
                        : isLow ? <span style={C.badge('#fef3c7','#d97706')}>Low Stock</span>
                        : <span style={C.badge('#dcfce7','#16a34a')}>In Stock</span>}
                    </td>
                    <td style={{ ...C.td(), textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        {onAdjust && <button style={C.iBtn} onClick={() => onAdjust(p, 'in')} title="Stock In"><ArrowDownCircle size={16} color="#059669" /></button>}
                        {onAdjust && <button style={C.iBtn} onClick={() => onAdjust(p, 'out')} title="Stock Out"><ArrowUpCircle size={16} color="#ef4444" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!filtered.length && <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No products found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdjustTab({ products, preset, onDone }) {
  const [form, setForm] = useState(emptyAdj)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (preset) setForm(s => ({ ...s, productId: preset.productId, type: preset.type })) }, [preset])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.productId || form.qty <= 0) return
    setSaving(true)
    await window.api.inventory.adjustStock({ productId: form.productId, type: form.type, qty: +form.qty, note: form.note || null, batch_no: form.batch_no || null, expiry_date: form.expiry_date || null })
    setSaving(false); setForm(emptyAdj); onDone()
  }

  const selected = products.find(p => p.id === form.productId)
  const typeColors = { in: ['#059669','#ecfdf5'], out: ['#dc2626','#fef2f2'], adjust: ['#d97706','#fffbeb'] }

  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
        {[['in','Stock In'],['out','Stock Out'],['adjust','Adjustment']].map(([v,l]) => (
          <button key={v} onClick={() => f('type', v)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: form.type === v ? typeColors[v][0] : '#fff', color: form.type === v ? '#fff' : '#475569' }}>{l}</button>
        ))}
      </div>

      <div style={C.cardP}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Product *">
            <Select value={form.productId} onChange={e => f('productId', e.target.value)}>
              <option value="">— Select Product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity} {p.unit})</option>)}
            </Select>
          </FormField>

          {selected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Current Stock</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0', color: selected.quantity <= 0 ? '#ef4444' : selected.quantity <= selected.low_stock_threshold ? '#f59e0b' : '#059669' }}>
                  {selected.quantity} <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>{selected.unit}</span>
                </p>
              </div>
              <span style={{ fontSize: 20, color: '#cbd5e1' }}>→</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>After Adjustment</p>
                <p style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0', color: '#4f46e5' }}>
                  {form.type === 'out' ? Math.max(0, selected.quantity - (+form.qty || 0)) : selected.quantity + (+form.qty || 0)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}> {selected.unit}</span>
                </p>
              </div>
            </div>
          )}

          <div style={C.g2}>
            <FormField label="Quantity *"><Input type="number" min="1" value={form.qty} onChange={e => f('qty', e.target.value)} /></FormField>
            <FormField label="Batch No."><Input placeholder="Optional" value={form.batch_no} onChange={e => f('batch_no', e.target.value)} /></FormField>
            <FormField label="Expiry Date"><Input type="date" value={form.expiry_date} onChange={e => f('expiry_date', e.target.value)} /></FormField>
            <FormField label="Note"><Input placeholder="Reason…" value={form.note} onChange={e => f('note', e.target.value)} /></FormField>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleSave} disabled={saving || !form.productId}>
              {form.type === 'in' ? <><ArrowDownCircle size={14} /> Confirm Stock In</> : form.type === 'out' ? <><ArrowUpCircle size={14} /> Confirm Stock Out</> : <><Filter size={14} /> Save Adjustment</>}
            </Btn>
            <Btn variant="secondary" onClick={() => setForm(emptyAdj)}>Reset</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogTab() {
  const [log, setLog] = useState([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  useEffect(() => { window.api.inventory.getAllStockLog().then(setLog).catch(() => {}) }, [])
  const filtered = log.filter(l => (!search || (l.product_name || '').toLowerCase().includes(search.toLowerCase())) && (!type || l.type === type))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={C.searchWrap}>
          <span style={C.searchIcon}><Search size={13} /></span>
          <input style={C.searchInput} placeholder="Search by product…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...C.select, width: 150 }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="adjust">Adjustment</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>
      <div style={C.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={C.table}>
            <thead><tr>{['Product','Type','Qty','Batch','Expiry','Note','Date'].map(h => <th key={h} style={C.th(h === 'Qty')}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={C.tdb()}>{l.product_name}</td>
                  <td style={C.td()}><TypeBadge type={l.type} /></td>
                  <td style={{ ...C.tdb(true), color: l.type === 'out' ? '#ef4444' : '#059669' }}>{l.type === 'out' ? '-' : '+'}{l.quantity}</td>
                  <td style={{ ...C.td(), fontFamily: 'monospace', fontSize: 11 }}>{l.batch_no || '—'}</td>
                  <td style={{ ...C.td(), fontSize: 12, color: l.expiry_date && new Date(l.expiry_date) < new Date() ? '#ef4444' : '#475569' }}>{l.expiry_date || '—'}</td>
                  <td style={{ ...C.td(), fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.note || '—'}</td>
                  <td style={{ ...C.td(), fontSize: 12, whiteSpace: 'nowrap' }}>{l.created_at?.slice(0,16).replace('T',' ')}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No stock log entries found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TransfersTab({ products }) {
  const [shops, setShops] = useState([])
  const [transfers, setTransfers] = useState([])
  const [form, setForm] = useState(emptyTransfer)
  const [open, setOpen] = useState(false)
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const load = () => Promise.all([window.api.shops.getAll(), window.api.inventory.getTransfers()]).then(([s,t]) => { setShops(s); setTransfers(t) }).catch(() => {})
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.product_id || !form.from_shop_id || !form.to_shop_id || form.quantity <= 0) return
    if (form.from_shop_id === form.to_shop_id) return alert('From and To shops must be different.')
    await window.api.inventory.transfer({ ...form, quantity: +form.quantity })
    setForm(emptyTransfer); setOpen(false); load()
    if (showToast) showToast('Stock transferred successfully')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button style={C.btn} onClick={() => setOpen(true)}><ArrowLeftRight size={14} /> New Transfer</button>
      </div>
      <div style={C.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={C.table}>
            <thead><tr>{['Product','From Shop','To Shop','Qty','Note','Date'].map(h => <th key={h} style={C.th(h === 'Qty')}>{h}</th>)}</tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={C.tdb()}>{t.product_name}</td>
                  <td style={C.td()}>{t.from_shop || '—'}</td>
                  <td style={C.td()}>{t.to_shop || '—'}</td>
                  <td style={{ ...C.tdb(true), color: '#3b82f6' }}>{t.quantity}</td>
                  <td style={{ ...C.td(), fontSize: 12 }}>{t.note || '—'}</td>
                  <td style={{ ...C.td(), fontSize: 12 }}>{t.created_at?.slice(0,10)}</td>
                </tr>
              ))}
              {!transfers.length && <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No transfers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setForm(emptyTransfer) }} title="New Stock Transfer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Product *"><Select value={form.product_id} onChange={e => f('product_id', e.target.value)}><option value="">— Select Product —</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}</Select></FormField>
          <div style={C.g2}>
            <FormField label="From Shop *"><Select value={form.from_shop_id} onChange={e => f('from_shop_id', e.target.value)}><option value="">— Select Shop —</option>{shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="To Shop *"><Select value={form.to_shop_id} onChange={e => f('to_shop_id', e.target.value)}><option value="">— Select Shop —</option>{shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="Quantity *"><Input type="number" min="1" value={form.quantity} onChange={e => f('quantity', e.target.value)} /></FormField>
            <FormField label="Note"><Input placeholder="Optional" value={form.note} onChange={e => f('note', e.target.value)} /></FormField>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleSave}><ArrowLeftRight size={14} /> Confirm Transfer</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setForm(emptyTransfer) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function Stock() {
  const can = usePerm()
  const [tab, setTab] = useState('overview')
  const [products, setProducts] = useState([])
  const [adjPreset, setAdjPreset] = useState(null)
  const [toast,     setToast]    = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadProducts = () => window.api.products.getAll().then(setProducts).catch(() => {})
  useEffect(() => { loadProducts() }, [])

  const handleQuickAdjust = (product, type) => { setAdjPreset({ productId: product.id, type }); setTab('adjust') }

  const handleAdjustDone = () => { loadProducts(); showToast('Stock adjusted successfully') }

  return (
    <div style={{ ...C.page, overflow: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <h2 style={C.title}>Inventory / Stock</h2>
        <p style={C.subtitle}>{products.length} products tracked</p>
      </div>

      {/* Tabs */}
      <div style={{ ...C.tabBar, flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={C.tab(tab === t.key)}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab products={products} onAdjust={can('inventory','add') ? handleQuickAdjust : null} />}
      {tab === 'adjust'    && (can('inventory','add') ? <AdjustTab products={products} preset={adjPreset} onDone={handleAdjustDone} /> : <p style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>You don't have permission to adjust stock.</p>)}
      {tab === 'log'       && <LogTab />}
      {tab === 'transfers' && (can('inventory','add') ? <TransfersTab products={products} showToast={showToast} /> : <p style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>You don't have permission to transfer stock.</p>)}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}
