import { useEffect, useState } from 'react'
import { Plus, Pencil, Shield, UserCheck, UserX, ClipboardList, Check, Key, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'

import Toast from '../components/Toast'

const MODULES = ['dashboard','pos','products','categories','brands','inventory','customers','accounting','discounts','branches','shops','reports','users','sync']
const emptyUser = { name: '', username: '', password: '', role_id: '', branch_id: '', active: 1 }
const emptyRole = { name: '', permissions: {} }

function PermMatrix({ permissions, onChange }) {
  const perms = typeof permissions === 'string' ? (() => { try { return JSON.parse(permissions || '{}') } catch { return {} } })() : (permissions || {})
  if (perms.all) return <p style={{ fontSize: 13, color: '#059669', fontWeight: 500, padding: '8px 0' }}>✓ Full Admin Access — all permissions granted</p>
  const toggle = (mod, right) => { const cur = perms[mod]||[]; onChange({ ...perms, [mod]: cur.includes(right) ? cur.filter(r=>r!==right) : [...cur,right] }) }
  const allOn  = (mod) => onChange({ ...perms, [mod]: ['view','add','edit','delete'] })
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...C.table, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...C.th(), paddingRight: 16 }}>Module</th>
            {['view','add','edit','delete'].map(r => <th key={r} style={{ ...C.th(), textAlign: 'center' }}>{r}</th>)}
            <th style={{ ...C.th(), textAlign: 'center' }}>All</th>
          </tr>
        </thead>
        <tbody>
          {MODULES.map(mod => {
            const cur = perms[mod] || []
            return (
              <tr key={mod} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                <td style={{ ...C.td(), fontWeight: 500, color: '#334155', textTransform: 'capitalize', paddingRight: 16 }}>{mod}</td>
                {['view','add','edit','delete'].map(right => (
                  <td key={right} style={{ ...C.td(), textAlign: 'center' }}>
                    <input type="checkbox" checked={cur.includes(right)} onChange={() => toggle(mod, right)} style={{ accentColor: '#4f46e5' }} />
                  </td>
                ))}
                <td style={{ ...C.td(), textAlign: 'center' }}>
                  <button onClick={() => allOn(mod)} style={{ ...C.iBtn, fontSize: 11, color: '#4f46e5', fontWeight: 500 }}>All</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function UsersTab({ roles, branches, showToast }) {
  const can  = usePerm()
  const [users,  setUsers]  = useState([])
  const [open,   setOpen]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(emptyUser)

  const load = () => window.api.users.getAll().then(setUsers).catch(err => console.error('users:getAll error', err))
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return
    try {
      if (editId) {
        await window.api.users.update(editId, { name: form.name, username: form.username, role_id: form.role_id || null, branch_id: form.branch_id || null, active: form.active })
      } else {
        if (!form.password.trim()) return alert('Password is required.')
        await window.api.users.add({ name: form.name, username: form.username, password: form.password, role_id: form.role_id || null, branch_id: form.branch_id || null })
      }
      setForm(emptyUser); setEditId(null); setOpen(false); load()
      if (showToast) showToast(editId ? 'User updated successfully' : 'User created successfully')
    } catch (err) {
      alert('Error saving user: ' + (err?.message || err))
    }
  }

  const handleEdit = (u) => { setEditId(u.id); setForm({ name: u.name, username: u.username, password: '', role_id: u.role_id||'', branch_id: u.branch_id||'', active: u.active }); setOpen(true) }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This action cannot be undone.`)) return
    try {
      await window.api.users.delete(id)
      load()
      if (showToast) showToast('User deleted', 'error')
    } catch (err) {
      alert('Error deleting user: ' + (err?.message || err))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {can('users','add') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={C.btn} onClick={() => { setOpen(true); setEditId(null); setForm(emptyUser) }}><Plus size={14} /> Add User</button>
        </div>
      )}
      <div style={C.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={C.table}>
            <thead><tr>{['Name','Username','Role','Branch','Status','Actions'].map(h => <th key={h} style={C.th(['Status','Actions'].includes(h) ? false : false)}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                  <td style={C.tdb()}>{u.name}</td>
                  <td style={{ ...C.td(), fontFamily: 'monospace', fontSize: 12 }}>{u.username}</td>
                  <td style={C.td()}>{u.role_name ? <span style={C.badge('#eef2ff','#4f46e5')}>{u.role_name}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}</td>
                  <td style={{ ...C.td(), fontSize: 12 }}>{u.branch_name || '—'}</td>
                  <td style={{ ...C.td(), textAlign: 'center' }}>
                    {u.active
                      ? <span style={{ ...C.badge('#ecfdf5','#059669'), display: 'inline-flex', alignItems: 'center', gap: 4 }}><UserCheck size={11} /> Active</span>
                      : <span style={{ ...C.badge('#fef2f2','#dc2626'), display: 'inline-flex', alignItems: 'center', gap: 4 }}><UserX size={11} /> Inactive</span>}
                  </td>
                  <td style={{ ...C.td(), textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {can('users','edit') && <button style={C.iBtn} onClick={() => handleEdit(u)}><Pencil size={14} color="#6366f1" /></button>}
                      {can('users','delete') && <button style={C.iBtn} onClick={() => handleDelete(u.id, u.name)}><Trash2 size={14} color="#dc2626" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); setForm(emptyUser) }} title={editId ? 'Edit User' : 'Add User'} width="max-w-lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={C.g2}>
            <FormField label="Full Name *"><Input placeholder="John Smith" value={form.name} onChange={e => f('name', e.target.value)} autoFocus /></FormField>
            <FormField label="Username *"><Input placeholder="johnsmith" value={form.username} onChange={e => f('username', e.target.value)} /></FormField>
          </div>
          {!editId && <FormField label="Password *"><Input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => f('password', e.target.value)} /></FormField>}
          <div style={C.g2}>
            <FormField label="Role"><Select value={form.role_id} onChange={e => f('role_id', e.target.value)}><option value="">— No Role —</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></FormField>
            <FormField label="Branch"><Select value={form.branch_id} onChange={e => f('branch_id', e.target.value)}><option value="">— No Branch —</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></FormField>
          </div>
          {editId && <FormField label="Status"><Select value={form.active} onChange={e => f('active', +e.target.value)}><option value={1}>Active</option><option value={0}>Inactive</option></Select></FormField>}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}><Check size={14} /> {editId ? 'Update User' : 'Create User'}</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setEditId(null); setForm(emptyUser) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function RolesTab({ onRoleChange, showToast }) {
  const can  = usePerm()
  const [roles,  setRoles]  = useState([])
  const [open,   setOpen]   = useState(false)
  const [editId, setEditId] = useState(null)
  const [form,   setForm]   = useState(emptyRole)

  const load = () => window.api.roles.getAll().then(setRoles).catch(() => {})
  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (editId) await window.api.roles.update(editId, { name: form.name, permissions: form.permissions })
    else        await window.api.roles.add({ name: form.name, permissions: form.permissions })
    setForm(emptyRole); setEditId(null); setOpen(false); load()
    if (onRoleChange) onRoleChange()
    if (showToast) showToast(editId ? 'Role updated successfully' : 'Role created successfully')
  }

  const handleEdit = (r) => {
    console.log('Editing role:', r)
    setEditId(r.id)
    setForm({ 
      name: r.name, 
      permissions: typeof r.permissions === 'string' ? 
        (() => { try { return JSON.parse(r.permissions || '{}') } catch { return {} } })() : 
        (r.permissions || {}) 
    })
    setOpen(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete role "${name}"? This action cannot be undone.`)) return
    try {
      await window.api.roles.delete(id)
      load()
      if (onRoleChange) onRoleChange()
      if (showToast) showToast('Role deleted', 'error')
    } catch (err) {
      alert('Error deleting role: ' + (err?.message || err))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {can('users','add') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={C.btn} onClick={() => { setOpen(true); setEditId(null); setForm(emptyRole) }}><Plus size={14} /> Add Role</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {roles.map(r => {
          const perms    = typeof r.permissions === 'string' ? (() => { try { return JSON.parse(r.permissions || '{}') } catch { return {} } })() : (r.permissions || {})
          const isAdmin  = perms.all
          const modCount = isAdmin ? MODULES.length : Object.keys(perms).filter(k => perms[k]?.length > 0).length
          return (
            <div key={r.id} style={{ ...C.cardP, position: 'relative', paddingTop: 40 }}>
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 10 }}>
                {can('users','edit') && <button style={C.iBtn} onClick={() => handleEdit(r)}><Pencil size={13} color="#6366f1" /></button>}
                {can('users','delete') && <button style={C.iBtn} onClick={() => handleDelete(r.id, r.name)}><Trash2 size={13} color="#dc2626" /></button>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isAdmin ? '#fffbeb' : '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isAdmin ? <Key size={16} color="#d97706" /> : <Shield size={16} color="#4f46e5" />}
                </div>
                <div style={{ flex: 1, paddingRight: 60 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{isAdmin ? 'Full access' : `${modCount} module${modCount!==1?'s':''}`}</p>
                </div>
              </div>
              {!isAdmin && modCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.entries(perms).filter(([,v]) => v?.length > 0).slice(0,5).map(([mod]) => (
                    <span key={mod} style={C.badge('#f1f5f9','#475569')}>{mod}</span>
                  ))}
                  {modCount > 5 && <span style={{ fontSize: 11, color: '#94a3b8' }}>+{modCount-5} more</span>}
                </div>
              )}
              {!isAdmin && modCount === 0 && (
                <div style={{ padding: '8px 0', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                  No permissions assigned
                </div>
              )}
            </div>
          )
        })}
        {!roles.length && <div style={{ ...C.cardP, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '2px dashed #e2e8f0', padding: '32px 16px' }}>No roles yet.</div>}
      </div>
      <Modal open={open} onClose={() => { setOpen(false); setEditId(null); setForm(emptyRole) }} title={editId ? 'Edit Role' : 'Add Role'} width="max-w-2xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Role Name *"><Input placeholder="e.g. Cashier, Manager" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} autoFocus /></FormField>
          <div>
            <p style={C.label}>Permissions</p>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', maxHeight: 280, overflowY: 'auto' }}>
              <PermMatrix permissions={form.permissions} onChange={p => setForm(s => ({ ...s, permissions: p }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}><Check size={14} /> {editId ? 'Update Role' : 'Create Role'}</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setEditId(null); setForm(emptyRole) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function LogsTab() {
  const [logs, setLogs] = useState([])
  useEffect(() => { window.api.logs.getAll().then(setLogs).catch(() => {}) }, [])
  return (
    <div style={C.card}>
      <div style={{ overflowX: 'auto' }}>
        <table style={C.table}>
          <thead><tr>{['User','Action','Module','Detail','Date'].map(h => <th key={h} style={C.th()}>{h}</th>)}</tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background='#f8fafc'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                <td style={C.tdb()}>{l.user_name || 'System'}</td>
                <td style={{ ...C.td(), textTransform: 'capitalize' }}>{l.action}</td>
                <td style={C.td()}>{l.module ? <span style={C.badge('#f1f5f9','#475569')}>{l.module}</span> : '—'}</td>
                <td style={{ ...C.td(), fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detail || '—'}</td>
                <td style={{ ...C.td(), fontSize: 12, whiteSpace: 'nowrap' }}>{l.created_at?.slice(0,16).replace('T',' ')}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No activity logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Users() {
  const [tab,      setTab]      = useState('users')
  const [roles,    setRoles]    = useState([])
  const [branches, setBranches] = useState([])
  const [toast,    setToast]    = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const loadRolesAndBranches = () => {
    Promise.all([window.api.roles.getAll(), window.api.branches.getAll()]).then(([r,b]) => { setRoles(r); setBranches(b) }).catch(() => {})
  }

  useEffect(() => { loadRolesAndBranches() }, [])
  useEffect(() => { loadRolesAndBranches() }, [tab]) // Reload when switching tabs

  const TABS = [{ key:'users',label:'Users',icon:UserCheck },{ key:'roles',label:'Roles',icon:Shield },{ key:'logs',label:'Activity Logs',icon:ClipboardList }]

  return (
    <div style={C.page}>
      <div>
        <h2 style={C.title}>Users & Roles</h2>
        <p style={C.subtitle}>Manage access control and activity</p>
      </div>
      <div style={C.tabBar}>
        {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={C.tab(tab===t.key)}><t.icon size={14} />{t.label}</button>)}
      </div>
      {tab === 'users' && <UsersTab roles={roles} branches={branches} showToast={showToast} />}
      {tab === 'roles' && <RolesTab onRoleChange={loadRolesAndBranches} showToast={showToast} />}
      {tab === 'logs'  && <LogsTab />}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}
