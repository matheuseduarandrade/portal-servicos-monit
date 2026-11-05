import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@/types'
import { call, clearToken, getToken } from '@/services/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  loginWithUserObject: (user: User) => void
  updateFoto: (fotoUrl: string) => void
  logout: () => void
  isDeveloper: (user: User | null) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const STORAGE_KEY = 'portal-servicos:session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && getToken()) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem(STORAGE_KEY) }
    } else {
      localStorage.removeItem(STORAGE_KEY)
      clearToken()
    }
    setLoading(false)

    // Revalida a sessão no servidor (perfil alterado, usuário desativado/excluído, token expirado)
    if (stored && getToken()) {
      call<User>('auth.me')
        .then(fresh => setUser(prev => {
          if (!prev) return prev
          const merged = { ...prev, ...fresh, foto: prev.foto ?? fresh.foto }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
          return merged
        }))
        .catch(() => { /* UNAUTHENTICATED já dispara o evento abaixo; erro de rede mantém a sessão */ })
    }

    const onUnauth = () => setUser(null)
    window.addEventListener('portal:unauthenticated', onUnauth)
    return () => window.removeEventListener('portal:unauthenticated', onUnauth)
  }, [])

  function loginWithUserObject(userObj: User) {
    setUser(userObj)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj))
  }

  function updateFoto(fotoUrl: string) {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, foto: fotoUrl }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }

  function logout() {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    clearToken()
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithUserObject, updateFoto, logout, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// As permissões reais são verificadas no servidor (Apps Script); estas só controlam o que a interface mostra.
export function canManage(user: User | null) {
  return user?.perfil === 'admin' || user?.email === 'matheus.eduardo@queonetics.com'
}
export function canPublish(user: User | null) {
  return user?.perfil === 'admin' || user?.perfil === 'supervisor' || user?.email === 'matheus.eduardo@queonetics.com'
}
export function isDeveloper(user: User | null) {
  return user?.email === 'matheus.eduardo@queonetics.com'
}
