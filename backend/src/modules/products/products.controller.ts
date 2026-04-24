import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { StoreScopedRequest } from '../auth/auth.types.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { StoreGuard } from '../auth/guards/store.guard.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
@UseGuards(JwtAuthGuard, StoreGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Req() req: StoreScopedRequest) {
    return this.productsService.findAllForStore(req.storeId);
  }

  @Post()
  create(@Req() req: StoreScopedRequest, @Body() dto: CreateProductDto) {
    return this.productsService.createForStore(req.storeId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: StoreScopedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateForStore(req.storeId, id, dto);
  }
}
