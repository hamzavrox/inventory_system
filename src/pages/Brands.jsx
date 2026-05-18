import { useEffect, useState } from 'react'
import { Plus, Trash2, Tag } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

export default function Brands() {
  const can = usePerm()
  const [brands, setBrands] = useState([])
  const [open,   setOpen]   = useState(false)
  const [name,   setName]   = useState('')
  const [toast,  setToast]  = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => window.api.brands.getAll().then(setBrands).catch(() => {})
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    await window.api.brands.add({ name: name.trim() })
    setName(''); setOpen(false); load()
    showToast('Brand added successfully')
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this brand?')) { await window.api.brands.delete(id); load(); showToast('Brand deleted', 'error') }
  }

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Brands</h2>
          <p style={C.subtitle}>{brands.length} brands</p>
        </div>
        {can('brands','add') && <button style={C.btn} onClick={() => setOpen(true)}><Plus size={14} /> Add Brand</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {brands.map(b => (
          <div key={b.id} style={{ ...C.cardP, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={18} color="#00deab" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{b.name}</span>
            {can('brands','delete') && (
              <button style={{ ...C.iBtn, position: 'absolute', top: 8, right: 8 }} onClick={() => handleDelete(b.id)}>
                <Trash2 size={12} color="#ef4444" />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setOpen(true)} style={{ border: '2px dashed #e2e8f0', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#f8fafc', color: '#94a3b8' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} /></div>
          <span style={{ fontSize: 12 }}>Add Brand</span>
        </button>
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setName('') }} title="Add Brand">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Brand Name *"><Input placeholder="e.g. Rose Garden" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus /></FormField>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={handleSave}>Save Brand</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setName('') }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}


