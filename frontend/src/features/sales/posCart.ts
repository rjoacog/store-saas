import type { Product } from '../../types/product'

/**
 * Línea de carrito con datos para UI y API (envío como { productId, quantity }).
 */
export type CartLine = {
  productId: number
  name: string
  unitPrice: string
  quantity: number
}

export function lineSubtotal(line: CartLine): string {
  const n = parseFloat(line.unitPrice) * line.quantity
  if (Number.isNaN(n)) {
    return '0.00'
  }
  return n.toFixed(2)
}

export function cartToSaleItems(lines: CartLine[]) {
  return lines.map((l) => ({ productId: l.productId, quantity: l.quantity }))
}

/**
 * Suma 1 al carrito. Respeta stock disponible; si agrega, devuelve [nextLines, null], si no, [lines, errorMsg].
 */
export function addOneUnit(
  lines: CartLine[],
  product: Product,
): { lines: CartLine[]; error: string | null } {
  if (product.stock < 1) {
    return { lines, error: 'Sin stock.' }
  }
  const i = lines.findIndex((l) => l.productId === product.id)
  if (i === -1) {
    return {
      lines: [
        ...lines,
        {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: 1,
        },
      ],
      error: null,
    }
  }
  const next = [...lines]
  if (next[i].quantity >= product.stock) {
    return { lines, error: 'No hay stock suficiente.' }
  }
  next[i] = { ...next[i], quantity: next[i].quantity + 1 }
  return { lines: next, error: null }
}
