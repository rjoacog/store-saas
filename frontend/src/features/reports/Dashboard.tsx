import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ApiErrorText } from '../../components/ApiErrorText';
import { formatCurrency } from '../../lib/formatCurrency';
import { fetchSalesSummary, fetchTopProducts } from '../../services/api';
import type { SalesSummary, TopProduct } from '../../types/reports';
import './Dashboard.css';

type DashboardProps = {
  /** Se incrementa tras una venta en el POS para volver a pedir resumen y ranking. */
  reportsRefreshKey?: number;
};

export function Dashboard({ reportsRefreshKey = 0 }: DashboardProps) {
  const { selectedStoreId } = useAuth();
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastStoreIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedStoreId == null) {
      lastStoreIdRef.current = null;
      setSummary(null);
      setTopProducts(null);
      setError(null);
      setLoading(false);
      return;
    }
    const storeSwitched = lastStoreIdRef.current !== selectedStoreId;
    if (storeSwitched) {
      lastStoreIdRef.current = selectedStoreId;
    }

    let cancelled = false;
    if (storeSwitched) {
      setLoading(true);
    }
    setError(null);
    void Promise.all([fetchSalesSummary(), fetchTopProducts()])
      .then(([sum, top]) => {
        if (!cancelled) {
          setSummary(sum);
          setTopProducts(top);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Error al cargar el resumen',
          );
        }
      })
      .finally(() => {
        if (!cancelled && storeSwitched) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStoreId, reportsRefreshKey]);

  if (loading) {
    return (
      <div className="dashboard-compact">
        <p className="dashboard-compact__loading">Cargando resumen…</p>
      </div>
    );
  }

  if (selectedStoreId == null) {
    return (
      <div className="dashboard-compact">
        <h2 className="dashboard-compact__title">Resumen y ranking</h2>
        <p className="dashboard-compact__loading" style={{ margin: 0 }}>
          Elegí una tienda en la barra superior para ver el resumen.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-compact">
      <h2 className="dashboard-compact__title">Resumen y ranking</h2>
      <ApiErrorText message={error} className="dashboard-compact__error" />
      {summary && (
        <ul className="dashboard-compact__stats">
          <li>
            <strong>Ingresos</strong>{' '}
            {formatCurrency(summary.totalRevenue)}
          </li>
          <li>
            <strong>Ventas</strong> {summary.totalSales}
          </li>
          <li>
            <strong>Ítems</strong> {summary.totalItemsSold}
          </li>
        </ul>
      )}
      {topProducts && topProducts.length > 0 && (
        <div className="dashboard-compact__top">
          <strong>Top productos</strong>
          <ol>
            {topProducts.map((p) => (
              <li key={p.productId}>
                {p.productName} — {p.totalSold} uds.
              </li>
            ))}
          </ol>
        </div>
      )}
      {topProducts && topProducts.length === 0 && summary && (
        <p className="dashboard-compact__top" style={{ margin: 0 }}>
          Sin ventas aún.
        </p>
      )}
    </div>
  );
}
