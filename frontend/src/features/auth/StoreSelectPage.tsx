import { useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import './StoreSelectPage.css'

export function StoreSelectPage() {
  const { stores, setStore } = useAuth()
  const [storeId, setStoreId] = useState(
    String(stores[0]?.id ?? ''),
  )
  const [touched, setTouched] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    const n = parseInt(storeId, 10)
    if (!Number.isInteger(n) || n < 1) {
      return
    }
    setStore(n)
  }

  return (
    <div className="store-select">
      <div className="store-select__card">
        <h1 className="store-select__title">Elegí la tienda</h1>
        <p className="store-select__lead">
          Tenés acceso a varias sucursales. Seleccioná con cuál trabajar.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="store-select__field">
            <span>Tienda</span>
            <select
              value={storeId}
              onChange={(e) => {
                setStoreId(e.target.value)
                setTouched(false)
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </label>
          {touched && storeId === '' && (
            <p className="store-select__error" role="alert">
              Elegí una tienda
            </p>
          )}
          <button className="store-select__submit" type="submit">
            Continuar
          </button>
        </form>
      </div>
    </div>
  )
}
