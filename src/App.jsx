import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserContext } from './context/UserContext'
import PermGuard     from './components/PermGuard'
import Login        from './pages/Login'
import Layout       from './components/Layout'
import Dashboard    from './pages/Dashboard'
import Products     from './pages/Products'
import Categories   from './pages/Categories'
import Brands       from './pages/Brands'
import Barcode      from './pages/Barcode'
import Stock        from './pages/Stock'
import POS          from './pages/POS'
import Customers    from './pages/Customers'
import Accounting   from './pages/Accounting'
import Discounts    from './pages/Discounts'
import Branches     from './pages/Branches'
import Shops        from './pages/Shops'
import Reports      from './pages/Reports'
import Users        from './pages/Users'
import Sync         from './pages/Sync'
import PrintSettings from './pages/PrintSettings'
import Integrations from './pages/Integrations'

const LS_USER_KEY = 'current_user'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_USER_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setLoading(false)
  }, [])

  // When DB is restored from backup, reload the app so all data refreshes
  useEffect(() => {
    const handler = () => {
      localStorage.setItem('db_restored_msg', '1')
      window.location.reload()
    }
    window.api.on('db:restored', handler)
    return () => window.api.off('db:restored', handler)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem(LS_USER_KEY, JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem(LS_USER_KEY)
  }

  if (loading) return null

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <UserContext.Provider value={user}>
    <HashRouter>
      <Routes>
        <Route element={<Layout user={user} onLogout={handleLogout} />}>
          <Route index                  element={<Dashboard />} />
          <Route path="pos"             element={<PermGuard module="pos"><POS /></PermGuard>} />
          <Route path="products"        element={<PermGuard module="products"><Products /></PermGuard>} />
          <Route path="categories"      element={<PermGuard module="categories"><Categories /></PermGuard>} />
          <Route path="brands"          element={<PermGuard module="brands"><Brands /></PermGuard>} />
          <Route path="barcode"         element={<PermGuard module="barcode"><Barcode /></PermGuard>} />
          <Route path="inventory"       element={<PermGuard module="inventory"><Stock /></PermGuard>} />
          <Route path="customers"       element={<PermGuard module="customers"><Customers /></PermGuard>} />
          <Route path="accounting"      element={<PermGuard module="accounting"><Accounting /></PermGuard>} />
          <Route path="discounts"       element={<PermGuard module="discounts"><Discounts /></PermGuard>} />
          <Route path="branches"        element={<PermGuard module="branches"><Branches /></PermGuard>} />
          <Route path="shops"           element={<PermGuard module="shops"><Shops /></PermGuard>} />
          <Route path="reports"         element={<PermGuard module="reports"><Reports /></PermGuard>} />
          <Route path="users"           element={<PermGuard module="users"><Users /></PermGuard>} />
          <Route path="sync"            element={<PermGuard module="sync"><Sync /></PermGuard>} />
          <Route path="print"           element={<PrintSettings />} />
          <Route path="integrations"    element={<Integrations />} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
    </UserContext.Provider>
  )
}
