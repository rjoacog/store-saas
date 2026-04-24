import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ApiErrorText } from '../../components/ApiErrorText';
import { createSale, fetchProducts } from '../../services/api';
import type { Product } from '../../types/product';
import {
  addOneUnit,
  cartToSaleItems,
  lineSubtotal,
  type CartLine,
} from './posCart';
import { formatCurrency } from '../../lib/formatCurrency';
import { findProduct, getSearchSuggestions } from './posSearch';
import { PosSalesHistory } from './PosSalesHistory';
import './POS.css';

function cartTotalPrice(lines: CartLine[]): string {
  const n = lines.reduce(
    (sum, l) => sum + parseFloat(l.unitPrice) * l.quantity,
    0,
  );
  return Number.isNaN(n) ? '0.00' : n.toFixed(2);
}

function removeLine(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

/**
 * Baja 1 u.; si queda en 0, quita la línea.
 */
function decreaseLine(lines: CartLine[], productId: number): CartLine[] {
  const i = lines.findIndex((l) => l.productId === productId);
  if (i === -1) {
    return lines;
  }
  const q = lines[i].quantity;
  if (q <= 1) {
    return removeLine(lines, productId);
  }
  const next = [...lines];
  next[i] = { ...next[i], quantity: q - 1 };
  return next;
}

const feedbackClearMs = 2500;

export type POSProps = {
  onGoToCatalog?: () => void;
  /** Tras un cobro exitoso (para actualizar resumen/ranking en el padre). */
  onSaleComplete?: () => void;
};

export function POS({ onGoToCatalog, onSaleComplete }: POSProps = {}) {
  const { selectedStoreId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [lastOk, setLastOk] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [salePanelHighlight, setSalePanelHighlight] = useState(false);
  const [salesHistoryTick, setSalesHistoryTick] = useState(0);
  const [highlightSaleId, setHighlightSaleId] = useState<number | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salePanelHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const highlightSaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [firstSaleHint, setFirstSaleHint] = useState(false);
  const [searchPulse, setSearchPulse] = useState(false);

  const suggestions = useMemo(
    () => getSearchSuggestions(products, searchQuery, 5),
    [products, searchQuery],
  );

  const showSearchDropdown =
    searchQuery.trim().length > 0 && !productsLoading && !productsError;

  const focusSearchInput = useCallback(() => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, []);

  const showAddedFeedback = useCallback((productName: string) => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setAddFeedback(`Añadido: ${productName}`);
    feedbackTimer.current = setTimeout(() => {
      setAddFeedback(null);
      feedbackTimer.current = null;
    }, feedbackClearMs);

    if (salePanelHighlightTimer.current) {
      clearTimeout(salePanelHighlightTimer.current);
    }
    setSalePanelHighlight(true);
    salePanelHighlightTimer.current = setTimeout(() => {
      setSalePanelHighlight(false);
      salePanelHighlightTimer.current = null;
    }, 550);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
      if (salePanelHighlightTimer.current) {
        clearTimeout(salePanelHighlightTimer.current);
      }
      if (highlightSaleTimer.current) {
        clearTimeout(highlightSaleTimer.current);
      }
    },
    [],
  );

  const loadProducts = useCallback(async (options?: { silent?: boolean }) => {
    if (selectedStoreId == null) {
      setProductsError(null);
      setProducts([]);
      if (!options?.silent) {
        setProductsLoading(false);
      }
      return;
    }
    try {
      const all = await fetchProducts();
      setProductsError(null);
      setProducts(
        all.filter((p) => p.storeId === selectedStoreId),
      );
    } catch (e: unknown) {
      setProductsError(
        e instanceof Error ? e.message : 'No se pudieron cargar los productos.',
      );
    } finally {
      if (!options?.silent) {
        setProductsLoading(false);
      }
    }
  }, [selectedStoreId]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(t);
  }, [loadProducts]);

  useEffect(() => {
    setFirstSaleHint(false);
  }, [selectedStoreId]);

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    if (sessionStorage.getItem('pos_search_pulse') !== '1') {
      return;
    }
    sessionStorage.removeItem('pos_search_pulse');
    setSearchPulse(true);
    const t = setTimeout(() => {
      setSearchPulse(false);
    }, 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (selectedStoreId == null || productsLoading) {
      return;
    }
    if (sessionStorage.getItem('pos_show_first_sale_hint') !== '1') {
      return;
    }
    if (products.length === 0) {
      return;
    }
    const seenKey = `pos_first_sale_hint_${selectedStoreId}`;
    if (sessionStorage.getItem(seenKey) === '1') {
      sessionStorage.removeItem('pos_show_first_sale_hint');
      return;
    }
    setFirstSaleHint(true);
    sessionStorage.removeItem('pos_show_first_sale_hint');
  }, [products.length, productsLoading, selectedStoreId]);

  const dismissFirstSaleHint = useCallback(() => {
    if (selectedStoreId != null) {
      sessionStorage.setItem(
        `pos_first_sale_hint_${selectedStoreId}`,
        '1',
      );
    }
    setFirstSaleHint(false);
  }, [selectedStoreId]);

  const highlightIndex = useMemo(() => {
    if (suggestions.length === 0) {
      return 0;
    }
    return Math.min(
      Math.max(0, suggestionIndex),
      suggestions.length - 1,
    );
  }, [suggestions, suggestionIndex]);

  const addOneToCart = useCallback(
    (product: Product, onAdded?: () => void) => {
      setError(null);
      setLastOk(false);
      setLines((prev) => {
        const { lines: next, error: addErr } = addOneUnit(prev, product);
        if (addErr) {
          queueMicrotask(() => setError(addErr));
          return prev;
        }
        queueMicrotask(() => {
          onAdded?.();
          showAddedFeedback(product.name);
        });
        return next;
      });
    },
    [showAddedFeedback],
  );

  const selectFromSuggestion = useCallback(
    (product: Product) => {
      if (product.stock < 1) {
        return;
      }
      addOneToCart(product, () => {
        setSearchQuery('');
        setSuggestionIndex(0);
        focusSearchInput();
      });
    },
    [addOneToCart, focusSearchInput],
  );

  function handleProductClick(product: Product) {
    if (product.stock < 1) {
      return;
    }
    addOneToCart(product, focusSearchInput);
  }

  const handleSearchSubmit = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) {
      return;
    }
    if (productsLoading) {
      return;
    }
    const product = findProduct(products, q);
    if (!product) {
      setError('Producto no encontrado');
      setLastOk(false);
      setAddFeedback(null);
      focusSearchInput();
      return;
    }
    if (product.stock < 1) {
      setError('Sin stock');
      setLastOk(false);
      setAddFeedback(null);
      focusSearchInput();
      return;
    }
    addOneToCart(product, () => {
      setSearchQuery('');
      setSuggestionIndex(0);
      focusSearchInput();
    });
  }, [
    searchQuery,
    products,
    productsLoading,
    addOneToCart,
    focusSearchInput,
  ]);

  function handleDecrease(productId: number) {
    setError(null);
    setLines((prev) => decreaseLine(prev, productId));
    focusSearchInput();
  }

  function handleRemove(productId: number) {
    setError(null);
    setLines((prev) => removeLine(prev, productId));
    focusSearchInput();
  }

  async function sell() {
    if (lines.length === 0) {
      setError('Añadí al menos un producto al ticket para cobrar.');
      return;
    }
    setError(null);
    setLastOk(false);
    setAddFeedback(null);
    setSelling(true);
    try {
      const created = await createSale(cartToSaleItems(lines));
      setLines([]);
      setLastOk(true);
      if (highlightSaleTimer.current) {
        clearTimeout(highlightSaleTimer.current);
      }
      setHighlightSaleId(created.id);
      highlightSaleTimer.current = setTimeout(() => {
        setHighlightSaleId(null);
        highlightSaleTimer.current = null;
      }, 5000);
      setSalesHistoryTick((n) => n + 1);
      onSaleComplete?.();
      await loadProducts({ silent: true });
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'No se pudo completar la venta.',
      );
    } finally {
      setSelling(false);
      focusSearchInput();
    }
  }

  const outOfStock = (p: Product) => p.stock < 1;

  return (
    <div className="pos-page">
      <section className="pos-section" aria-labelledby="pos-heading">
        <header className="pos-header">
          <h2 id="pos-heading" className="pos-title">
            Punto de venta
          </h2>
          <p className="pos-lead">
            Buscá, Enter o clics. Ajustá con <strong>−</strong> o{' '}
            <strong>Quitar</strong> en el ticket.
          </p>
        </header>

        {selectedStoreId == null && (
          <p className="pos-banner pos-banner--error" role="status">
            No hay una tienda seleccionada. Elegí una sucursal en la barra
            superior.
          </p>
        )}

        {productsError && (
          <ApiErrorText
            message={productsError}
            className="pos-banner pos-banner--error"
          />
        )}
        <ApiErrorText
          message={error}
          className="pos-banner pos-banner--error"
        />
        {addFeedback && (
          <p className="pos-banner pos-banner--success" role="status">
            {addFeedback}
          </p>
        )}
        {lastOk && (
          <p className="pos-banner pos-banner--success" role="status">
            Venta registrada. Listo para el siguiente cliente.
          </p>
        )}

        {firstSaleHint && products.length > 0 && (
          <div className="pos-hint-banner" role="status">
            <span className="pos-hint-banner__text">
              Probá hacer tu primera venta
            </span>
            <button
              type="button"
              className="pos-hint-banner__ok"
              onClick={dismissFirstSaleHint}
            >
              Entendido
            </button>
          </div>
        )}

        <div className="pos-workspace">
          <div
            className={
              'pos-search-hero' +
              (searchPulse ? ' pos-search-hero--pulse' : '')
            }
          >
            <label className="pos-search-hero__label" htmlFor="pos-search-input">
              Buscar o escanear
            </label>
            <div className="pos-search pos-search--with-icon">
              <span className="pos-search__icon" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.2 15.2 20 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="pos-search-input"
                className="pos-input pos-input--search"
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionIndex(0);
                  if (error === 'Producto no encontrado') {
                    setError(null);
                  }
                }}
                onKeyDown={(e) => {
                  const n = suggestions.length;
                  if (e.key === 'ArrowDown' && n > 0) {
                    e.preventDefault();
                    setSuggestionIndex((i) => Math.min(i + 1, n - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp' && n > 0) {
                    e.preventDefault();
                    setSuggestionIndex((i) => Math.max(0, i - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const q = searchQuery.trim();
                    if (/^\d+$/.test(q) && q.length > 0) {
                      void handleSearchSubmit();
                      return;
                    }
                    const pick = suggestions[highlightIndex];
                    if (n > 0 && pick !== undefined) {
                      selectFromSuggestion(pick);
                      return;
                    }
                    void handleSearchSubmit();
                  }
                }}
                placeholder="Escribí o escaneá: Enter para añadir al ticket"
                autoFocus
                disabled={!!productsError || productsLoading}
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={showSearchDropdown}
                aria-activedescendant={
                  showSearchDropdown && suggestions.length > 0
                    ? `pos-suggestion-${suggestions[highlightIndex].id}`
                    : undefined
                }
                aria-label="Buscar o escanear producto"
              />
              {showSearchDropdown && (
                <ul
                  id="pos-suggestions-list"
                  className="pos-suggest-list"
                  role="listbox"
                >
                  {suggestions.length === 0 && (
                    <li
                      className="pos-suggest-empty"
                      role="presentation"
                    >
                      Sin resultados
                    </li>
                  )}
                  {suggestions.map((p, i) => (
                    <li key={p.id} role="none">
                      <button
                        type="button"
                        id={`pos-suggestion-${p.id}`}
                        className={
                          'pos-suggest-btn' +
                          (i === highlightIndex
                            ? ' pos-suggest-btn--active'
                            : '')
                        }
                        role="option"
                        aria-selected={i === highlightIndex}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setSuggestionIndex(i)}
                        onClick={() => selectFromSuggestion(p)}
                      >
                        {p.name}
                        <span className="pos-suggest-meta">
                          {' '}
                          · {formatCurrency(p.price)} (stock {p.stock})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="pos-columns">
            <div className="pos-card pos-card--catalog">
              <h3>Catálogo</h3>
              {productsLoading && (
                <p className="pos-muted">Cargando productos…</p>
              )}
              {!productsLoading && products.length === 0 && !productsError && (
                <div className="pos-catalog-empty pos-catalog-empty--cta" role="status">
                  <p className="pos-catalog-empty__msg">
                    Primero agregá productos en Catálogo
                  </p>
                  {onGoToCatalog && (
                    <button
                      type="button"
                      className="pos-catalog-empty__btn"
                      onClick={onGoToCatalog}
                    >
                      Ir a Catálogo
                    </button>
                  )}
                </div>
              )}
              {!productsLoading && products.length > 0 && (
                <ul className="pos-catalog-list">
                  {products.map((p) => {
                    const disabled = outOfStock(p);
                    return (
                      <li key={p.id}>
                        <button
                          className="pos-product-btn"
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleProductClick(p)}
                          disabled={disabled}
                          aria-label={
                            disabled
                              ? `${p.name} sin stock`
                              : `Añadir ${p.name} al ticket`
                          }
                        >
                          <span
                            className={
                              'pos-product-name' +
                              (disabled ? ' pos-product-name--struck' : '')
                            }
                          >
                            {p.name}
                          </span>
                          <span className="pos-product-meta">
                            Precio: {formatCurrency(p.price)} · Stock: {p.stock}
                            {disabled && (
                              <em> — Sin stock</em>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="pos-column-right">
            <div
              className={
                'pos-card pos-card--sale' +
                (salePanelHighlight ? ' pos-card--sale--flash' : '')
              }
            >
              <h3>Ticket</h3>
              {lines.length === 0 && (
                <p className="pos-empty-sale">
                  <span className="pos-empty-sale__action">Empezá acá:</span>{' '}
                  buscá arriba o elegí un producto del catálogo — se suman al
                  ticket con un toque o con Enter.
                </p>
              )}
              {lines.length > 0 && (
                <div className="pos-table-wrap">
                  <table className="pos-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="pos-table-num">Cant.</th>
                        <th className="pos-table-num">Subtotal</th>
                        <th className="pos-table-actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.productId}>
                          <td>{l.name}</td>
                          <td className="pos-table-num">{l.quantity}</td>
                          <td className="pos-table-num">
                            {formatCurrency(lineSubtotal(l))}
                          </td>
                          <td className="pos-table-actions">
                            <button
                              type="button"
                              className="pos-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleDecrease(l.productId)}
                              title="Bajar 1 u."
                            >
                              −
                            </button>
                            <button
                              type="button"
                              className="pos-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleRemove(l.productId)}
                              title="Quitar producto"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {lines.length > 0 && (
                <div className="pos-total-hero" aria-live="polite">
                  <p className="pos-total-hero__label">Total a cobrar</p>
                  <p className="pos-total-hero__value">
                    {formatCurrency(cartTotalPrice(lines))}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="pos-btn-primary"
                onMouseDown={(e) => e.preventDefault()}
                onClick={sell}
                disabled={selling || lines.length === 0}
              >
                {selling ? 'Cobrando…' : 'Cobrar'}
              </button>
            </div>
            <PosSalesHistory
              selectedStoreId={selectedStoreId}
              refreshKey={salesHistoryTick}
              highlightSaleId={highlightSaleId}
            />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
