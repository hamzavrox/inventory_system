import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Layers, AlertTriangle, X, Check, ChevronDown, ChevronRight } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

const emptyForm = { name: '', sku: '', barcode: '', price: 0, cost_price: 0, quantity: 0, unit: 'pcs', low_stock_threshold: 10, category_id: '', brand_id: '' }
const emptyVariant = { name: '', sku: '', price: '', quantity: '' }

export default function Products() {
  const can = usePerm()
  const [products,   setProducts]   = useState([])
  const [categories, setCategories] = useState([])
  const [brands,     setBrands]     = useState([])
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('')
  const [form,       setForm]       = useState(emptyForm)
  const [editId,     setEditId]     = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [varModal,   setVarModal]   = useState(null)
  const [variants,   setVariants]   = useState([])
  const [varForm,    setVarForm]    = useState(emptyVariant)
  const [formError,  setFormError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [expanded,   setExpanded]   = useState({})
  const [toast,      setToast]      = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => Promise.all([
    window.api.products.getAll(),
    window.api.categories.getAll(),
    window.api.brands.getAll(),
  ]).then(([p, c, b]) => { setProducts(p); setCategories(c); setBrands(b) }).catch(() => {})

  const loadCatsBrands = () => Promise.all([
    window.api.categories.getAll(),
    window.api.brands.getAll(),
  ]).then(([c, b]) => { setCategories(c); setBrands(b) }).catch(() => {})

  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const toggleExpand = async (p) => {
    if (expanded[p.id]) {
      setExpanded(s => { const n = { ...s }; delete n[p.id]; return n })
    } else {
      const vars = await window.api.variants.getByProduct(p.id)
      setExpanded(s => ({ ...s, [p.id]: vars }))
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setFormError('Product name is required.'); return }
    setFormError('')
    setSaving(true)
    try {
      const data = { ...form, category_id: form.category_id || null, brand_id: form.brand_id || null, sku: form.sku || null, barcode: form.barcode || null }
      if (editId) await window.api.products.update(editId, data)
      else        await window.api.products.add(data)
      setForm(emptyForm); setEditId(null); setShowForm(false); load()
      showToast(editId ? 'Product updated successfully' : 'Product added successfully')
    } catch (e) {
      setFormError('Failed to save: ' + (e?.message || 'Unknown error'))
    }
    setSaving(false)
  }

  const handleEdit = (p) => {
    loadCatsBrands()
    setEditId(p.id)
    setForm({ name: p.name, sku: p.sku || '', barcode: p.barcode || '', price: p.price, cost_price: p.cost_price, quantity: p.quantity, unit: p.unit || 'pcs', low_stock_threshold: p.low_stock_threshold || 10, category_id: p.category_id || '', brand_id: p.brand_id || '' })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) { await window.api.products.delete(id); load(); showToast('Product deleted', 'error') }
  }

  const openVariants = async (p) => {
    setVarModal(p)
    setVariants(await window.api.variants.getByProduct(p.id))
  }

  const handleAddVariant = async () => {
    if (!varForm.name.trim()) return
    await window.api.variants.add({ ...varForm, product_id: varModal.id, price: +varForm.price || 0, quantity: +varForm.quantity || 0, sku: varForm.sku || null })
    setVarForm(emptyVariant)
    const updated = await window.api.variants.getByProduct(varModal.id)
    setVariants(updated)
    if (expanded[varModal.id]) setExpanded(s => ({ ...s, [varModal.id]: updated }))
    showToast('Variant added')
  }

  const handleDeleteVariant = async (id) => {
    await window.api.variants.delete(id)
    const updated = await window.api.variants.getByProduct(varModal.id)
    setVariants(updated)
    if (expanded[varModal.id]) setExpanded(s => ({ ...s, [varModal.id]: updated }))
    showToast('Variant deleted', 'error')
  }

  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
    return ms && (!filterCat || p.category_id === filterCat)
  })

  return (
    <div style={{ ...C.page, overflow: 'hidden' }}>
      <div style={{ ...C.header, flexShrink: 0 }}>
        <div>
          <h2 style={C.title}>Products</h2>
          <p style={C.subtitle}>{products.length} products</p>
        </div>
        {can('products','add') && (
          <button style={C.btn} onClick={() => { loadCatsBrands(); setShowForm(true); setEditId(null); setForm(emptyForm) }}>
            <Plus size={14} /> Add Product
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={C.searchWrap}>
          <span style={C.searchIcon}><Search size={14} /></span>
          <input style={C.searchInput} placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...C.select, width: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ ...C.card, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={C.table}>
            <thead>
              <tr>
                {['','Name','SKU','Category','Brand','Cost','Price','Stock','Actions'].map((h) =>
                  <th key={h} style={C.th(['Cost','Price','Stock'].includes(h))}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <>
                  <tr key={p.id} style={{ background: p.quantity <= 0 ? '#fff5f5' : p.quantity <= p.low_stock_threshold ? '#fffbeb' : '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = p.quantity <= 0 ? '#fff5f5' : p.quantity <= p.low_stock_threshold ? '#fffbeb' : '#fff'}
                  >
                    <td style={{ ...C.td(), width: 32, paddingRight: 0 }}>
                      <button onClick={() => toggleExpand(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', display: 'flex' }}>
                        {expanded[p.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    </td>
                    <td style={C.tdb()}>
                      {p.name}
                      {p.quantity <= p.low_stock_threshold && <AlertTriangle size={11} style={{ display: 'inline', marginLeft: 5, color: '#f59e0b', verticalAlign: 'middle' }} />}
                    </td>
                    <td style={{ ...C.td(), fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{p.sku || '—'}</td>
                    <td style={{ ...C.td(), fontSize: 12 }}>{p.category_name || '—'}</td>
                    <td style={{ ...C.td(), fontSize: 12 }}>{p.brand_name || '—'}</td>
                    <td style={C.td(true)}>${fmt(p.cost_price)}</td>
                    <td style={C.tdb(true)}>${fmt(p.price)}</td>
                    <td style={{ ...C.tdb(true), color: p.quantity <= p.low_stock_threshold ? '#ef4444' : '#059669' }}>
                      {p.quantity} <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>{p.unit}</span>
                    </td>
                    <td style={{ ...C.td(), textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <button style={C.iBtn} onClick={() => openVariants(p)} title="Variants"><Layers size={14} color="#94a3b8" /></button>
                        {can('products','edit')   && <button style={C.iBtn} onClick={() => handleEdit(p)}><Pencil size={14} color="#6366f1" /></button>}
                        {can('products','delete') && <button style={C.iBtn} onClick={() => handleDelete(p.id)}><Trash2 size={14} color="#ef4444" /></button>}
                      </div>
                    </td>
                  </tr>
                  {expanded[p.id] && (
                    expanded[p.id].length === 0
                      ? <tr key={p.id+'_empty'}><td colSpan={9} style={{ padding: '8px 16px 8px 48px', fontSize: 12, color: '#94a3b8', background: '#f8fafc' }}>No variants.</td></tr>
                      : expanded[p.id].map(v => (
                        <tr key={v.id} style={{ background: '#f8fafc' }}>
                          <td style={{ ...C.td(), width: 32 }} />
                          <td style={{ ...C.td(), paddingLeft: 32, fontSize: 12, color: '#475569' }}>↳ {v.name}</td>
                          <td style={{ ...C.td(), fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{v.sku || '—'}</td>
                          <td style={C.td()} />
                          <td style={C.td()} />
                          <td style={C.td(true)} />
                          <td style={{ ...C.tdb(true), color: '#4f46e5' }}>${fmt(v.price)}</td>
                          <td style={{ ...C.tdb(true), color: v.quantity <= 0 ? '#ef4444' : '#059669' }}>{v.quantity}</td>
                          <td style={C.td()} />
                        </tr>
                      ))
                  )}
                </>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {search || filterCat ? 'No products match your filter.' : 'No products yet. Add your first product.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setFormError('') }} title={editId ? 'Edit Product' : 'New Product'} width="max-w-2xl">
        <div style={C.g2}>
          <div style={{ gridColumn: '1 / -1' }}><FormField label="Product Name *"><Input placeholder="e.g. Red Rose Bouquet" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField></div>
          <FormField label="SKU"><Input placeholder="RRB-001" value={form.sku} onChange={e => f('sku', e.target.value)} /></FormField>
          <FormField label="Barcode"><Input placeholder="1234567890" value={form.barcode} onChange={e => f('barcode', e.target.value)} /></FormField>
          <FormField label="Category">
            <Select value={form.category_id} onChange={e => f('category_id', e.target.value)}>
              <option value="">— Select —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.parent_id ? `  ↳ ${c.name}` : c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Brand">
            <Select value={form.brand_id} onChange={e => f('brand_id', e.target.value)}>
              <option value="">— Select —</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Sale Price ($)"><Input type="number" min="0" step="0.01" value={form.price} onChange={e => f('price', +e.target.value)} /></FormField>
          <FormField label="Cost Price ($)"><Input type="number" min="0" step="0.01" value={form.cost_price} onChange={e => f('cost_price', +e.target.value)} /></FormField>
          <FormField label="Quantity"><Input type="number" min="0" value={form.quantity} onChange={e => f('quantity', +e.target.value)} /></FormField>
          <FormField label="Unit">
            <Select value={form.unit} onChange={e => f('unit', e.target.value)}>
              {['pcs','kg','g','ltr','ml','box','dozen','bundle'].map(u => <option key={u}>{u}</option>)}
            </Select>
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}><FormField label="Low Stock Alert (qty)"><Input type="number" min="0" value={form.low_stock_threshold} onChange={e => f('low_stock_threshold', +e.target.value)} /></FormField></div>
        </div>
        {formError && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginTop: 12 }}>
            {formError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn onClick={handleSubmit} disabled={saving}>
            <Check size={14} /> {saving ? 'Saving…' : editId ? 'Update' : 'Save Product'}
          </Btn>
          <Btn variant="secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setFormError('') }}><X size={14} /> Cancel</Btn>
        </div>
      </Modal>

      {/* Variants Modal */}
      <Modal open={!!varModal} onClose={() => { setVarModal(null); setVariants([]); setVarForm(emptyVariant) }} title={`Variants — ${varModal?.name}`} width="max-w-xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {!variants.length && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No variants yet.</p>}
          {variants.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#334155' }}>{v.name}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{v.sku || '—'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>${fmt(v.price)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: v.quantity <= 0 ? '#ef4444' : '#059669' }}>{v.quantity}</span>
              <button style={C.iBtn} onClick={() => handleDeleteVariant(v.id)}><Trash2 size={13} color="#ef4444" /></button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Add Variant</p>
          <div style={C.g2}>
            <div style={{ gridColumn: '1 / -1' }}><FormField label="Variant Name *"><Input placeholder="e.g. Red / Large" value={varForm.name} onChange={e => setVarForm(s => ({ ...s, name: e.target.value }))} /></FormField></div>
            <FormField label="SKU"><Input placeholder="Optional" value={varForm.sku} onChange={e => setVarForm(s => ({ ...s, sku: e.target.value }))} /></FormField>
            <FormField label="Price ($)"><Input type="number" min="0" step="0.01" value={varForm.price} onChange={e => setVarForm(s => ({ ...s, price: e.target.value }))} /></FormField>
            <FormField label="Quantity"><Input type="number" min="0" value={varForm.quantity} onChange={e => setVarForm(s => ({ ...s, quantity: e.target.value }))} /></FormField>
          </div>
          <div style={{ marginTop: 12 }}><Btn onClick={handleAddVariant}><Plus size={14} /> Add Variant</Btn></div>
        </div>
      </Modal>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}
