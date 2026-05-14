import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: number) {
    return this.prisma.store.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { id: 'asc' },
    });
  }
}
