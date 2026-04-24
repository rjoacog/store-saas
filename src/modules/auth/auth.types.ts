import type { Request } from 'express';

export type AuthRequest = Request & {
  user: { id: number; email: string };
};

/** Tras `JwtAuthGuard` + `StoreGuard`: cabecera `x-store-id` validada contra `Membership`. */
export type StoreScopedRequest = AuthRequest & {
  storeId: number;
};
