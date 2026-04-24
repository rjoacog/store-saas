import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import {
  createProduct,
  fetchProducts,
  updateProduct,
} from '../../services/api'
import { formatCurrency } from '../../lib/formatCurrency'
import type { Product } from '../../types/product'
import './ProductsPage.css'

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; product: Product }

function ProductFormModal({
  state,
  onClose,
  onSubmit,
  loading,
  error,
}: {
  state: Extract<ModalState, { kind: 'create' } | { kind: 'edit' }>
  onClose: () => void
  onSubmit: (data: {
    name: string
    price: number
    stock: number
    barcode?: string
  }) => void
  loading: boolean
  error: string | null
}) {
  const p = state.kind === 'edit' ? state.product : null
  const [name, setName] = useState(p?.name ?? '')
  const [price, setPrice] = useState(
    p != null ? String(parseFloat(p.price)) : '',
  )
  const [stock, setStock] = useState(p != null ? String(p.stock) : '0')
  const [barcode, setBarcode] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const priceN = parseFloat(price.replace(',', '.'))
    const stockN = parseInt(stock, 10)
    if (Number.isNaN(priceN) || priceN < 0) {
      return
    }
    if (Number.isNaN(stockN) || stockN < 0) {
      return
    }
    const nameT = name.trim()
    if (state.kind === 'create' && barcode.trim() !== '') {
      onSubmit({ name: nameT, price: priceN, stock: stockN, barcode: barcode.trim() })
    } else {
      onSubmit({ name: nameT, price: priceN, stock: stockN })
    }
  }

  return (
    <div
      className="pmodal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="pmodal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="pmodal__title">
          {state.kind === 'create' ? 'Agregar producto' : 'Editar producto'}
        </h2>
        <form className="pmodal__form" onSubmit={handleSubmit}>
          <label className="pmodal__field">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="pmodal__field">
            <span>Precio</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="pmodal__field">
            <span>Stock</span>
            <input
              type="text"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              disabled={loading}
            />
          </label>
          {state.kind === 'create' && (
            <label className="pmodal__field">
              <span>Código (opcional)</span>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={loading}
                placeholder="Se genera automático si queda vacío"
              />
            </label>
          )}
          {error && (
            <p className="pmodal__error" role="alert">
              {error}
            </p>
          )}
          <div className="pmodal__actions">
            <button
              type="button"
              className="pmodal__btn pmodal__btn--ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="pmodal__btn pmodal__btn--primary"
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProductsPage() {
  const { selectedStoreId } = useAuth()
  const [rows, setRows] = useState<Product[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' })
  const [createModalKey, setCreateModalKey] = useState(0)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createToast, setCreateToast] = useState<null | 'first' | 'other'>(
    null,
  )

  const load = useCallback(async () => {
    if (selectedStoreId == null) {
      setRows([])
      setLoading(false)
      return
    }
    setLoadError(null)
    setLoading(true)
    try {
      const data = await fetchProducts()
      setRows(data)
    } catch (e: unknown) {
      setLoadError(
        e instanceof Error ? e.message : 'Error al cargar productos',
      )
      setRows(null)
    } finally {
      setLoading(false)
    }
  }, [selectedStoreId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!createToast) {
      return
    }
    const t = setTimeout(() => setCreateToast(null), 5200)
    return () => clearTimeout(t)
  }, [createToast])

  async function handleCreateSubmit(data: {
    name: string
    price: number
    stock: number
    barcode?: string
  }) {
    setFormError(null)
    setFormLoading(true)
    const wasEmpty = rows == null || rows.length === 0
    try {
      const created = await createProduct(data)
      setRows((prev) => (prev == null ? [created] : [...prev, created]))
      if (wasEmpty && selectedStoreId != null) {
        if (
          sessionStorage.getItem(
            `pos_first_sale_hint_${selectedStoreId}`,
          ) !== '1'
        ) {
          sessionStorage.setItem('pos_show_first_sale_hint', '1')
        }
        setCreateToast('first')
      } else {
        setCreateToast('other')
      }
      setModal({ kind: 'closed' })
    } catch (e: unknown) {
      setFormError(
        e instanceof Error ? e.message : 'No se pudo crear el producto',
      )
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEditSubmit(data: {
    name: string
    price: number
    stock: number
  }) {
    if (modal.kind !== 'edit') {
      return
    }
    const id = modal.product.id
    setFormError(null)
    setFormLoading(true)
    try {
      const updated = await updateProduct(id, {
        name: data.name,
        price: data.price,
        stock: data.stock,
      })
      setRows((prev) =>
        prev == null
          ? [updated]
          : prev.map((p) => (p.id === updated.id ? updated : p)),
      )
      setModal({ kind: 'closed' })
    } catch (e: unknown) {
      setFormError(
        e instanceof Error ? e.message : 'No se pudo actualizar el producto',
      )
    } finally {
      setFormLoading(false)
    }
  }

  if (selectedStoreId == null) {
    return (
      <div className="products-page">
        <p className="products-page__no-store">Elegí una tienda para gestionar productos.</p>
      </div>
    )
  }

  const openCreate = () => {
    setFormError(null)
    setCreateModalKey((k) => k + 1)
    setModal({ kind: 'create' })
  }

  const hasProducts = !loading && !loadError && rows && rows.length > 0

  return (
    <div className="products-page">
      <div className="products-page__head">
        <h2 className="products-page__title">Catálogo</h2>
        {hasProducts && (
          <button
            type="button"
            className="products-page__new"
            onClick={openCreate}
          >
            Agregar producto
          </button>
        )}
      </div>

      {loadError && (
        <p className="products-page__error" role="alert">
          {loadError}
        </p>
      )}

      {loading && <p className="products-page__muted">Cargando…</p>}

      {!loading && !loadError && rows && rows.length === 0 && (
        <div className="products-page__empty-hero" role="status">
          <h3 className="products-page__empty-hero__title">
            Empezá cargando tu catálogo
          </h3>
          <p className="products-page__empty-hero__desc">
            Todavía no tenés productos
          </p>
          <button
            type="button"
            className="products-page__empty-hero__btn"
            onClick={openCreate}
          >
            Agregar producto
          </button>
        </div>
      )}

      {!loading && !loadError && rows && rows.length > 0 && (
        <div className="products-page__table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Código</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{p.stock}</td>
                  <td className="products-table__mono">{p.barcode}</td>
                  <td>
                    <button
                      type="button"
                      className="products-table__edit"
                      onClick={() => {
                        setFormError(null)
                        setModal({ kind: 'edit', product: p })
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.kind === 'create' && (
        <ProductFormModal
          key={`new-${createModalKey}`}
          state={modal}
          onClose={() => {
            if (!formLoading) {
              setModal({ kind: 'closed' })
            }
          }}
          onSubmit={handleCreateSubmit}
          loading={formLoading}
          error={formError}
        />
      )}

      {modal.kind === 'edit' && (
        <ProductFormModal
          key={modal.product.id}
          state={modal}
          onClose={() => {
            if (!formLoading) {
              setModal({ kind: 'closed' })
            }
          }}
          onSubmit={handleEditSubmit}
          loading={formLoading}
          error={formError}
        />
      )}

      {createToast && (
        <div className="products-toast" role="status">
          <p className="products-toast__title">Producto creado</p>
          {createToast === 'first' && (
            <p className="products-toast__hint">Probá hacer tu primera venta</p>
          )}
        </div>
      )}
    </div>
  )
}
