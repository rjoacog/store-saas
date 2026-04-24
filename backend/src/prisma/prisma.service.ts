import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Prisma 7 exige `new PrismaClient({ adapter })` (no admite `new PrismaClient()` vacío).
 * SSL condicional: interno Railway sin TLS; proxy público / sslmode=require con TLS.
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

    // `postgres.railway.internal` suele ir sin TLS; forzar `ssl` puede romperla.
    // Hosts públicos (proxy.rlwy.net) o `sslmode=require` en el string sí usan SSL.
    const host = (() => {
      try {
        return new URL(
          url.replace(/^postgresql:\/\//i, 'https://'),
        ).hostname;
      } catch {
        return '';
      }
    })();
    const isInternalRailway = host.includes('railway.internal');
    const isPublicProxy =
      host.includes('proxy.rlwy.net') || host.includes('shuttle');
    const urlWantsSsl = /sslmode=require|ssl=true/i.test(url);
    const useSsl: false | { rejectUnauthorized: false } = isInternalRailway
      ? false
      : isPublicProxy || urlWantsSsl
        ? { rejectUnauthorized: false }
        : false;

    const pool = new Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
      ssl: useSsl,
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
