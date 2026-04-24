import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthRequest } from '../auth.types.js';

type RequestWithUser = AuthRequest & { storeId?: number };

@Injectable()
export class StoreGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;
    if (user == null) {
      throw new ForbiddenException();
    }

    const raw = req.headers['x-store-id'];
    const idStr = Array.isArray(raw) ? raw[0] : raw;
    if (idStr == null || idStr === '') {
      throw new BadRequestException('x-store-id header is required');
    }
    const storeId = parseInt(String(idStr), 10);
    if (!Number.isInteger(storeId) || storeId < 1) {
      throw new BadRequestException('x-store-id must be a positive integer');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id, storeId },
    });
    if (membership == null) {
      throw new ForbiddenException();
    }

    req.storeId = storeId;
    return true;
  }
}
