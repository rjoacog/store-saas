import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma “clásico” (query engine) sin @prisma/adapter-pg.
 * En Railway el pool de `pg` a veces corta con “Connection timeout” / P2028;
 * el client nativo evita esa capa y usa el pool de Prisma.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (url == null || url === '') {
      throw new Error(
        'DATABASE_URL is not set. In Railway, reference the Postgres plugin URL.',
      );
    }
    // Prisma 7: la URL viene de DATABASE_URL (prisma.config / entorno).
    super();
    try {
      const { host, port, pathname } = new URL(url);
      this.logger.log(`DB target: ${host}:${port}${pathname}`);
    } catch {
      this.logger.warn('Could not parse DATABASE_URL for logging only.');
    }
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Prisma: connecting…');
    await this.$connect();
    this.logger.log('Prisma: connected.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
