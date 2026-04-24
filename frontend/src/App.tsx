import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AuthEntry } from './features/auth/AuthEntry'
import { StoreSelectPage } from './features/auth/StoreSelectPage'
import { ProductsPage } from './features/products/ProductsPage'
import { Dashboard } from './features/reports/Dashboard'
import { POS } from './features/sales/POS'
import './App.css'

type AppView = 'pos' | 'products'

function AppContent() {
  const { status, user, stores, selectedStoreId, setStore, logout } = useAuth()
  const [view, setView] = useState<AppView>('pos')
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0)
  const currentStore =
    selectedStoreId != null
      ? stores.find((s) => s.id === selectedStoreId)
      : undefined

  if (status === 'loading') {
    return (
      <div className="app app--centered" role="status" aria-live="polite">
        <p className="app-loading">Cargando…</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <AuthEntry />
  }

  if (status === 'needsStore') {
    return <StoreSelectPage />
  }

  return (
    <div className="app">
      <header className="app-header app-header--authed">
        <div className="app-header__brand">
          <h1>Drugstore SaaS</h1>
          <p className="app-subtitle">Punto de venta</p>
        </div>
        <nav className="app-header__nav" aria-label="Secciones">
          <button
            type="button"
            className={
              'app-header__nav-btn' + (view === 'pos' ? ' app-header__nav-btn--active' : '')
            }
            onClick={() => setView('pos')}
          >
            Caja
          </button>
          <button
            type="button"
            className={
              'app-header__nav-btn' +
              (view === 'products' ? ' app-header__nav-btn--active' : '')
            }
            onClick={() => setView('products')}
          >
            Catálogo
          </button>
        </nav>
        <div className="app-header__user">
          {user && (
            <div className="app-header__identity">
              <span className="app-header__email" title={user.email}>
                {user.email}
              </span>
              {currentStore && (
                <span
                  className="app-header__storename"
                  title={currentStore.name}
                >
                  {currentStore.name}
                </span>
              )}
            </div>
          )}
          {stores.length > 1 && (
            <label className="app-header__store">
              <span className="sr-only">Tienda</span>
              <select
                value={String(selectedStoreId ?? '')}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '') {
                    return
                  }
                  setStore(parseInt(v, 10))
                }}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="app-header__logout"
            type="button"
            onClick={() => logout()}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="app-main">
        {view === 'pos' && (
          <>
            <Dashboard reportsRefreshKey={reportsRefreshKey} />
            <div className="app-pos-focus">
              <POS
                onGoToCatalog={() => setView('products')}
                onSaleComplete={() => setReportsRefreshKey((n) => n + 1)}
              />
            </div>
          </>
        )}
        {view === 'products' && <ProductsPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
