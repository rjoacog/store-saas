export type UserStore = {
  id: number
  name: string
  role: string
}

export type MeResponse = {
  id: number
  email: string
  stores: UserStore[]
}

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'needsStore'
  | 'ready'
