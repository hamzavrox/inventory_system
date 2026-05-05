import { usePerm } from '../context/UserContext'
import { Navigate } from 'react-router-dom'

export default function PermGuard({ module, children }) {
  const can = usePerm()
  if (!can(module, 'view')) return <Navigate to="/" replace />
  return children
}
