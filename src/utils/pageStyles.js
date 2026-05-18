export const fmt = (n) => Number(n || 0).toFixed(2)

export const C = {
  // Layout
  page: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  row: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  // Typography
  title: { fontSize: 18, fontWeight: 600, color: '#334155', margin: 0 },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 0 },
  label: { fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 4, display: 'block' },

  // Cards
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' },
  cardP: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.06)', padding: 18 },

  // Grids
  g2: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 },
  g3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 },
  g4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 },

  // Table
  table: { width: '100%', borderCollapse: 'collapse' },
  th: (right) => ({ padding: '10px 16px', textAlign: right ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc', whiteSpace: 'nowrap' }),
  td: (right) => ({ padding: '10px 16px', borderTop: '1px solid #f1f5f9', color: '#475569', textAlign: right ? 'right' : 'left', fontSize: 13 }),
  tdb: (right) => ({ padding: '10px 16px', borderTop: '1px solid #f1f5f9', color: '#1e293b', fontWeight: 600, textAlign: right ? 'right' : 'left', fontSize: 13 }),

  // Badges
  badge: (bg, color) => ({ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 99, background: bg, color, whiteSpace: 'nowrap' }),

  // Inputs
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff' },
  select: { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff' },

  // Buttons
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#00deab', color: '#fff', whiteSpace: 'nowrap' },
  btn2: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#f8fafc', color: '#475569', whiteSpace: 'nowrap' },
  btnD: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: '#fef2f2', color: '#dc2626', whiteSpace: 'nowrap' },
  iBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabBar: { display: 'flex', borderBottom: '2px solid #f1f5f9', gap: 0 },
  tab: (active) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: active ? '2px solid #00deab' : '2px solid transparent', marginBottom: -2, background: 'none', cursor: 'pointer', color: active ? '#00deab' : '#64748b', whiteSpace: 'nowrap' }),


  // Search
  searchWrap: { position: 'relative', flex: 1, minWidth: 200 },
  searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' },
  searchInput: { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px 8px 34px', fontSize: 13, color: '#1e293b', outline: 'none', background: '#fff' },

  // Divider
  divider: { borderTop: '1px solid #f1f5f9', margin: '4px 0' },
}


