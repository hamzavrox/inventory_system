import { useEffect, useState } from 'react'
import { Plus, Store, GitBranch, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

export default function Shops() {
  const can = usePerm()
  const [shops,    setShops]    = useState([])
  const [branches, setBranches] = useState([])
  const [open,     setOpen]     = useState(false)
  const [form,     setForm]     = useState({ name: '', branch_id: '' })

  const load = () => Promise.all([window.api.shops.getAll(), window.api.branches.getAll()]).then(([s,b]) => { setShops(s); setBranches(b) }).catch(() => {})
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    await window.api.shops.add({ name: form.name.trim(), branch_id: form.branch_id || null })
    setForm({ name: '', branch_id: '' }); setOpen(false); load()
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this shop?')) { await window.api.shops.delete(id); load() }
  }

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Shops</h2>
          <p style={C.subtitle}>{shops.length} shop{shops.length !== 1 ? 's' : ''}</p>
        </div>
        {can('shops','add') && (
          <button style={C.btn} onClick={() => setOpen(true)}><Plus size={14} /> Add Shop</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {shops.map(s => (
          <div key={s.id} style={{ ...C.cardP, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', position: 'relative' }}>
            {can('shops','delete') && (
              <button style={{ ...C.iBtn, position: 'absolute', top: 8, right: 8 }} onClick={() => handleDelete(s.id)}>
                <Trash2 size={12} color="#ef4444" />
              </button>
            )}
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={20} color="#059669" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>{s.name}</p>
            {s.branch_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <GitBranch size={11} color="#94a3b8" />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.branch_name}</span>
              </div>
            )}
          </div>
        ))}
        <button onClick={() => setOpen(true)} style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#f8fafc', color: '#94a3b8' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={20} /></div>
          <span style={{ fontSize: 12 }}>Add Shop</span>
        </button>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setForm({ name: '', branch_id: '' }) }} title="Add Shop">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Shop Name *"><Input placeholder="e.g. Store #1" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField>
          <FormField label="Branch">
            <Select value={form.branch_id} onChange={e => f('branch_id', e.target.value)}>
              <option value="">— Select Branch —</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </FormField>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}>Save Shop</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setForm({ name: '', branch_id: '' }) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
