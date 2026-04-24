import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Prisma 7 exige `new PrismaClient({ adapter })` (no admite `new PrismaClient()` vacío).
 * Pool + SSL en producción suelen evitar timeouts con Postgres en Railway.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (url == null || url === '') {
      throw new Error(
        'DATABASE_URL is not set. In Railway, link the Postgres plugin or set the variable.',
      );
    }

    const isProd = process.env.NODE_ENV === 'production';
    const pool = new Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
      ssl: isProd ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;

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
    await this.pool.end();
  }
}
