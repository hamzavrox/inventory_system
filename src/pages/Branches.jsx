import { useEffect, useState } from 'react'
import { Plus, Trash2, GitBranch, MapPin, Phone, BarChart2 } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

export default function Branches() {
  const can = usePerm()
  const [branches,  setBranches]  = useState([])
  const [branchRpt, setBranchRpt] = useState([])
  const [open,      setOpen]      = useState(false)
  const [form,      setForm]      = useState({ name: '', address: '', phone: '' })
  const [toast,     setToast]     = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => Promise.all([window.api.branches.getAll(), window.api.reports.branchSales({})]).then(([b,r]) => { setBranches(b); setBranchRpt(r) }).catch(() => {})
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    await window.api.branches.add({ name: form.name.trim(), address: form.address || null, phone: form.phone || null })
    setForm({ name: '', address: '', phone: '' }); setOpen(false); load()
    showToast('Branch added successfully')
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this branch?')) { await window.api.branches.delete(id); load(); showToast('Branch deleted', 'error') }
  }

  const statsFor = (name) => branchRpt.find(r => r.branch === name)

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Branches</h2>
          <p style={C.subtitle}>{branches.length} branch{branches.length !== 1 ? 'es' : ''}</p>
        </div>
        {can('branches','add') && (
          <button style={C.btn} onClick={() => setOpen(true)}><Plus size={14} /> Add Branch</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {branches.map(b => {
          const stats = statsFor(b.name)
          return (
            <div key={b.id} style={{ ...C.cardP, position: 'relative' }}>
              {can('branches','delete') && (
                <button style={{ ...C.iBtn, position: 'absolute', top: 12, right: 12 }} onClick={() => handleDelete(b.id)}><Trash2 size={13} color="#ef4444" /></button>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GitBranch size={18} color="#00deab" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', margin: 0 }}>{b.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{b.created_at?.slice(0,10)}</p>
                </div>
              </div>
              {b.address && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}><MapPin size={12} color="#94a3b8" style={{ marginTop: 1, flexShrink: 0 }} /><span style={{ fontSize: 12, color: '#64748b' }}>{b.address}</span></div>}
              {b.phone   && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Phone size={12} color="#94a3b8" /><span style={{ fontSize: 12, color: '#64748b' }}>{b.phone}</span></div>}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 8, display: 'flex', gap: 20 }}>
                <div><p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Sales</p><p style={{ fontSize: 15, fontWeight: 700, color: '#00deab', margin: '2px 0 0' }}>{stats?.sales_count ?? 0}</p></div>
                <div><p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Revenue</p><p style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: '2px 0 0' }}>${fmt(stats?.revenue)}</p></div>
              </div>
            </div>
          )
        })}
        {!branches.length && <div style={{ ...C.card, padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '2px dashed #e2e8f0' }}>No branches yet.</div>}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setForm({ name: '', address: '', phone: '' }) }} title="Add Branch">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Branch Name *"><Input placeholder="e.g. Main Branch" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField>
          <FormField label="Address"><Input placeholder="Street, City" value={form.address} onChange={e => f('address', e.target.value)} /></FormField>
          <FormField label="Phone"><Input placeholder="+1 234 567 8900" value={form.phone} onChange={e => f('phone', e.target.value)} /></FormField>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}>Save Branch</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setForm({ name: '', address: '', phone: '' }) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}


