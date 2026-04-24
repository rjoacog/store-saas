import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { StoreScopedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StoreGuard } from '../auth/guards/store.guard.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { SalesService } from './sales.service.js';

@Controller('sales')
export class SalesController {
  /** Sustituir por el store resuelto desde auth (guard / decorator). */
  private static readonly MOCK_STORE_ID = 1;

  constructor(private readonly salesService: SalesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, StoreGuard)
  findRecent(
    @Req() req: StoreScopedRequest,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.salesService.findRecentForStore(req.storeId, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, StoreGuard)
  findOne(
    @Req() req: StoreScopedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.salesService.findOneForStore(id, req.storeId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.createSale(dto, SalesController.MOCK_STORE_ID);
  }
}
