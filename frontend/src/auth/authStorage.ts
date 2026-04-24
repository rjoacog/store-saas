const TOKEN_KEY = 'drugstore_token'
const STORE_ID_KEY = 'drugstore_selected_store_id'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token == null) {
    localStorage.removeItem(TOKEN_KEY)
  } else {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

export function getSelectedStoreId(): number | null {
  const v = localStorage.getItem(STORE_ID_KEY)
  if (v == null) {
    return null
  }
  const n = parseInt(v, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

export function setSelectedStoreId(id: number | null): void {
  if (id == null) {
    localStorage.removeItem(STORE_ID_KEY)
  } else {
    localStorage.setItem(STORE_ID_KEY, String(id))
  }
}

export function clearSession(): void {
  setToken(null)
  setSelectedStoreId(null)
}
