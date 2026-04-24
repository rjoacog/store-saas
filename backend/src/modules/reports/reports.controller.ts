import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  private static readonly MOCK_STORE_ID = 1;

  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  getSalesSummary() {
    return this.reportsService.getSalesSummary(ReportsController.MOCK_STORE_ID);
  }

  @Get('top-products')
  getTopProductsReport() {
    return this.reportsService.getTopProducts(ReportsController.MOCK_STORE_ID);
  }
}
