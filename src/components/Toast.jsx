import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={15} color="#059669" />,
  error:   <XCircle    size={15} color="#dc2626" />,
  info:    <Info       size={15} color="#4f46e5" />,
}
const COLORS = {
  success: { bg: '#ecfdf5', border: '#bbf7d0', color: '#047857' },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  info:    { bg: '#eef2ff', border: '#c7d2fe', color: '#4338ca' },
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message])

  if (!message) return null
  const c = COLORS[type] || COLORS.success

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 10, padding: '12px 16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      fontSize: 13, color: c.color, fontWeight: 500,
      minWidth: 220, maxWidth: 360,
      animation: 'slideUp 0.2s ease',
    }}>
      {ICONS[type]}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: c.color, opacity: 0.6, display: 'flex' }}>
        <X size={14} />
      </button>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
