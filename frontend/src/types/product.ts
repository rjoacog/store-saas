/**
 * Fila de producto tal como viene de GET /products
 */
export type Product = {
  id: number
  name: string
  price: string
  stock: number
  barcode: string
  storeId: number
  store?: { id: number; name: string }
}

export type CreateProductPayload = {
  name: string
  price: number
  stock: number
  barcode?: string
}

export type UpdateProductPayload = {
  name?: string
  price?: number
  stock?: number
}
