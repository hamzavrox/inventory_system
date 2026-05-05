import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Package, Tags, Layers, ShoppingCart,
  Users, BarChart2, Tag, GitBranch, Store,
  UserCog, RefreshCw, Printer, Plug, ChevronDown,
  ChevronLeft, ChevronRight, Boxes, Barcode, Wallet, LogOut
} from 'lucide-react'
import { usePerm } from '../context/UserContext'

const NAV = [
  { group: 'Main', items: [
    { to: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/pos',          icon: ShoppingCart,    label: 'POS / Sales',  module: 'pos'        },
  ]},
  { group: 'Catalog', items: [
    { to: '/products',     icon: Package,         label: 'Products',     module: 'products'   },
    { to: '/categories',   icon: Layers,          label: 'Categories',   module: 'categories' },
    { to: '/brands',       icon: Tags,            label: 'Brands',       module: 'brands'     },
    { to: '/barcode',      icon: Barcode,         label: 'Barcode',      module: 'barcode'    },
  ]},
  { group: 'Inventory', items: [
    { to: '/inventory',    icon: Boxes,           label: 'Stock',        module: 'inventory'  },
  ]},
  { group: 'Business', items: [
    { to: '/customers',    icon: Users,           label: 'Customers',    module: 'customers'  },
    { to: '/accounting',   icon: Wallet,          label: 'Accounting',   module: 'accounting' },
    { to: '/discounts',    icon: Tag,             label: 'Discounts',    module: 'discounts'  },
  ]},
  { group: 'Org', items: [
    { to: '/branches',     icon: GitBranch,       label: 'Branches',     module: 'branches'   },
    { to: '/shops',        icon: Store,           label: 'Shops',        module: 'shops'      },
  ]},
  { group: 'Reports', items: [
    { to: '/reports',      icon: BarChart2,       label: 'Reports',      module: 'reports'    },
  ]},
  { group: 'System', items: [
    { to: '/users',        icon: UserCog,         label: 'Users & Roles', module: 'users'     },
    { to: '/sync',         icon: RefreshCw,       label: 'Sync & Backup', module: 'sync'      },
    { to: '/print',        icon: Printer,         label: 'Print'                              },
    { to: '/integrations', icon: Plug,            label: 'Integrations'                       },
  ]},
]

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  aside: (w) => ({
    width: w, minWidth: w, maxWidth: w,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #263548',
    flexShrink: 0,
    overflow: 'hidden',
    transition: 'width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease',
  }),

  logoBar: {
    display: 'flex',
    alignItems: 'center',
    height: 52,
    minHeight: 52,
    padding: '0 14px',
    borderBottom: '1px solid #263548',
    flexShrink: 0,
    gap: 8,
  },

  logoText: {
    flex: 1,
    color: '#f1f5f9',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  collapseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 6,
    flexShrink: 0,
    lineHeight: 0,
  },

  nav: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minHeight: 0,
  },

  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },

  groupLabelText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
  },

  navItem: (isActive, collapsed) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 10,
    justifyContent: collapsed ? 'center' : 'flex-start',
    padding: collapsed ? '9px 0' : '8px 10px',
    margin: '1px 0',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    color: isActive ? '#ffffff' : '#94a3b8',
    backgroundColor: isActive ? '#4f46e5' : 'transparent',
    transition: 'background-color 0.15s, color 0.15s',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }),

  footer: {
    borderTop: '1px solid #263548',
    padding: '10px 12px',
    flexShrink: 0,
  },

  footerCollapsed: {
    borderTop: '1px solid #263548',
    padding: '8px 6px',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
  },
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      style={({ isActive }) => S.navItem(isActive, collapsed)}
      onMouseEnter={e => {
        if (e.currentTarget.style.backgroundColor === 'transparent' || e.currentTarget.style.backgroundColor === '') {
          e.currentTarget.style.backgroundColor = '#334155'
          e.currentTarget.style.color = '#f1f5f9'
        }
      }}
      onMouseLeave={e => {
        // Only reset if not active (active has indigo bg)
        if (!e.currentTarget.style.backgroundColor.includes('79')) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#94a3b8'
        }
      }}
    >
      <Icon size={15} style={{ flexShrink: 0, display: 'block' }} />
      {!collapsed && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      )}
    </NavLink>
  )
}

// ─── NavGroup ─────────────────────────────────────────────────────────────────
function NavGroup({ group, items, collapsed, open, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {!collapsed && (
        <button style={S.groupLabel} onClick={onToggle}>
          <span style={S.groupLabelText}>{group}</span>
          <ChevronDown
            size={10}
            style={{
              color: '#475569',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.15s',
              flexShrink: 0,
            }}
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {(open || collapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {items.map(item => (
              <NavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ user, onLogout }) {
  const can        = usePerm()
  const [collapsed,  setCollapsed]  = useState(false)
  const [openGroups, setOpenGroups] = useState(
    () => Object.fromEntries(NAV.map(g => [g.group, true]))
  )

  const toggle = (g) => setOpenGroups(s => ({ ...s, [g]: !s[g] }))
  const W = collapsed ? 56 : 230

  // Filter nav items by permission
  const filteredNAV = NAV.map(group => ({
    ...group,
    items: group.items.filter(item => !item.module || can(item.module, 'view'))
  })).filter(group => group.items.length > 0)

  return (
    <aside style={S.aside(W)}>

      {/* ── Logo bar ── */}
      <div style={S.logoBar}>
        {collapsed
          ? <img src="/IMS.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
          : (
            <>
              <img src="/IMS.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
              <span style={S.logoText}>IMS</span>
            </>
          )
        }
        <button
          style={{ ...S.collapseBtn, marginLeft: collapsed ? 'auto' : 0 }}
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={S.nav}>
        {filteredNAV.map(({ group, items }) => (
          <NavGroup
            key={group}
            group={group}
            items={items}
            collapsed={collapsed}
            open={openGroups[group]}
            onToggle={() => toggle(group)}
          />
        ))}
      </nav>

      {/* ── User footer ── */}
      {!collapsed ? (
        <div style={S.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={S.avatar}>
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Administrator'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.role_name || 'Admin'}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, flexShrink: 0 }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div style={S.footerCollapsed}>
          <button
            onClick={onLogout}
            title="Logout"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: 6 }}
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

    </aside>
  )
}
