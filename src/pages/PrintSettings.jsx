import { useState } from 'react'
import { Printer, Eye, Save } from 'lucide-react'
import { FormField, Input, Select, Btn } from '../components/FormField'
import { C } from '../utils/pageStyles'

const LS_KEY  = 'print_settings'
const DEFAULTS = { businessName: 'FloriManager', businessPhone: '', businessAddress: '', paperSize: '80mm', showLogo: true, showTax: true, showChange: true, footerText: 'Thank you for your purchase!', copies: 1 }

function load() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY)||'{}') } } catch { return DEFAULTS } }

export default function PrintSettings() {
  const [cfg,     setCfg]     = useState(load)
  const [saved,   setSaved]   = useState(false)
  const [preview, setPreview] = useState(false)
  const f = (k, v) => setCfg(s => ({ ...s, [k]: v }))

  const handleSave = () => { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const handleTestPrint = () => {
    const w = cfg.paperSize === '58mm' ? '200px' : cfg.paperSize === 'A4' ? '794px' : '280px'
    const html = `<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:12px;width:${w};margin:0 auto;padding:10px}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between}</style></head><body><div class="center bold" style="font-size:14px">${cfg.businessName}</div>${cfg.businessPhone ? `<div class="center">${cfg.businessPhone}</div>` : ''}${cfg.businessAddress ? `<div class="center">${cfg.businessAddress}</div>` : ''}<div class="line"></div><div class="row"><span>Invoice:</span><span>INV-0001</span></div><div class="row"><span>Date:</span><span>${new Date().toLocaleDateString()}</span></div><div class="line"></div><div class="row"><span>Sample Product x2</span><span>$20.00</span></div><div class="line"></div><div class="row"><span>Subtotal</span><span>$20.00</span></div>${cfg.showTax ? '<div class="row"><span>Tax (5%)</span><span>$1.00</span></div>' : ''}<div class="row bold"><span>TOTAL</span><span>$21.00</span></div>${cfg.showChange ? '<div class="row"><span>Change</span><span>$4.00</span></div>' : ''}<div class="line"></div><div class="center">${cfg.footerText}</div></body></html>`
    window.api.print.html(html)
  }

  const Toggle = ({ k, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
      <div onClick={() => f(k, !cfg[k])} style={{ width: 40, height: 22, borderRadius: 99, background: cfg[k] ? '#00deab' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: cfg[k] ? 'translateX(21px)' : 'translateX(3px)' }} />
      </div>
    </div>
  )

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h2 style={C.title}>Print Settings</h2>
          <p style={C.subtitle}>Configure receipt and invoice printing</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={C.btn2} onClick={() => setPreview(s => !s)}><Eye size={14} /> {preview ? 'Hide' : 'Preview'}</button>
          <button style={C.btn2} onClick={handleTestPrint}><Printer size={14} /> Test Print</button>
          <button style={C.btn} onClick={handleSave}><Save size={14} /> {saved ? 'Saved ✔' : 'Save Settings'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 260px' : '1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Business info */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 14 }}>Business Information</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Business Name"><Input value={cfg.businessName} onChange={e => f('businessName', e.target.value)} /></FormField>
              <div style={C.g2}>
                <FormField label="Phone"><Input placeholder="+1 234 567 8900" value={cfg.businessPhone} onChange={e => f('businessPhone', e.target.value)} /></FormField>
                <FormField label="Address"><Input placeholder="Street, City" value={cfg.businessAddress} onChange={e => f('businessAddress', e.target.value)} /></FormField>
              </div>
            </div>
          </div>

          {/* Paper & layout */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 14 }}>Paper & Layout</p>
            <div style={C.g2}>
              <FormField label="Paper Size">
                <Select value={cfg.paperSize} onChange={e => f('paperSize', e.target.value)}>
                  <option value="58mm">58mm (Small POS)</option>
                  <option value="80mm">80mm (Standard POS)</option>
                  <option value="A4">A4 (Full Invoice)</option>
                </Select>
              </FormField>
              <FormField label="Print Copies"><Input type="number" min="1" max="5" value={cfg.copies} onChange={e => f('copies', +e.target.value)} /></FormField>
            </div>
            <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <Toggle k="showLogo"   label="Show Business Name / Logo" />
              <Toggle k="showTax"    label="Show Tax Line" />
              <Toggle k="showChange" label="Show Change Due" />
            </div>
          </div>

          {/* Footer */}
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 14 }}>Receipt Footer</p>
            <FormField label="Footer Message"><Input placeholder="Thank you for your purchase!" value={cfg.footerText} onChange={e => f('footerText', e.target.value)} /></FormField>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div style={C.cardP}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 14 }}>Receipt Preview</p>
            <div style={{ border: '1px dashed #e2e8f0', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 11, maxWidth: cfg.paperSize === '58mm' ? 160 : 220, margin: '0 auto' }}>
              {cfg.showLogo && <p style={{ textAlign: 'center', fontWeight: 700, margin: '0 0 4px' }}>{cfg.businessName}</p>}
              {cfg.businessPhone   && <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 2px' }}>{cfg.businessPhone}</p>}
              {cfg.businessAddress && <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 4px' }}>{cfg.businessAddress}</p>}
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Invoice:</span><span>INV-0001</span></div>
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Item x2</span><span>$20.00</span></div>
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>$20.00</span></div>
              {cfg.showTax    && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Tax</span><span>$1.00</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>TOTAL</span><span>$21.00</span></div>
              {cfg.showChange && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Change</span><span>$4.00</span></div>}
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />
              <p style={{ textAlign: 'center', color: '#64748b', margin: 0 }}>{cfg.footerText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


