import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  getSelectedStoreId,
  getToken,
  setSelectedStoreId,
  setToken,
} from './authStorage'
import type { AuthStatus, MeResponse, UserStore } from './types'
import { fetchMe, postLogin, postRegister } from '../services/api'

type AuthContextValue = {
  user: { id: number; email: string } | null
  stores: UserStore[]
  selectedStoreId: number | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    storeName: string,
  ) => Promise<void>
  logout: () => void
  setStore: (storeId: number) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function chooseInitialStore(
  me: MeResponse,
): { selectedStoreId: number | null; status: 'needsStore' | 'ready' } {
  const ids = new Set(me.stores.map((s) => s.id))
  if (me.stores.length === 0) {
    return { selectedStoreId: null, status: 'ready' }
  }
  if (me.stores.length === 1) {
    const only = me.stores[0].id
    setSelectedStoreId(only)
    return { selectedStoreId: only, status: 'ready' }
  }
  const fromStorage = getSelectedStoreId()
  if (fromStorage != null && !ids.has(fromStorage)) {
    setSelectedStoreId(null)
  }
  const validSaved =
    fromStorage != null && ids.has(fromStorage) ? fromStorage : null
  if (validSaved != null) {
    return { selectedStoreId: validSaved, status: 'ready' as const }
  }
  return { selectedStoreId: null, status: 'needsStore' as const }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null)
  const [stores, setStores] = useState<UserStore[]>([])
  const [selectedStoreId, setSelectedId] = useState<number | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'unauthenticated',
  )

  const applySession = useCallback((me: MeResponse) => {
    setUser({ id: me.id, email: me.email })
    setStores(me.stores)
    const next = chooseInitialStore(me)
    setSelectedId(next.selectedStoreId)
    setStatus(next.status)
  }, [])

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setStatus('unauthenticated')
      return
    }
    setStatus('loading')
    try {
      const me = await fetchMe()
      applySession(me)
    } catch {
      clearSession()
      setUser(null)
      setStores([])
      setSelectedId(null)
      setStatus('unauthenticated')
    }
  }, [applySession])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const login = useCallback(
    async (email: string, password: string) => {
      setStatus('loading')
      try {
        const { accessToken } = await postLogin(email, password)
        setToken(accessToken)
        const me = await fetchMe()
        applySession(me)
        try {
          sessionStorage.setItem('pos_search_pulse', '1')
        } catch {
          /* no sessionStorage (private mode, etc.) */
        }
      } catch (e) {
        clearSession()
        setUser(null)
        setStores([])
        setSelectedId(null)
        setStatus('unauthenticated')
        if (e instanceof Error) {
          throw e
        }
        throw new Error('Error al iniciar sesión')
      }
    },
    [applySession],
  )

  const register = useCallback(
    async (email: string, password: string, storeName: string) => {
      setStatus('loading')
      try {
        const { accessToken } = await postRegister(
          email.trim(),
          password,
          storeName.trim(),
        )
        setToken(accessToken)
        const me = await fetchMe()
        applySession(me)
        try {
          sessionStorage.setItem('pos_search_pulse', '1')
        } catch {
          /* no sessionStorage */
        }
      } catch (e) {
        clearSession()
        setUser(null)
        setStores([])
        setSelectedId(null)
        setStatus('unauthenticated')
        if (e instanceof Error) {
          throw e
        }
        throw new Error('Error al registrarse')
      }
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setStores([])
    setSelectedId(null)
    setStatus('unauthenticated')
  }, [])

  const setStore = useCallback(
    (storeId: number) => {
      if (!stores.some((s) => s.id === storeId)) {
        return
      }
      setSelectedStoreId(storeId)
      setSelectedId(storeId)
      setStatus('ready')
    },
    [stores],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      stores,
      selectedStoreId,
      status,
      login,
      register,
      logout,
      setStore,
    }),
    [user, stores, selectedStoreId, status, login, register, logout, setStore],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx == null) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
