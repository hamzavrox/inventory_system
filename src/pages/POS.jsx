import { useEffect, useRef, useState } from 'react'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  CreditCard, Printer, RotateCcw, X, Check, Tag, Eye, Download
} from 'lucide-react'
import Modal from '../components/Modal'
import { FormField, Input, Select, Btn } from '../components/FormField'

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (n) => Number(n || 0).toFixed(2)

const styles = {
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  section: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 },
  input: { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  button: { padding: '8px 12px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
  badge: (bg, color) => ({ background: bg, color, fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, display: 'inline-block' }),
}

function InvoicePrint({ sale, items, customer }) {
  return (
    <div id="invoice-print" style={{ fontFamily: 'monospace', fontSize: 13, width: 320, padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <strong style={{ fontSize: 16 }}>ðŸŒ¸ FloriManager</strong>
        <p style={{ margin: 0, fontSize: 11, color: '#666' }}>Invoice Receipt</p>
      </div>
      <hr />
      <p style={{ margin: '4px 0' }}><strong>Invoice:</strong> {sale.invoice_no}</p>
      <p style={{ margin: '4px 0' }}><strong>Date:</strong> {sale.created_at?.slice(0, 16).replace('T', ' ')}</p>
      {customer && <p style={{ margin: '4px 0' }}><strong>Customer:</strong> {customer.name}</p>}
      <hr />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Item</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx}>
              <td>{i.name}</td>
              <td style={{ textAlign: 'right' }}>{i.qty}</td>
              <td style={{ textAlign: 'right' }}>${fmt(i.price)}</td>
              <td style={{ textAlign: 'right' }}>${fmt(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <p style={{ margin: '3px 0', textAlign: 'right' }}>Subtotal: <strong>${fmt(sale.subtotal)}</strong></p>
      {sale.discount > 0 && <p style={{ margin: '3px 0', textAlign: 'right', color: '#059669' }}>Discount: -${fmt(sale.discount)}</p>}
      {sale.tax > 0 && <p style={{ margin: '3px 0', textAlign: 'right' }}>Tax: +${fmt(sale.tax)}</p>}
      <p style={{ margin: '3px 0', textAlign: 'right', fontSize: 15 }}>Total: <strong>${fmt(sale.total)}</strong></p>
      <p style={{ margin: '3px 0', textAlign: 'right' }}>Paid: ${fmt(sale.paid)}</p>
      {sale.change_due > 0 && <p style={{ margin: '3px 0', textAlign: 'right' }}>Change: ${fmt(sale.change_due)}</p>}
      <hr />
      <p style={{ textAlign: 'center', fontSize: 11, color: '#888', marginTop: 8 }}>Thank you for your purchase!</p>
    </div>
  )
}

// â”€â”€â”€ Cart Item Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CartRow({ item, onQty, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9', marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>${fmt(item.price)} each</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onQty(item.cart_key, -1)}
          style={{ ...styles.button, width: 24, height: 24, padding: 0, background: '#f1f5f9', color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
          <Minus size={12} style={{ margin: 'auto' }} />
        </button>
        <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.qty}</span>
        <button onClick={() => onQty(item.cart_key, 1)}
          style={{ ...styles.button, width: 24, height: 24, padding: 0, background: '#f1f5f9', color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
          <Plus size={12} style={{ margin: 'auto' }} />
        </button>
      </div>
      <span style={{ width: 60, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#00deab' }}>${fmt(item.total)}</span>
      <button onClick={() => onRemove(item.cart_key)}
        style={{ ...styles.button, padding: '4px', color: '#dc2626', background: 'none', marginLeft: 4 }}
        onMouseEnter={e => e.currentTarget.style.color = '#991b1b'}
        onMouseLeave={e => e.currentTarget.style.color = '#dc2626'}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// â”€â”€â”€ POS Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function POS() {
  const [tab, setTab] = useState('pos')       // 'pos' | 'history'
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [taxPct, setTaxPct] = useState(0)
  const [coupon, setCoupon] = useState('')
  const [couponMsg, setCouponMsg] = useState('')
  const [appliedMinAmount, setAppliedMinAmount] = useState(0)
  const [discounts, setDiscounts] = useState([])
  const [payModal, setPayModal] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')
  const [paid, setPaid] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [sales, setSales] = useState([])
  const [returnModal, setReturnModal] = useState(null)
  const [returnReason, setReturnReason] = useState('')
  const [viewInvoice, setViewInvoice] = useState(null)
  const [varSelectModal, setVarSelectModal] = useState(null)
  const searchRef = useRef(null)
  const scanBufferRef = useRef('')
  const scanTimerRef = useRef(null)

  useEffect(() => {
    Promise.all([window.api.products.getAll(), window.api.customers.getAll(), window.api.discounts.getAll()])
      .then(([p, c, d]) => { setProducts(p); setCustomers(c); setDiscounts(d) }).catch(() => { })
  }, [])

  // Barcode scanner listener
  useEffect(() => {
    const handleScan = (e) => {
      if (tab !== 'pos') return
      
      // Ignore if typing in other inputs
      if (e.target.tagName === 'INPUT' && e.target !== searchRef.current) return
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return

      // Scanner sends characters fast + Enter
      if (e.key === 'Enter' && scanBufferRef.current.length > 0) {
        const scanned = scanBufferRef.current.trim()
        scanBufferRef.current = ''
        
        // Find product by barcode or SKU
        const product = products.find(p => 
          p.barcode === scanned || p.sku === scanned
        )
        
        if (product) {
          handleProductClick(product)
          setSearch('') // Clear search
        }
        return
      }

      // Accumulate characters (scanner types fast)
      if (e.key.length === 1) {
        scanBufferRef.current += e.key
        clearTimeout(scanTimerRef.current)
        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = '' // Reset if typing is slow (human)
        }, 100)
      }
    }

    window.addEventListener('keydown', handleScan)
    return () => {
      window.removeEventListener('keydown', handleScan)
      clearTimeout(scanTimerRef.current)
    }
  }, [tab, products])

  const loadSales = () => window.api.sales.getAll({ limit: 100000 }).then(setSales).catch(() => { })
  useEffect(() => { if (tab === 'history') loadSales() }, [tab])

  const handleViewInvoice = async (s) => {
    const data = await window.api.sales.getById(s.id)
    setViewInvoice({ sale: data, items: data.items || [] })
  }

  const buildInvoiceHtml = (sale, items) => {
    const rows = items.map(i => `<tr><td>${i.name}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">$${fmt(i.price)}</td><td style="text-align:right">$${fmt(i.total)}</td></tr>`).join('')
    return `<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:12px;width:300px;margin:0 auto;padding:12px}hr{border:none;border-top:1px dashed #000;margin:6px 0}.center{text-align:center}table{width:100%;border-collapse:collapse}td,th{padding:2px 4px}th{text-align:left}th:not(:first-child),td:not(:first-child){text-align:right}.right{text-align:right}.bold{font-weight:bold}</style></head><body><div class="center bold" style="font-size:15px">ðŸŒ¸ FloriManager</div><div class="center" style="font-size:11px;color:#666">Invoice Receipt</div><hr/><p><b>Invoice:</b> ${sale.invoice_no}</p><p><b>Date:</b> ${sale.created_at?.slice(0,16).replace('T',' ')}</p>${sale.customer_name ? `<p><b>Customer:</b> ${sale.customer_name}</p>` : ''}<hr/><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><hr/><p class="right">Subtotal: <b>$${fmt(sale.subtotal)}</b></p>${sale.discount > 0 ? `<p class="right" style="color:green">Discount: -$${fmt(sale.discount)}</p>` : ''}${sale.tax > 0 ? `<p class="right">Tax: +$${fmt(sale.tax)}</p>` : ''}<p class="right bold" style="font-size:14px">Total: $${fmt(sale.total)}</p><p class="right">Paid: $${fmt(sale.paid)}</p>${sale.change_due > 0 ? `<p class="right">Change: $${fmt(sale.change_due)}</p>` : ''}<hr/><div class="center" style="font-size:11px;color:#888">Thank you for your purchase!</div></body></html>`
  }

  // â”€â”€ Add to cart (with variant check) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleProductClick = async (p) => {
    if (p.quantity <= 0) return
    const vars = await window.api.variants.getByProduct(p.id)
    if (vars.length > 0) {
      setVarSelectModal({ product: p, variants: vars })
    } else {
      addToCart(p)
    }
  }

  const addVariantToCart = (product, variant) => {
    const key = `${product.id}_${variant.id}`
    setCart(prev => {
      const existing = prev.find(i => i.cart_key === key)
      if (existing) {
        if (existing.qty >= variant.quantity) return prev
        return prev.map(i => i.cart_key === key ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i)
      }
      return [...prev, { cart_key: key, product_id: product.id, variant_id: variant.id, name: `${product.name} - ${variant.name}`, price: variant.price || product.price, qty: 1, total: variant.price || product.price }]
    })
    setVarSelectModal(null)
  }

  const addToCart = (product) => {
    if (product.quantity <= 0) return
    const key = product.id
    setCart(prev => {
      const existing = prev.find(i => i.cart_key === key)
      if (existing) {
        if (existing.qty >= product.quantity) return prev
        return prev.map(i => i.cart_key === key ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i)
      }
      return [...prev, { cart_key: key, product_id: product.id, variant_id: null, name: product.name, price: product.price, qty: 1, total: product.price }]
    })
  }

  const changeQty = (cartKey, delta) => {
    setCart(prev => {
      const updated = prev
        .map(i => i.cart_key === cartKey
          ? { ...i, qty: i.qty + delta, total: (i.qty + delta) * i.price }
          : i)
        .filter(i => i.qty > 0)
      const newSubtotal = updated.reduce((s, i) => s + i.total, 0)
      if (discount > 0 && appliedMinAmount > 0 && newSubtotal < appliedMinAmount) {
        setDiscount(0)
        setCoupon('')
        setCouponMsg('')
        setAppliedMinAmount(0)
      }
      return updated
    })
  }

  const removeFromCart = (cartKey) => {
    setCart(prev => {
      const updated = prev.filter(i => i.cart_key !== cartKey)
      const newSubtotal = updated.reduce((s, i) => s + i.total, 0)
      if (discount > 0 && appliedMinAmount > 0 && newSubtotal < appliedMinAmount) {
        setDiscount(0)
        setCoupon('')
        setCouponMsg('')
        setAppliedMinAmount(0)
      }
      return updated
    })
  }
  const clearCart = () => { setCart([]); setCustomer(null); setDiscount(0); setTaxPct(0); setCoupon(''); setCouponMsg(''); setAppliedMinAmount(0) }

  // â”€â”€ Totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const subtotal = cart.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxPct / 100)
  const total = subtotal - discount + taxAmount
  const changeDue = (parseFloat(paid) || 0) - total

  // â”€â”€ Coupon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const applyCoupon = async () => {
    if (!coupon.trim()) return
    const res = await window.api.discounts.validate({ code: coupon.trim(), amount: subtotal })
    if (res.valid) {
      setDiscount(res.discount)
      setCouponMsg(`✔ Coupon applied - $${fmt(res.discount)} off`)
      const selected = discounts.find(d => (d.code || String(d.id)) === coupon.trim())
      setAppliedMinAmount(selected?.min_amount || 0)
    } else {
      setCouponMsg('✖ Invalid or expired coupon')
      setDiscount(0)
      setAppliedMinAmount(0)
    }
  }

  // â”€â”€ Checkout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCheckout = async () => {
    if (!cart.length) return
    const paidAmt = parseFloat(paid) || 0
    if (payMethod === 'cash' && paidAmt < total) return alert('Paid amount is less than total.')

    const result = await window.api.sales.create({
      customer_id: customer?.id || null,
      items: cart,
      discount,
      tax: taxAmount,
      paid: paidAmt,
      payment_method: payMethod,
    })

    setLastSale(result)
    setReceipt({ sale: { ...result, subtotal, discount, tax: taxAmount, paid: paidAmt }, items: cart, customer })
    setPayModal(false)
    clearCart()
    // Refresh products stock
    window.api.products.getAll().then(setProducts).catch(() => { })
  }

  // â”€â”€ Print receipt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const printReceipt = () => {
    if (!receipt) return
    const { sale, items, customer: cust } = receipt
    const w = '300px'
    const rows = items.map(i => `<tr><td>${i.name}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">$${fmt(i.price)}</td><td style="text-align:right">$${fmt(i.total)}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><style>body{font-family:monospace;font-size:12px;width:${w};margin:0 auto;padding:12px}hr{border:none;border-top:1px dashed #000;margin:6px 0}.center{text-align:center}table{width:100%;border-collapse:collapse}td,th{padding:2px 4px}th{text-align:left}th:not(:first-child){text-align:right}.right{text-align:right}.bold{font-weight:bold}</style></head><body><div class="center bold" style="font-size:15px">ðŸŒ¸ FloriManager</div><div class="center" style="font-size:11px;color:#666">Invoice Receipt</div><hr/><p><b>Invoice:</b> ${sale.invoice_no}</p><p><b>Date:</b> ${sale.created_at?.slice(0,16).replace('T',' ') || new Date().toLocaleString()}</p>${cust ? `<p><b>Customer:</b> ${cust.name}</p>` : ''}<hr/><table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table><hr/><p class="right">Subtotal: <b>$${fmt(sale.subtotal)}</b></p>${sale.discount > 0 ? `<p class="right" style="color:green">Discount: -$${fmt(sale.discount)}</p>` : ''}${sale.tax > 0 ? `<p class="right">Tax: +$${fmt(sale.tax)}</p>` : ''}<p class="right bold" style="font-size:14px">Total: $${fmt(sale.total)}</p><p class="right">Paid: $${fmt(sale.paid)}</p>${sale.change_due > 0 ? `<p class="right">Change: $${fmt(sale.change_due)}</p>` : ''}<hr/><div class="center" style="font-size:11px;color:#888">Thank you for your purchase!</div></body></html>`
    window.api.print.html(html)
  }

  // â”€â”€ Return â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleReturn = async (sale) => {
    await window.api.sales.return({ sale_id: sale.id, reason: returnReason, refund_amount: sale.total })
    setReturnModal(null); setReturnReason(''); loadSales()
  }

  // â”€â”€ Product grid filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  )

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '16px 20px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fff', paddingBottom: 0, marginBottom: 16, gap: 8, overflowX: 'auto' }}>
        {[['pos', 'POS / Cashier', ShoppingCart], ['history', 'Sales History', CreditCard]].map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, fontSize: 13, fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer', transition: 'all 0.15s', padding: '12px 12px',
              borderBottom: tab === k ? '2px solid #00deab' : '2px solid transparent',
              color: tab === k ? '#00deab' : '#94a3b8', whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => { if (tab !== k) e.currentTarget.style.color = '#64748b' }}
            onMouseLeave={e => { if (tab !== k) e.currentTarget.style.color = '#94a3b8' }}
          >
            <Icon size={14} />{l}
          </button>
        ))}
      </div>

      {/* â”€â”€ POS Tab â”€â”€ */}
      {tab === 'pos' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', gap: 16 }}>
          {/* Left - Product Grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...styles.card }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  placeholder="Search products by name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...styles.input, paddingLeft: 32, fontSize: 12 }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {filtered.map(p => {
                  const inCart = cart.find(i => i.product_id === p.id)
                  const outOfStock = p.quantity <= 0
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      disabled={outOfStock}
                      style={{
                        textAlign: 'left', border: `1px solid ${outOfStock ? '#e2e8f0' : inCart ? '#c7d2fe' : '#e2e8f0'}`,
                        background: outOfStock ? '#f8fafc' : inCart ? '#ecfdf5' : '#fff',
                        padding: 12, borderRadius: 10, cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.5 : 1, transition: 'all 0.15s', position: 'relative',
                        boxShadow: inCart ? '0 1px 3px rgba(79, 70, 229, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      onMouseEnter={e => { if (!outOfStock && !inCart) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#c7d2fe' } }}
                      onMouseLeave={e => { if (!outOfStock && !inCart) { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#e2e8f0' } }}
                    >
                      {inCart && (
                        <span style={{ position: 'absolute', top: 6, right: 6, background: '#00deab', color: '#fff', fontSize: 10, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {inCart.qty}
                        </span>
                      )}
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: inCart ? 14 : 0 }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>{p.sku || p.category_name || '-'}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#00deab', margin: '0 0 4px' }}>${fmt(p.price)}</p>
                      <p style={{ fontSize: 11, color: p.quantity <= p.low_stock_threshold ? '#d97706' : '#94a3b8', margin: 0 }}>
                        Stock: {p.quantity} {p.unit}
                      </p>
                    </button>
                  )
                })}
                {!filtered.length && (
                  <div style={{ gridColumn: '1 / -1', padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No products found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Cart */}
          <div style={{ width: 320, display: 'flex', flexDirection: 'column', background: '#fff', ...styles.card, overflow: 'hidden' }}>
            {/* Customer */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <User size={12} style={{ color: '#94a3b8' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</span>
              </div>
              <select value={customer?.id || ''} onChange={e => setCustomer(customers.find(c => c.id === e.target.value) || null)}
                style={{ ...styles.input, width: '100%' }}
                onFocus={e => e.target.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)'}
                onBlur={e => e.target.style.boxShadow = 'none'}>
                <option value="">Walk-in Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.balance < 0 ? `(owes $${fmt(Math.abs(c.balance))})` : ''}</option>)}
              </select>
            </div>

            {/* Cart items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {cart.length === 0
                ? <div style={{ paddingTop: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <ShoppingCart size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  Cart is empty.<br />Click a product to add.
                </div>
                : cart.map(item => (
                  <CartRow key={item.cart_key} item={item} onQty={changeQty} onRemove={removeFromCart} />
                ))
              }
            </div>

            {/* Totals & Coupon */}
            <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Discount Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <select
                  value={coupon}
                  onChange={e => { setCoupon(e.target.value); setCouponMsg(''); setDiscount(0) }}
                  style={{ ...styles.input, fontSize: 12 }}
                >
                  <option value="">- Select Discount / Coupon -</option>
                  {discounts.map(d => (
                    <option key={d.id} value={d.code || d.id}>
                      {d.code ? `${d.code} - ` : ''}{d.type === 'percent' ? `${d.value}% off` : `$${fmt(d.value)} off`}{d.min_amount > 0 ? ` (min $${fmt(d.min_amount)})` : ''}
                    </option>
                  ))}
                </select>
                {coupon && (
                  <button onClick={applyCoupon} style={{ ...styles.button, background: '#00deab', color: '#fff', padding: '6px 10px', fontSize: 11 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                    onMouseLeave={e => e.currentTarget.style.background = '#00deab'}>Apply Discount</button>
                )}
              </div>
              {couponMsg && <p style={{ fontSize: 11, color: couponMsg.startsWith('✔') ? '#059669' : '#dc2626', margin: 0 }}>{couponMsg}</p>}

              {/* Tax */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#475569', flex: 1 }}>Tax %</span>
                <input type="number" min="0" max="100" value={taxPct}
                  onChange={e => setTaxPct(+e.target.value)}
                  style={{ ...styles.input, width: 60, padding: '6px 8px', fontSize: 12 }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.2)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Subtotal</span><span>${fmt(subtotal)}</span>
                </div>
                {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Discount</span><span>-${fmt(discount)}</span>
                </div>}
                {taxAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Tax ({taxPct}%)</span><span>+${fmt(taxAmount)}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#1e293b', paddingTop: 8, borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                  <span>Total</span><span style={{ color: '#00deab' }}>${fmt(total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={clearCart} style={{ ...styles.button, flex: 1, background: '#f1f5f9', color: '#475569', padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                  <X size={13} /> Clear
                </button>
                <button onClick={() => { setPaid(fmt(total)); setPayModal(true) }} disabled={!cart.length} 
                  style={{ ...styles.button, flex: 1, background: '#00deab', color: '#fff', padding: '8px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !cart.length ? 0.5 : 1, cursor: !cart.length ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (cart.length) e.currentTarget.style.background = '#4338ca' }}
                  onMouseLeave={e => { if (cart.length) e.currentTarget.style.background = '#00deab' }}>
                  <CreditCard size={13} /> Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ History Tab â”€â”€ */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 12 }}>
          <div style={{ ...styles.card, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Invoice', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment', 'Status', 'Date', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Total' || h === 'Subtotal' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#00deab', fontWeight: 600 }}>{s.invoice_no}</td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>{s.customer_name || 'Walk-in'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>${fmt(s.subtotal)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669' }}>{s.discount > 0 ? `-$${fmt(s.discount)}` : '-'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>{s.tax > 0 ? `$${fmt(s.tax)}` : '-'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>${fmt(s.total)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ ...styles.badge('#f1f5f9', '#475569'), fontSize: 10 }}>{s.payment_method}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ ...styles.badge(s.status === 'completed' ? '#ecfdf5' : s.status === 'returned' ? '#fee2e2' : '#fffbeb', s.status === 'completed' ? '#059669' : s.status === 'returned' ? '#dc2626' : '#d97706'), fontSize: 10 }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11 }}>{s.created_at?.slice(0, 10)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button onClick={() => handleViewInvoice(s)}
                            style={{ ...styles.button, fontSize: 11, color: '#00deab', background: 'none', padding: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#3730a3'}
                            onMouseLeave={e => e.currentTarget.style.color = '#00deab'}>
                            <Eye size={11} /> View
                          </button>
                          {s.status === 'completed' && (
                            <button onClick={() => setReturnModal(s)}
                              style={{ ...styles.button, fontSize: 11, color: '#dc2626', background: 'none', padding: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                              onMouseEnter={e => e.currentTarget.style.color = '#991b1b'}
                              onMouseLeave={e => e.currentTarget.style.color = '#dc2626'}>
                              <RotateCcw size={11} /> Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!sales.length && (
                    <tr><td colSpan={10} style={{ padding: '40px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No sales yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Variant Select Modal â”€â”€ */}
      <Modal open={!!varSelectModal} onClose={() => setVarSelectModal(null)} title={`Select Variant - ${varSelectModal?.product?.name}`}>
        {varSelectModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {varSelectModal.variants.map(v => (
              <button key={v.id} onClick={() => addVariantToCart(varSelectModal.product, v)}
                disabled={v.quantity <= 0}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 10, background: v.quantity <= 0 ? '#f8fafc' : '#fff', cursor: v.quantity <= 0 ? 'not-allowed' : 'pointer', opacity: v.quantity <= 0 ? 0.5 : 1 }}
                onMouseEnter={e => { if (v.quantity > 0) e.currentTarget.style.background = '#ecfdf5' }}
                onMouseLeave={e => { if (v.quantity > 0) e.currentTarget.style.background = '#fff' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{v.name}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#00deab' }}>${fmt(v.price)}</span>
                  <span style={{ fontSize: 11, color: v.quantity <= 0 ? '#ef4444' : '#059669' }}>Stock: {v.quantity}</span>
                </div>
              </button>
            ))}
            <button onClick={() => { addToCart(varSelectModal.product); setVarSelectModal(null) }}
              style={{ padding: '10px', border: '1px dashed #e2e8f0', borderRadius: 10, background: 'none', cursor: 'pointer', fontSize: 12, color: '#94a3b8' }}>
              Add without variant
            </button>
          </div>
        )}
      </Modal>

      {/* â”€â”€ Payment Modal â”€â”€ */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Complete Payment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ecfdf5', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount Due</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: '#00deab', margin: '4px 0 0' }}>${fmt(total)}</p>
          </div>
          <FormField label="Payment Method">
            <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {[['cash', 'Cash'], ['card', 'Card'], ['transfer', 'Transfer']].map(([v, l]) => (
                <button key={v} onClick={() => setPayMethod(v)}
                  style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 500, border: 'none', background: payMethod === v ? '#00deab' : '#fff', color: payMethod === v ? '#fff' : '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (payMethod !== v) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (payMethod !== v) e.currentTarget.style.background = '#fff' }}>
                  {l}
                </button>
              ))}
            </div>
          </FormField>
          {payMethod === 'cash' && (
            <FormField label="Amount Received ($)">
              <Input type="number" min="0" step="0.01" value={paid}
                onChange={e => setPaid(e.target.value)} autoFocus />
            </FormField>
          )}
          {payMethod === 'cash' && parseFloat(paid) >= total && (
            <div style={{ background: '#ecfdf5', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#047857', fontWeight: 500 }}>Change Due</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>${fmt(changeDue)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <button onClick={handleCheckout} 
              style={{ ...styles.button, flex: 1, background: '#00deab', color: '#fff', padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#00deab'}>
              <Check size={14} /> Confirm Sale
            </button>
            <button onClick={() => setPayModal(false)} 
              style={{ ...styles.button, flex: 0.8, background: '#f1f5f9', color: '#475569', padding: '10px 12px', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* â”€â”€ Receipt Modal â”€â”€ */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale Complete">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <Check size={24} style={{ margin: '0 auto 6px', color: '#059669' }} />
            <p style={{ fontWeight: 600, color: '#047857', margin: 0 }}>Sale Completed!</p>
            <p style={{ fontSize: 12, color: '#059669', fontFamily: 'monospace', margin: '6px 0 0' }}>{receipt?.sale?.invoice_no}</p>
            {receipt?.sale?.change_due > 0 && (
              <p style={{ fontSize: 12, color: '#047857', margin: '6px 0 0' }}>Change: <strong>${fmt(receipt.sale.change_due)}</strong></p>
            )}
          </div>
          {receipt && <InvoicePrint {...receipt} />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={printReceipt} 
              style={{ ...styles.button, flex: 1, background: '#00deab', color: '#fff', padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
              onMouseLeave={e => e.currentTarget.style.background = '#00deab'}>
              <Printer size={13} /> Print Receipt
            </button>
            <button onClick={() => setReceipt(null)} 
              style={{ ...styles.button, flex: 1, background: '#f1f5f9', color: '#475569', padding: '10px 12px', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>Close</button>
          </div>
        </div>
      </Modal>

      {/* â”€â”€ View Invoice Modal â”€â”€ */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice - ${viewInvoice?.sale?.invoice_no}`}>
        {viewInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Invoice preview */}
            <div style={{ border: '1px dashed #e2e8f0', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, maxWidth: 320, margin: '0 auto', width: '100%' }}>
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>ðŸŒ¸ FloriManager</p>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#888', margin: '0 0 8px' }}>Invoice Receipt</p>
              <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '6px 0' }} />
              <p style={{ margin: '3px 0' }}><b>Invoice:</b> {viewInvoice.sale.invoice_no}</p>
              <p style={{ margin: '3px 0' }}><b>Date:</b> {viewInvoice.sale.created_at?.slice(0,16).replace('T',' ')}</p>
              {viewInvoice.sale.customer_name && <p style={{ margin: '3px 0' }}><b>Customer:</b> {viewInvoice.sale.customer_name}</p>}
              <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '6px 0' }} />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>{viewInvoice.items.map((i, idx) => <tr key={idx}><td>{i.name}</td><td style={{ textAlign: 'right' }}>{i.qty}</td><td style={{ textAlign: 'right' }}>${fmt(i.price)}</td><td style={{ textAlign: 'right' }}>${fmt(i.total)}</td></tr>)}</tbody>
              </table>
              <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '6px 0' }} />
              <p style={{ textAlign: 'right', margin: '3px 0' }}>Subtotal: <b>${fmt(viewInvoice.sale.subtotal)}</b></p>
              {viewInvoice.sale.discount > 0 && <p style={{ textAlign: 'right', color: '#059669', margin: '3px 0' }}>Discount: -${fmt(viewInvoice.sale.discount)}</p>}
              {viewInvoice.sale.tax > 0 && <p style={{ textAlign: 'right', margin: '3px 0' }}>Tax: +${fmt(viewInvoice.sale.tax)}</p>}
              <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, margin: '3px 0' }}>Total: ${fmt(viewInvoice.sale.total)}</p>
              <p style={{ textAlign: 'right', margin: '3px 0' }}>Paid: ${fmt(viewInvoice.sale.paid)}</p>
              {viewInvoice.sale.change_due > 0 && <p style={{ textAlign: 'right', margin: '3px 0' }}>Change: ${fmt(viewInvoice.sale.change_due)}</p>}
              <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '6px 0' }} />
              <p style={{ textAlign: 'center', fontSize: 11, color: '#888', margin: 0 }}>Thank you for your purchase!</p>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => window.api.print.html(buildInvoiceHtml(viewInvoice.sale, viewInvoice.items))}
                style={{ ...styles.button, flex: 1, background: '#00deab', color: '#fff', padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                onMouseLeave={e => e.currentTarget.style.background = '#00deab'}>
                <Download size={13} /> Download / Print PDF
              </button>
              <button onClick={() => setViewInvoice(null)}
                style={{ ...styles.button, flex: 1, background: '#f1f5f9', color: '#475569', padding: '10px 12px', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* â”€â”€ Return Modal â”€â”€ */}
      <Modal open={!!returnModal} onClose={() => { setReturnModal(null); setReturnReason('') }} title="Process Return">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12, padding: 12 }}>
            <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>Return invoice <strong>{returnModal?.invoice_no}</strong></p>
            <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>Refund amount: <strong>${fmt(returnModal?.total)}</strong></p>
            <p style={{ fontSize: 11, color: '#b91c1c', margin: '4px 0 0' }}>Stock will be restored automatically.</p>
          </div>
          <FormField label="Return Reason">
            <Input placeholder="e.g. Damaged, Wrong item..." value={returnReason}
              onChange={e => setReturnReason(e.target.value)} autoFocus />
          </FormField>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleReturn(returnModal)} 
              style={{ ...styles.button, flex: 1, background: '#dc2626', color: '#fff', padding: '10px 12px', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
              onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>
              <RotateCcw size={13} /> Confirm Return
            </button>
            <button onClick={() => { setReturnModal(null); setReturnReason('') }} 
              style={{ ...styles.button, flex: 1, background: '#f1f5f9', color: '#475569', padding: '10px 12px', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



