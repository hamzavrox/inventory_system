import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { Search, Printer, Download, RefreshCw } from 'lucide-react'

const FORMATS = ['CODE128', 'EAN13', 'EAN8', 'UPC', 'CODE39', 'ITF14']

export default function Barcode() {
  const [products, setProducts] = useState([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)
  const [mode,     setMode]     = useState('barcode')
  const [format,   setFormat]   = useState('CODE128')
  const [custom,   setCustom]   = useState('')
  const [copies,   setCopies]   = useState(1)
  const [label,    setLabel]    = useState({ showName: true, showPrice: true, showSku: true })

  const barcodeRef = useRef(null)
  const qrRef      = useRef(null)
  const printRef   = useRef(null)

  useEffect(() => {
    window.api.products.getAll().then(setProducts).catch(() => {})
  }, [])

  const value = custom || selected?.barcode || selected?.sku || ''

  useEffect(() => {
    if (!value) return
    if (mode === 'barcode' && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, value, { format, width: 2, height: 60, displayValue: true, fontSize: 12, margin: 8 })
      } catch {}
    }
    if (mode === 'qr' && qrRef.current) {
      QRCode.toCanvas(qrRef.current, value, { width: 180, margin: 2 }).catch(() => {})
    }
  }, [value, mode, format])

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').includes(search)
  )

  const handlePrint = () => {
    if (!value) return
    const getImg = () => {
      if (mode === 'barcode' && barcodeRef.current) {
        const svg = new XMLSerializer().serializeToString(barcodeRef.current)
        return `<img src="data:image/svg+xml;base64,${btoa(svg)}" style="max-width:200px" />`
      } else if (mode === 'qr' && qrRef.current) {
        return `<img src="${qrRef.current.toDataURL()}" style="width:150px" />`
      }
      return ''
    }
    const labelHtml = `
      <div style="display:inline-block;border:1px solid #ddd;padding:8px 12px;margin:4px;text-align:center;font-family:sans-serif">
        ${label.showName  && selected ? `<p style="margin:2px 0;font-size:12px;font-weight:600">${selected.name}</p>` : ''}
        ${label.showPrice && selected ? `<p style="margin:2px 0;font-size:13px;font-weight:bold">$${selected.price?.toFixed(2)}</p>` : ''}
        ${getImg()}
        ${label.showSku ? `<p style="margin:2px 0;font-size:10px;color:#888;font-family:monospace">${value}</p>` : ''}
      </div>`
    const html = `<!DOCTYPE html><html><head><style>body{margin:8px;font-family:sans-serif}</style></head><body>${Array(copies).fill(labelHtml).join('')}</body></html>`
    window.api.print.html(html)
  }

  const handleDownload = () => {
    if (mode === 'barcode' && barcodeRef.current) {
      const blob = new Blob([barcodeRef.current.outerHTML], { type: 'image/svg+xml' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `barcode-${value}.svg`; a.click()
    } else if (mode === 'qr' && qrRef.current) {
      const a = document.createElement('a')
      a.href = qrRef.current.toDataURL(); a.download = `qr-${value}.png`; a.click()
    }
  }

  const inputStyle = {
    width: '100%', border: '1px solid #e2e8f0', borderRadius: 8,
    padding: '7px 10px', fontSize: 13, color: '#334155',
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  const btnStyle = (variant = 'primary') => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? '#00deab' : variant === 'secondary' ? '#f1f5f9' : '#f8fafc',
    color: variant === 'primary' ? '#fff' : '#475569',
  })

  return (
    <div style={{ padding: '20px 24px', display: 'flex', gap: 20, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

      {/* Left - Product Picker */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Barcode Generator</h2>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 30 }}
          />
        </div>

        {/* Product list */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {filtered.map(p => (
            <button key={p.id} onClick={() => { setSelected(p); setCustom('') }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                borderBottom: '1px solid #f1f5f9', background: selected?.id === p.id ? '#ecfdf5' : 'transparent',
                borderLeft: selected?.id === p.id ? '3px solid #00deab' : '3px solid transparent',
                cursor: 'pointer', border: 'none', borderBottom: '1px solid #f1f5f9',
                borderLeft: selected?.id === p.id ? '3px solid #00deab' : '3px solid transparent',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{p.sku || p.barcode || 'No code'}</p>
            </button>
          ))}
          {!filtered.length && (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>No products found</p>
          )}
        </div>
      </div>

      {/* Right - Generator */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0, overflow: 'hidden' }}>

        {/* Controls card */}
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>Mode</p>
              <select value={mode} onChange={e => setMode(e.target.value)} style={selectStyle}>
                <option value="barcode">Barcode</option>
                <option value="qr">QR Code</option>
              </select>
            </div>
            {mode === 'barcode' && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>Format</p>
                <select value={format} onChange={e => setFormat(e.target.value)} style={selectStyle}>
                  {FORMATS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            )}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>Custom Value</p>
              <input placeholder="Override value..." value={custom} onChange={e => setCustom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 5px' }}>Print Copies</p>
              <input type="number" min="1" max="100" value={copies} onChange={e => setCopies(+e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Label options */}
          <div style={{ display: 'flex', gap: 20, paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
            {[['showName', 'Show Name'], ['showPrice', 'Show Price'], ['showSku', 'Show SKU']].map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={label[k]} onChange={e => setLabel(s => ({ ...s, [k]: e.target.checked }))} />
                {lbl}
              </label>
            ))}
          </div>
        </div>

        {/* Preview card */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          padding: '24px',
        }}>
          {!value ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>Select a product or enter a custom value to generate</p>
          ) : (
            <>
              {/* Hidden print template */}
              <div ref={printRef} style={{ display: 'none' }}>
                {label.showName  && selected && <p>{selected.name}</p>}
                {label.showPrice && selected && <p className="price">${selected.price?.toFixed(2)}</p>}
                {mode === 'barcode' ? <svg /> : <img src={qrRef.current?.toDataURL?.()} alt="qr" style={{ width: 100 }} />}
                {label.showSku && <p style={{ fontSize: 10, color: '#888' }}>{value}</p>}
              </div>

              {/* Live preview */}
              <div style={{
                border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {label.showName  && selected && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>{selected.name}</p>}
                {label.showPrice && selected && <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#00deab' }}>${selected.price?.toFixed(2)}</p>}
                {mode === 'barcode' ? <svg ref={barcodeRef} /> : <canvas ref={qrRef} />}
                {label.showSku && <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{value}</p>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePrint} style={btnStyle('primary')}>
                  <Printer size={14} /> Print {copies > 1 ? `×${copies}` : ''}
                </button>
                <button onClick={handleDownload} style={btnStyle('secondary')}>
                  <Download size={14} /> Download
                </button>
                <button onClick={() => { setSelected(null); setCustom('') }} style={btnStyle('ghost')}>
                  <RefreshCw size={14} /> Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


