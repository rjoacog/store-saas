import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Read DATABASE_URL directly from process.env so that Railway's variable
    // references (e.g. ${{ Postgres.DATABASE_URL }}) are resolved at runtime
    // before NestJS's ConfigService has a chance to evaluate them.
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
          'Make sure the Railway Postgres service reference is configured correctly.',
      );
    }

    // Log the host portion only — never log credentials.
    try {
      const { host, port, pathname } = new URL(connectionString);
      // eslint-disable-next-line no-console
      console.log(
        `[PrismaService] Connecting to database at ${host}:${port}${pathname}`,
      );
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[PrismaService] Could not parse DATABASE_URL for logging.');
    }

    // Pool explícito: timeouts altos evitan P2028 en PaaS (latencia / cold DB en Railway, etc.)
    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 30_000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Prisma connection…');
    await this.$connect();
    this.logger.log('Prisma connected successfully.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
