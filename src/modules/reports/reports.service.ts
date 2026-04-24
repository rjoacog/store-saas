import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type TopProduct = {
  productId: number;
  productName: string;
  totalSold: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary(storeId: number) {
    const [salesAgg, itemAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { storeId },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.saleItem.aggregate({
        where: { sale: { storeId } },
        _sum: { quantity: true },
      }),
    ]);

    return {
      totalRevenue: (salesAgg._sum.total?.toString() ?? '0') as string,
      totalSales: salesAgg._count._all,
      totalItemsSold: itemAgg._sum.quantity ?? 0,
    };
  }

  async getTopProducts(storeId: number): Promise<TopProduct[]> {
    const rankedProducts = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { storeId } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    if (rankedProducts.length === 0) {
      return [];
    }

    const productIds = rankedProducts.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, storeId },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    return rankedProducts.map((row) => ({
      productId: row.productId,
      productName: nameById.get(row.productId) ?? 'Unknown',
      totalSold: row._sum.quantity ?? 0,
    }));
  }
}
