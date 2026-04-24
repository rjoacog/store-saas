import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

function randomBarcodeSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForStore(storeId: number) {
    return this.prisma.product.findMany({
      where: { storeId },
      orderBy: { id: 'asc' },
      include: { store: { select: { id: true, name: true } } },
    });
  }

  async createForStore(storeId: number, dto: CreateProductDto) {
    const trimmedBarcode = dto.barcode?.trim();
    const barcode =
      trimmedBarcode && trimmedBarcode.length > 0
        ? trimmedBarcode
        : `AUTO-${storeId}-${Date.now()}-${randomBarcodeSuffix()}`;

    try {
      return await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          price: new Prisma.Decimal(dto.price),
          stock: dto.stock,
          barcode,
          storeId,
        },
        include: { store: { select: { id: true, name: true } } },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Barcode already in use');
      }
      throw e;
    }
  }

  async updateForStore(
    storeId: number,
    productId: number,
    dto: UpdateProductDto,
  ) {
    const found = await this.prisma.product.findFirst({
      where: { id: productId, storeId },
    });
    if (found == null) {
      throw new NotFoundException('Product not found');
    }

    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.price !== undefined) {
      data.price = new Prisma.Decimal(dto.price);
    }
    if (dto.stock !== undefined) {
      data.stock = dto.stock;
    }

    return this.prisma.product.update({
      where: { id: productId },
      data,
      include: { store: { select: { id: true, name: true } } },
    });
  }
}
