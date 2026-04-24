import {
  getSelectedStoreId,
  getToken,
} from '../auth/authStorage'
import type { MeResponse } from '../auth/types'
import type {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from '../types/product'
import type {
  CreateSaleRequest,
  RecentSale,
  SaleDetail,
  SaleLine,
} from '../types/sales'
import type { TopProduct } from '../types/reports'

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

/** Cabeceras con Bearer y x-store-id cuando existan. */
export function getAuthHeaders(
  withJson: boolean = false,
): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (withJson) {
    h['Content-Type'] = 'application/json'
  }
  const t = getToken()
  if (t) {
    h['Authorization'] = `Bearer ${t}`
  }
  const sid = getSelectedStoreId()
  if (sid != null) {
    h['x-store-id'] = String(sid)
  }
  return h
}

async function parseErrorMessage(res: Response, fallback: string) {
  const text = await res.text()
  if (!text) {
    return fallback
  }
  try {
    const data = JSON.parse(text) as { message?: string | string[] }
    if (Array.isArray(data.message)) {
      return data.message.join(', ')
    }
    if (typeof data.message === 'string') {
      return data.message
    }
  } catch {
    // not JSON
  }
  return text
}

export async function postRegister(
  email: string,
  password: string,
  storeName: string,
): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, storeName }),
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as { accessToken: string }
}

export async function postLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as { accessToken: string }
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch(`${API_URL}/me`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as MeResponse
}

export async function fetchSalesSummary() {
  const res = await fetch(`${API_URL}/reports/sales-summary`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return res.json()
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as Product[]
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { ...getAuthHeaders(true) },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as Product
}

export async function updateProduct(
  id: number,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(true) },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as Product
}

export async function fetchTopProducts(): Promise<TopProduct[]> {
  const res = await fetch(`${API_URL}/reports/top-products`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as TopProduct[]
}

export async function createSale(items: SaleLine[]): Promise<{ id: number }> {
  const body: CreateSaleRequest = { items }
  const res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: { ...getAuthHeaders(true) },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as { id: number }
}

export async function fetchSaleDetail(saleId: number): Promise<SaleDetail> {
  const res = await fetch(`${API_URL}/sales/${saleId}`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as SaleDetail
}

export async function fetchRecentSales(limit: number = 10): Promise<RecentSale[]> {
  const q = new URLSearchParams({ limit: String(limit) })
  const res = await fetch(`${API_URL}/sales?${q}`, {
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok) {
    throw new Error(
      await parseErrorMessage(res, `Error ${res.status}`),
    )
  }
  return (await res.json()) as RecentSale[]
}
