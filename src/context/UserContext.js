import { createContext, useContext } from 'react'

export const UserContext = createContext(null)

export function useUser() {
  return useContext(UserContext)
}

// usePerm() returns a can(module, right) function
// right: 'view' | 'add' | 'edit' | 'delete'
export function usePerm() {
  const user = useUser()

  return function can(module, right = 'view') {
    if (!user) return true  // no user = dev mode, allow all

    let perms = {}
    try {
      perms = typeof user.permissions === 'string'
        ? JSON.parse(user.permissions || '{}')
        : (user.permissions || {})
    } catch { perms = {} }

    // Admin full access
    if (perms.all) return true
    // No permissions defined = allow all (admin user without role)
    if (Object.keys(perms).length === 0) return true

    return (perms[module] || []).includes(right)
  }
}


