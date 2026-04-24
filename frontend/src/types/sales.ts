export type SaleLine = {
  productId: number
  quantity: number
}

export type CreateSaleRequest = {
  items: SaleLine[]
}

export type RecentSale = {
  id: number
  createdAt: string
  total: string
  itemCount: number
}

export type SaleDetailItem = {
  productName: string
  quantity: number
}

export type SaleDetail = {
  id: number
  createdAt: string
  total: string
  items: SaleDetailItem[]
}
