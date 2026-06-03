import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { User, LogOut, ChevronDown, AlertTriangle } from 'lucide-react'
import { useUser } from '../context/UserContext'

export default function Topbar({ onLogout }) {
  const { pathname }            = useLocation()
  const user                     = useUser()
  const [lowStock, setLowStock] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [branchName, setBranchName] = useState('')
  const dropdownRef             = useRef(null)

  useEffect(() => {
    window.api?.products.getLowStock().then(r => setLowStock(r.length)).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.branch_id) {
      window.api?.branches.getAll()
        .then(list => {
          const match = list.find(b => b.id === user.branch_id)
          if (match) setBranchName(match.name)
        })
        .catch(() => {})
    }
  }, [user])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header style={{
      height: 48, minHeight: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', gap: 16,
      background: '#fff',
      borderBottom: '1px solid var(--border-color)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Dynamic Slide-down keyframes for premium dropdown entrance */}
      <style>{`
        @keyframes profileSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* Page Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          FloriManager
        </h1>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {lowStock > 0 && (
          <button
            onClick={() => { window.location.hash = '#/inventory' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fffbeb', color: '#d97706',
              border: '1px solid #fde68a',
              padding: '6px 12px', borderRadius: 99,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={14} />
            <span>{lowStock} Low Stock</span>
          </button>
        )}

        {/* User profile dropdown button container */}
        <div style={{ position: 'relative' }} ref={dropdownRef} id="user-profile-menu-container">
          <button
            onClick={() => setShowDropdown(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f8fafc',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f1f5f9'
              e.currentTarget.style.borderColor = '#cbd5e1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.borderColor = 'var(--border-color)'
            }}
            title="User Profile"
          >
            {/* User Silhouette Icon Avatar */}
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-glow)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <User size={15} strokeWidth={2.5} />
            </div>
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: 220,
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'profileSlideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              {/* User Details header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'linear-gradient(135deg, #fafbfd 0%, #f1f5f9 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 8,
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <User size={22} strokeWidth={2} />
                </div>
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.05em' }}>
                    Logged In As
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Administrator'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    @{user?.username || 'admin'}
                  </div>
                </div>
              </div>

              {/* Detailed properties list */}
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-light)' }}>Role</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'capitalize' }}>
                    {user?.role_name || 'Admin'}
                  </span>
                </div>
                {user?.branch_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-light)' }}>Branch</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>
                      {branchName || 'Loading...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  setShowDropdown(false)
                  if (onLogout) onLogout()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#fef2f2'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}





