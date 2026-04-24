import { useCallback, useEffect, useId, useState } from 'react'
import { formatCurrency } from '../../lib/formatCurrency'
import { fetchRecentSales, fetchSaleDetail } from '../../services/api'
import type { RecentSale, SaleDetail } from '../../types/sales'
import { formatRelativeSaleDate } from './saleDateUtils'

type PosSalesHistoryProps = {
  selectedStoreId: number | null
  refreshKey: number
  highlightSaleId: number | null
}

function SaleDetailModal({
  sale,
  onClose,
  titleId,
}: {
  sale: SaleDetail
  onClose: () => void
  titleId: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="pos-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="pos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal__head">
          <h4 id={titleId} className="pos-modal__title">
            Detalle de venta
          </h4>
          <button
            type="button"
            className="pos-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <p className="pos-modal__meta">
          {formatRelativeSaleDate(sale.createdAt)}
        </p>
        <ul className="pos-modal__lines">
          {sale.items.map((line, i) => (
            <li key={`${line.productName}-${i}`} className="pos-modal__line">
              <span className="pos-modal__name">{line.productName}</span>
              <span className="pos-modal__qty">×{line.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="pos-modal__total">
          <span>Total</span>
          <strong>{formatCurrency(sale.total)}</strong>
        </p>
        <button
          type="button"
          className="pos-modal__btn"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export function PosSalesHistory({
  selectedStoreId,
  refreshKey,
  highlightSaleId,
}: PosSalesHistoryProps) {
  const modalTitleId = useId()
  const [rows, setRows] = useState<RecentSale[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [detail, setDetail] = useState<SaleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const closeDetail = useCallback(() => {
    setDetail(null)
    setDetailError(null)
  }, [])

  const openDetail = useCallback(
    (saleId: number) => {
      setDetail(null)
      setDetailError(null)
      setDetailLoading(true)
      void fetchSaleDetail(saleId)
        .then((d) => {
          setDetail(d)
        })
        .catch((e: unknown) => {
          setDetailError(
            e instanceof Error ? e.message : 'No se pudo cargar el detalle',
          )
        })
        .finally(() => {
          setDetailLoading(false)
        })
    },
    [],
  )

  useEffect(() => {
    if (selectedStoreId == null) {
      setRows([])
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchRecentSales(10)
      .then((data) => {
        if (!cancelled) {
          setRows(data)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar ventas')
          setRows(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedStoreId, refreshKey])

  if (selectedStoreId == null) {
    return null
  }

  return (
    <>
      <div className="pos-card pos-card--history" aria-label="Historial de ventas">
        <h3>Últimas ventas</h3>
        {loading && (
          <p className="pos-history-muted">Cargando…</p>
        )}
        {error && !loading && (
          <p className="pos-history-error">{error}</p>
        )}
        {!loading && !error && rows && rows.length === 0 && (
          <p className="pos-history-empty" role="status">
            Todavía no hay ventas registradas en esta tienda. Completá una venta
            para verla acá.
          </p>
        )}
        {!loading && !error && rows && rows.length > 0 && (
          <ul className="pos-history-list">
            {rows.map((s) => {
              const isNew =
                highlightSaleId != null && s.id === highlightSaleId
              return (
                <li key={s.id} className="pos-history-item-wrap">
                  <button
                    type="button"
                    className={
                      'pos-history-item' +
                      (isNew ? ' pos-history-item--highlight' : '')
                    }
                    onClick={() => openDetail(s.id)}
                    aria-label={`Ver detalle de venta del ${formatRelativeSaleDate(s.createdAt)} por ${formatCurrency(s.total)}`}
                  >
                    <span className="pos-history-item__date">
                      {formatRelativeSaleDate(s.createdAt)}
                    </span>
                    <span className="pos-history-item__total">
                      {formatCurrency(s.total)}
                    </span>
                    <span className="pos-history-item__meta">
                      {s.itemCount} ít.
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {detailLoading && (
        <div
          className="pos-modal-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="pos-modal pos-modal--compact">
            <p className="pos-modal__loading">Cargando detalle…</p>
          </div>
        </div>
      )}

      {detailError != null && !detailLoading && (
        <div
          className="pos-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailError(null)
            }
          }}
        >
          <div
            className="pos-modal pos-modal--compact"
            role="alertdialog"
            aria-modal="true"
            aria-live="assertive"
          >
            <p className="pos-modal__error-text">{detailError}</p>
            <button
              type="button"
              className="pos-modal__btn"
              onClick={() => setDetailError(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {detail != null && !detailLoading && (
        <SaleDetailModal
          sale={detail}
          onClose={closeDetail}
          titleId={modalTitleId}
        />
      )}
    </>
  )
}
