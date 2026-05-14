import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { StoreScopedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StoreGuard } from '../auth/guards/store.guard.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, StoreGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  getSalesSummary(@Req() req: StoreScopedRequest) {
    return this.reportsService.getSalesSummary(req.storeId);
  }

  @Get('top-products')
  getTopProductsReport(@Req() req: StoreScopedRequest) {
    return this.reportsService.getTopProducts(req.storeId);
  }
}
