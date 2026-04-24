import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (connectionString == null || connectionString === '') {
  throw new Error('DATABASE_URL is required to run the seed');
}

const prisma = new PrismaClient();

const ITEMS: { name: string; price: number; stock: number }[] = [
  { name: 'Coca Cola 500ml', price: 2500, stock: 20 },
  { name: 'Pepsi 500ml', price: 2300, stock: 15 },
  { name: 'Agua Mineral', price: 1500, stock: 30 },
  { name: 'Papas Lays', price: 2000, stock: 10 },
  { name: 'Chocolate Milka', price: 3000, stock: 8 },
  { name: 'Galletitas Oreo', price: 1800, stock: 12 },
];

async function main() {
  const store = await prisma.store.upsert({
    where: { id: 1 },
    create: { id: 1, name: 'Tienda principal' },
    update: { name: 'Tienda principal' },
  });

  const adminEmail = 'admin@example.com';
  const adminPassword = 'password';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash },
    update: { passwordHash },
  });
  await prisma.membership.upsert({
    where: {
      userId_storeId: { userId: user.id, storeId: store.id },
    },
    create: { userId: user.id, storeId: store.id, role: 'ADMIN' },
    update: { role: 'ADMIN' },
  });
  console.log(
    `Seed: usuario ${adminEmail} (pass: ${adminPassword}) con rol ADMIN en store ${store.id}.`,
  );

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const barcode = `SEED-${String(i + 1).padStart(4, '0')}`;

    await prisma.product.upsert({
      where: { barcode },
      create: {
        name: item.name,
        price: new Prisma.Decimal(item.price),
        stock: item.stock,
        storeId: store.id,
        barcode,
      },
      update: {
        name: item.name,
        price: new Prisma.Decimal(item.price),
        stock: item.stock,
        storeId: store.id,
      },
    });
  }

  console.log(
    `Seed: ${ITEMS.length} productos vinculados a store id=${store.id}.`,
  );
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
