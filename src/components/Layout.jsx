import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar  from './Topbar'

export default function Layout({ user, onLogout }) {
  return (
    <div className="app-container" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-body)' }}>
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Topbar onLogout={onLogout} />
        <main className="main-content" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}



