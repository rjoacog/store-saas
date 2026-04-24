import type { Product } from '../../types/product';

/**
 * a) Término solo numérico: coincide por `id` exacto.
 * b) Cualquier otro caso: primero coincidencia exacta de nombre (ignora mayúsculas);
 *    si no hay, el primer producto cuyo nombre contiene el término.
 */
export function findProduct(products: Product[], raw: string): Product | null {
  const q = raw.trim();
  if (q.length === 0) {
    return null;
  }
  if (/^\d+$/.test(q)) {
    const id = Number.parseInt(q, 10);
    return products.find((p) => p.id === id) ?? null;
  }
  const lower = q.toLowerCase();
  const exact = products.find((p) => p.name.toLowerCase() === lower);
  if (exact) {
    return exact;
  }
  return (
    products.find((p) => p.name.toLowerCase().includes(lower)) ?? null
  );
}

const DEFAULT_SUGGESTION_LIMIT = 5;

/**
 * Sugerencias de autocompletado: nombre contiene el término, solo `stock > 0`.
 */
export function getSearchSuggestions(
  products: Product[],
  raw: string,
  limit: number = DEFAULT_SUGGESTION_LIMIT,
): Product[] {
  const q = raw.trim().toLowerCase();
  if (q.length === 0) {
    return [];
  }
  return products
    .filter(
      (p) => p.stock > 0 && p.name.toLowerCase().includes(q),
    )
    .slice(0, limit);
}
