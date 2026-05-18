import { useEffect, useState } from 'react'
import { Plus, Trash2, Tag, Percent, DollarSign, CheckCircle, XCircle, Ticket, TrendingDown, Clock, Hash } from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Btn } from '../components/FormField'
import { C, fmt } from '../utils/pageStyles'
import { usePerm } from '../context/UserContext'
import Toast from '../components/Toast'

const emptyForm = { code: '', type: 'percent', value: '', min_amount: '', expires_at: '' }

export default function Discounts() {
  const can = usePerm()
  const [discounts,  setDiscounts]  = useState([])
  const [open,       setOpen]       = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [testCode,   setTestCode]   = useState('')
  const [testAmt,    setTestAmt]    = useState('')
  const [testResult, setTestResult] = useState(null)
  const [toast,      setToast]      = useState({ msg: '', type: 'success' })
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const load = () => window.api.discounts.getAll().then(setDiscounts).catch(() => {})
  useEffect(() => { load() }, [])
  const f = (k, v) => setForm(s => ({ ...s, [k]: v }))

  const handleSave = async () => {
    if (!form.value || +form.value <= 0) return
    await window.api.discounts.add({ code: form.code.trim() || null, type: form.type, value: +form.value, min_amount: +form.min_amount || 0, expires_at: form.expires_at || null })
    setForm(emptyForm); setOpen(false); load()
    showToast('Discount created successfully')
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this discount permanently?')) {
      await window.api.discounts.delete(id); load(); showToast('Discount deleted', 'error')
    }
  }

  const handleTest = async () => {
    if (!testCode.trim() || !testAmt) return
    const res = await window.api.discounts.validate({ code: testCode.trim(), amount: +testAmt })
    setTestResult(res)
  }

  const isExpired = (d) => d.expires_at && new Date(d.expires_at) < new Date()

  const active  = discounts.filter(d => !isExpired(d)).length
  const expired = discounts.filter(d => isExpired(d)).length

  const stats = [
    { label: 'Total',   value: discounts.length, icon: Ticket,       bg: '#ecfdf5', color: '#00deab' },
    { label: 'Active',  value: active,            icon: CheckCircle,  bg: '#ecfdf5', color: '#059669' },
    { label: 'Expired', value: expired,           icon: Clock,        bg: '#fef9c3', color: '#ca8a04' },
    { label: 'Fixed $', value: discounts.filter(d => d.type === 'fixed').length, icon: DollarSign, bg: '#fdf2f8', color: '#9333ea' },
  ]

  return (
    <div style={{ ...C.page, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Discounts & Coupons</h2>
          <p style={C.subtitle}>{active} active · {expired} expired</p>
        </div>
        {can('discounts', 'add') && (
          <button style={C.btn} onClick={() => setOpen(true)}><Plus size={14} /> Add Discount</button>
        )}
      </div>

      {/* Stats Row */}
      <div style={C.g4}>
        {stats.map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} style={{ ...C.cardP, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, minHeight: 0 }}>

        {/* Discount Cards Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!discounts.length ? (
            <div style={{ ...C.cardP, textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '60px 16px', border: '2px dashed #e2e8f0', background: '#fafafa' }}>
              <Ticket size={32} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0 }}>No discounts yet. Create your first coupon.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
              {discounts.map(d => {
                const expired = isExpired(d)
                const isPercent = d.type === 'percent'
                return (
                  <div key={d.id} style={{
                    background: '#fff', border: `1px solid ${expired ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center',
                    gap: 12, opacity: expired ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                    borderLeft: `4px solid ${expired ? '#f87171' : isPercent ? '#00deab' : '#059669'}`
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isPercent ? '#ecfdf5' : '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isPercent ? <Percent size={17} color="#00deab" /> : <DollarSign size={17} color="#059669" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {d.code
                          ? <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, letterSpacing: 1 }}>{d.code}</span>
                          : <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No code</span>
                        }
                        <span style={{ fontSize: 13, fontWeight: 600, color: isPercent ? '#00deab' : '#059669' }}>
                          {isPercent ? `${d.value}% off` : `$${fmt(d.value)} off`}
                        </span>
                        {expired && <span style={C.badge('#fef2f2', '#dc2626')}>Expired</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                        {d.min_amount > 0 && (
                          <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <TrendingDown size={10} /> Min: ${fmt(d.min_amount)}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {d.expires_at ? d.expires_at : 'No expiry'}
                        </span>
                      </div>
                    </div>
                    {can('discounts', 'delete') && (
                      <button style={{ ...C.iBtn, background: '#fef2f2', borderRadius: 8, padding: '6px 8px' }} onClick={() => handleDelete(d.id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Coupon Tester */}
          <div style={C.cardP}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={14} color="#00deab" />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>Test Coupon</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FormField label="Coupon Code">
                <Input placeholder="Enter code..." value={testCode} onChange={e => { setTestCode(e.target.value); setTestResult(null) }} />
              </FormField>
              <FormField label="Order Amount ($)">
                <Input type="number" min="0" placeholder="0.00" value={testAmt} onChange={e => { setTestAmt(e.target.value); setTestResult(null) }} />
              </FormField>
              <button style={{ ...C.btn, width: '100%', justifyContent: 'center' }} onClick={handleTest}>
                <Tag size={13} /> Test Coupon
              </button>
              {testResult && (
                <div style={{ background: testResult.valid ? '#ecfdf5' : '#fef2f2', border: `1px solid ${testResult.valid ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: testResult.valid ? 6 : 0 }}>
                    {testResult.valid ? <CheckCircle size={14} color="#059669" /> : <XCircle size={14} color="#dc2626" />}
                    <span style={{ fontSize: 13, fontWeight: 600, color: testResult.valid ? '#059669' : '#dc2626' }}>
                      {testResult.valid ? 'Valid Coupon!' : 'Invalid Coupon'}
                    </span>
                  </div>
                  {testResult.valid && (
                    <div style={{ fontSize: 12, color: '#059669', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>Discount: <strong>${fmt(testResult.discount)}</strong></span>
                      <span>After discount: <strong>${fmt(+testAmt - testResult.discount)}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 12, marginTop: 0 }}>Summary</p>
            {[
              { label: 'Active',       value: active,                                          color: '#059669' },
              { label: 'Expired',      value: expired,                                         color: '#dc2626' },
              { label: 'Percent Type', value: discounts.filter(d => d.type === 'percent').length, color: '#00deab' },
              { label: 'Fixed Amount', value: discounts.filter(d => d.type === 'fixed').length,   color: '#9333ea' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={open} onClose={() => { setOpen(false); setForm(emptyForm) }} title="Add Discount / Coupon">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Discount Type">
            <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              {[['percent', '% Percent'], ['fixed', '$ Fixed Amount']].map(([v, l]) => (
                <button key={v} onClick={() => f('type', v)} style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', background: form.type === v ? '#00deab' : '#fff', color: form.type === v ? '#fff' : '#475569', transition: 'all .15s' }}>{l}</button>
              ))}
            </div>
          </FormField>
          <div style={C.g2}>
            <FormField label={form.type === 'percent' ? 'Discount % *' : 'Amount ($) *'}>
              <Input type="number" min="0.01" step="0.01" placeholder={form.type === 'percent' ? '10' : '5.00'} value={form.value} onChange={e => f('value', e.target.value)} autoFocus />
            </FormField>
            <FormField label="Min Order ($)">
              <Input type="number" min="0" step="0.01" placeholder="0 = no min" value={form.min_amount} onChange={e => f('min_amount', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Coupon Code (optional)">
            <Input placeholder="e.g. SUMMER20" value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} />
          </FormField>
          <FormField label="Expiry Date (optional)">
            <Input type="date" value={form.expires_at} onChange={e => f('expires_at', e.target.value)} />
          </FormField>
          {form.value > 0 && (
            <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#00deab' }}>
              <strong>Preview:</strong> {form.type === 'percent' ? `${form.value}% off` : `$${fmt(form.value)} off`}
              {form.min_amount > 0 ? ` on orders over $${fmt(form.min_amount)}` : ''}
              {form.expires_at ? ` · Expires ${form.expires_at}` : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn onClick={handleSave}><Plus size={14} /> Create Discount</Btn>
            <Btn variant="secondary" onClick={() => { setOpen(false); setForm(emptyForm) }}>Cancel</Btn>
          </div>
        </div>
      </Modal>

      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  )
}


