import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronRight, FolderOpen, Folder } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

export default function Categories() {
  const can  = usePerm()
  const [cats, setCats]         = useState([])
  const [open, setOpen]         = useState(false)
  const [form, setForm]         = useState({ name: '', parent_id: '' })
  const [expanded, setExpanded] = useState({})
  const [toast,    setToast]    = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => window.api.categories.getAll().then(setCats).catch(() => {})
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    await window.api.categories.add({ name: form.name.trim(), parent_id: form.parent_id || null })
    setForm({ name: '', parent_id: '' }); setOpen(false); load()
    showToast('Category added successfully')
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this category?')) { await window.api.categories.delete(id); load(); showToast('Category deleted', 'error') }
  }

  const roots    = cats.filter(c => !c.parent_id)
  const children = (pid) => cats.filter(c => c.parent_id === pid)

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Categories</h2>
          <p style={C.subtitle}>{cats.length} total categories</p>
        </div>
        {can('categories','add') && (
          <button style={C.btn} onClick={() => setOpen(true)}><Plus size={14} /> Add Category</button>
        )}
      </div>

      <div style={C.card}>
        {!roots.length && <p style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No categories yet.</p>}
        {roots.map(root => {
          const subs = children(root.id)
          const isOpen = expanded[root.id]
          return (
            <div key={root.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <button onClick={() => subs.length && setExpanded(s => ({ ...s, [root.id]: !s[root.id] }))} style={{ ...C.iBtn, color: '#94a3b8', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', visibility: subs.length ? 'visible' : 'hidden' }}>
                  <ChevronRight size={14} />
                </button>
                {subs.length > 0 ? <FolderOpen size={16} color="#f59e0b" /> : <Folder size={16} color="#94a3b8" />}
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#334155' }}>{root.name}</span>
                {subs.length > 0 && <span style={C.badge('#f1f5f9','#64748b')}>{subs.length} sub</span>}
                {can('categories','delete') && (
                  <button style={C.iBtn} onClick={() => handleDelete(root.id)}><Trash2 size={13} color="#ef4444" /></button>
                )}
              </div>
              {isOpen && subs.map(sub => (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 52px', background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                  <Folder size={13} color="#cbd5e1" />
                  <span style={{ flex: 1, fontSize: 13, color: '#475569' }}>{sub.name}</span>
                  {can('categories','delete') && (
                    <button style={C.iBtn} onClick={() => handleDelete(sub.id)}><Trash2 size={13} color="#ef4444" /></button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {can('categories','add') && (
        <Modal open={open} onClose={() => { setOpen(false); setForm({ name: '', parent_id: '' }) }} title="Add Category">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Category Name *"><Input placeholder="e.g. Flowers, Accessories" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField>
            <FormField label="Parent Category (optional)">
              <Select value={form.parent_id} onChange={e => f('parent_id', e.target.value)}>
                <option value="">— Top Level —</option>
                {roots.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </FormField>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <Btn onClick={handleSave}>Save Category</Btn>
              <Btn variant="secondary" onClick={() => { setOpen(false); setForm({ name: '', parent_id: '' }) }}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      )}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}
