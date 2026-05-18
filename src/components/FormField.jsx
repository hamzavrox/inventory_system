const inputBase = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
  lineHeight: '1.5',
}

export function FormField({ label, children, className = '', style = {} }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#64748b',
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {label}
        </label>
      )}
      {children}
    </div>
  )
}

export function Input({ className = '', style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        ...inputBase,
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = '#00deab'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
      onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
    />
  )
}

export function Select({ className = '', style = {}, children, ...props }) {
  return (
    <select
      {...props}
      style={{
        ...inputBase,
        background: '#fff',
        cursor: 'pointer',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = '#00deab'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
      onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
    >
      {children}
    </select>
  )
}

export function Btn({ variant = 'primary', size = 'md', className = '', style = {}, children, ...props }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'inherit',
    fontWeight: 500,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s, opacity 0.15s',
    lineHeight: 1,
  }

  const sizes = {
    sm: { padding: '6px 12px',  fontSize: 12 },
    md: { padding: '8px 16px',  fontSize: 13 },
    lg: { padding: '10px 20px', fontSize: 14 },
  }

  const variants = {
    primary:   { background: '#00deab', color: '#fff' },
    secondary: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
    danger:    { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    ghost:     { background: 'transparent', color: '#64748b' },
    success:   { background: '#059669', color: '#fff' },
  }

  return (
    <button
      {...props}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
    >
      {children}
    </button>
  )
}


