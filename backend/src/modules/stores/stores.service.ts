import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.store.findMany({ orderBy: { id: 'asc' } });
  }
}
