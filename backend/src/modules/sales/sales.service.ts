import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(storeId: number) {
    return this.prisma.sale.findMany({
      where: { storeId },
      orderBy: { id: 'desc' },
      include: {
        items: true,
        store: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Últimas ventas de la tienda: total y unidades vendidas (suma de cantidades por ítem).
   */
  async findRecentForStore(storeId: number, limit: number) {
    const take = Math.min(50, Math.max(1, limit));
    const sales = await this.prisma.sale.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        items: { select: { quantity: true } },
      },
    });
    return sales.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      total: s.total.toString(),
      itemCount: s.items.reduce((acc, i) => acc + i.quantity, 0),
    }));
  }

  async findOneForStore(saleId: number, storeId: number) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, storeId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });
    if (sale == null) {
      throw new NotFoundException('Sale not found');
    }
    return {
      id: sale.id,
      createdAt: sale.createdAt.toISOString(),
      total: sale.total.toString(),
      items: sale.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
      })),
    };
  }

  /**
   * Crea una venta con sus ítems, descuenta stock de forma atómica y
   * persiste el precio unitario al momento de la venta.
   */
  async createSale(dto: CreateSaleDto, storeId: number) {
    if (!dto.items?.length) {
      throw new BadRequestException('The sale must include at least one item');
    }

    const productIds = dto.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException(
        'Each product may only appear once per sale',
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      for (const line of dto.items) {
        const product = productById.get(line.productId);
        const invalidForStore = !product || product.storeId !== storeId;
        if (invalidForStore) {
          throw new NotFoundException(
            'One or more products are not available for this store',
          );
        }
      }

      const total = dto.items.reduce((sum, line) => {
        const product = productById.get(line.productId)!;
        return sum.add(product.price.mul(line.quantity));
      }, new Prisma.Decimal(0));

      const linePayload = dto.items.map((line) => {
        const product = productById.get(line.productId)!;
        return {
          productId: line.productId,
          quantity: line.quantity,
          price: product.price,
        };
      });

      const stockDecrements = await Promise.all(
        dto.items.map((line) =>
          tx.product.updateMany({
            where: {
              id: line.productId,
              storeId,
              stock: { gte: line.quantity },
            },
            data: { stock: { decrement: line.quantity } },
          }),
        ),
      );

      if (stockDecrements.some((r) => r.count === 0)) {
        throw new BadRequestException(
          'Insufficient stock to complete this sale',
        );
      }

      await tx.stockMovement.createMany({
        data: dto.items.map((line) => ({
          productId: line.productId,
          storeId,
          quantity: -line.quantity,
          type: 'OUT',
          reason: 'SALE',
        })),
      });

      return tx.sale.create({
        data: {
          storeId,
          total,
          items: { create: linePayload },
        },
        include: {
          items: true,
          store: { select: { id: true, name: true } },
        },
      });
    });
  }
}
