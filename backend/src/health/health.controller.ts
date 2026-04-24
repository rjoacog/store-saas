import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Comprueba que la app puede hablar con Postgres (útil en Railway). */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1 AS ok`;
      return { status: 'ok', database: 'up' as const };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'unknown error';
      return { status: 'error', database: 'down' as const, message };
    }
  }
}
