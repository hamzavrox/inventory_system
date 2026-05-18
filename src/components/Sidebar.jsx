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

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const S = {
  aside: (w) => ({
    width: w, minWidth: w, maxWidth: w,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-color)',
    flexShrink: 0,
    overflow: 'visible',
    position: 'relative',
    transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 50,
  }),


  logoBar: {
    display: 'flex',
    alignItems: 'center',
    height: 52,
    minHeight: 52,
    padding: '0 14px',
    flexShrink: 0,
    gap: 8,
  },

  logoText: {
    flex: 1,
    color: 'var(--primary)',
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: '-0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },

  collapseBtn: {
    background: '#f8fafc',
    border: '1px solid var(--border-color)',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    flexShrink: 0,
  },

  nav: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minHeight: 0,
  },

  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px 4px',
    background: 'none',
    border: 'none',
    cursor: 'default',
    width: '100%',
    textAlign: 'left',
  },

  groupLabelText: {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
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
    fontWeight: isActive ? 600 : 500,
    color: isActive ? '#ffffff' : 'var(--text-muted)',
    backgroundColor: isActive ? 'var(--primary)' : 'transparent',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    boxShadow: isActive ? '0 2px 6px var(--primary-glow)' : 'none',
  }),

  footer: {
    padding: '10px 12px',
    borderTop: '1px solid var(--border-color)',
    background: '#fcfdfe',
  },

  footerCollapsed: {
    padding: '8px 6px',
    display: 'flex',
    justifyContent: 'center',
    borderTop: '1px solid var(--border-color)',
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'var(--primary-glow)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--primary)',
  },
}



// â”€â”€â”€ NavItem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      style={({ isActive }) => S.navItem(isActive, collapsed)}
      onMouseEnter={e => {
        if (!e.currentTarget.style.backgroundColor.includes('var(--primary)')) {
          e.currentTarget.style.backgroundColor = 'var(--primary-glow)'
          e.currentTarget.style.color = 'var(--primary)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.style.backgroundColor.includes('var(--primary)')) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
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


// â”€â”€â”€ NavGroup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      {/* â”€â”€ Logo bar â”€â”€ */}
      <div style={{ ...S.logoBar, padding: collapsed ? '0' : '0 14px', justifyContent: 'center', position: 'relative' }}>
        <img src="./Inventory_Management_System_Logo.png" alt="logo" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
        {!collapsed && <span style={S.logoText}>IMS</span>}
        
        {/* Toggle Button centered on the border line */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            ...S.collapseBtn,
            position: 'absolute',
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100,
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-color)',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>




      {/* â”€â”€ Nav â”€â”€ */}
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

      {/* â”€â”€ User footer â”€â”€ */}
      {!collapsed ? (
        <div style={S.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={S.avatar}>
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Administrator'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.role_name || 'Admin'}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, flexShrink: 0 }}
            >
              <LogOut size={16} />
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


