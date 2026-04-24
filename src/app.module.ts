import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StoresModule } from './modules/stores/stores.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    StoresModule,
    ProductsModule,
    SalesModule,
    ReportsModule,
  ],
})
export class AppModule {}
