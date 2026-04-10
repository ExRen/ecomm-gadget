import { PrismaClient, Role, VoucherType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Cleaning and Seeding database...');

  // Reset Database
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productTag.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.voucher.deleteMany();
  console.log('🗑️ Database cleared');

  // Create Super Admin
  const adminPassword = await bcrypt.hash('Admin@123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      password: adminPassword,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('Customer@123!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: customerPassword,
      name: 'John Customer',
      phone: '081234567890',
      role: Role.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log('✅ Customer created:', customer.email);

  // Create Categories
  const categories = [
    { name: 'Smartphones', description: 'Ponsel pintar terbaru dengan teknologi tercanggih', slug: 'smartphones' },
    { name: 'Laptops', description: 'Laptop performa tinggi untuk produktivitas dan gaming', slug: 'laptops' },
    { name: 'Tablets', description: 'Tablet multifungsi untuk kerja dan hiburan', slug: 'tablets' },
    { name: 'Audio', description: 'Pengalaman suara premium dengan headphone dan earphone terbaik', slug: 'audio' },
    { name: 'Wearables', description: 'Jam tangan pintar dan pelacak kebugaran inovatif', slug: 'wearables' },
    { name: 'Accessories', description: 'Aksesoris pendukung gadget Anda', slug: 'accessories' },
  ];

  const createdCategories: any[] = [];
  for (const cat of categories) {
    const category = await prisma.category.create({
      data: cat,
    });
    createdCategories.push(category);
  }
  console.log('✅ Categories created:', createdCategories.length);

  // Create Products
  const products = [
    // Smartphones
    {
      name: 'iPhone 15 Pro Max',
      description: 'The ultimate iPhone with Titanium design, A17 Pro chip, and a pro-level camera system.',
      price: 24999000,
      comparePrice: 26999000,
      sku: 'APL-IP15PM-256',
      stock: 20,
      weight: 221,
      categoryIndex: 0,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Experience the power of AI with Galaxy S24 Ultra. Titanium frame and pro-grade camera.',
      price: 21999000,
      comparePrice: 23999000,
      sku: 'SS-GALS24U-256',
      stock: 25,
      weight: 232,
      categoryIndex: 0,
      isFeatured: true,
    },
    // Laptops
    {
      name: 'MacBook Pro M3 Max 14"',
      description: 'The most advanced chips for personal computers. Mind-blowing performance and battery life.',
      price: 49999000,
      comparePrice: 52999000,
      sku: 'APL-MBPM3X-14',
      stock: 10,
      weight: 1600,
      categoryIndex: 1,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy Book4 Ultra',
      description: 'Premium laptop with Intel Core Ultra 9 and NVIDIA GeForce RTX 4070. Stunning AMOLED display.',
      price: 36999000,
      comparePrice: 38999000,
      sku: 'SS-GB4U-001',
      stock: 15,
      weight: 1860,
      categoryIndex: 1,
      isFeatured: true,
    },
    // Tablets
    {
      name: 'iPad Pro M2 12.9"',
      description: 'Powered by the M2 chip. Incredible performance and a mind-blowing Liquid Retina XDR display.',
      price: 18999000,
      comparePrice: 20499000,
      sku: 'APL-IPDPM2-12',
      stock: 18,
      weight: 682,
      categoryIndex: 2,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy Tab S9 Ultra',
      description: 'Our largest Dynamic AMOLED 2X display. Water and dust resistant. Powerful Snapdragon 8 Gen 2.',
      price: 17999000,
      comparePrice: 19499000,
      sku: 'SS-GTS9U-001',
      stock: 12,
      weight: 732,
      categoryIndex: 2,
      isFeatured: true,
    },
    // Audio
    {
      name: 'AirPods Pro (2nd Generation)',
      description: 'Experience up to 2x more Active Noise Cancellation, plus Adaptive Transparency and Personalized Spatial Audio.',
      price: 3999000,
      comparePrice: 4299000,
      sku: 'APL-APP2-001',
      stock: 50,
      weight: 50,
      categoryIndex: 3,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy Buds2 Pro',
      description: 'Ultimate 24-bit Hi-Fi sound quality. Intelligent ANC and ergonomic design for comfort.',
      price: 2499000,
      comparePrice: 2999000,
      sku: 'SS-GB2P-001',
      stock: 45,
      weight: 40,
      categoryIndex: 3,
      isFeatured: false,
    },
    // Wearables
    {
      name: 'Apple Watch Series 9',
      description: 'Smarter. Brighter. Mightier. Carbon neutral models available. Advanced health features.',
      price: 7499000,
      comparePrice: 8499000,
      sku: 'APL-AWS9-45',
      stock: 30,
      weight: 39,
      categoryIndex: 4,
      isFeatured: true,
    },
    {
      name: 'Samsung Galaxy Watch6 Classic',
      description: 'Timeless style with a rotating bezel. Advanced sleep tracking and health monitoring.',
      price: 5499000,
      comparePrice: 5999000,
      sku: 'SS-GW6C-47',
      stock: 25,
      weight: 59,
      categoryIndex: 4,
      isFeatured: false,
    },
    // Accessories
    {
      name: 'Apple MagSafe Charger',
      description: 'Snaps on magnetically for faster wireless charging up to 15W.',
      price: 799000,
      comparePrice: 999000,
      sku: 'APL-MGCH-001',
      stock: 100,
      weight: 80,
      categoryIndex: 5,
      isFeatured: false,
    },
    {
      name: 'Samsung 45W Travel Adapter',
      description: 'Super fast charging for your Galaxy devices with USB-C to USB-C cable.',
      price: 499000,
      comparePrice: 649000,
      sku: 'SS-45WCH-001',
      stock: 150,
      weight: 120,
      categoryIndex: 5,
      isFeatured: false,
    },
  ];

  for (const prod of products) {
    const slug = slugify(prod.name, { lower: true, strict: true });
    await prisma.product.create({
      data: {
        name: prod.name,
        slug,
        description: prod.description,
        price: prod.price,
        comparePrice: prod.comparePrice,
        sku: prod.sku,
        stock: prod.stock,
        weight: prod.weight,
        categoryId: createdCategories[prod.categoryIndex].id,
        isFeatured: prod.isFeatured,
        images: {
          create: [{
            url: `https://picsum.photos/seed/${prod.sku}/600/600`,
            publicId: `product_${prod.sku}`,
            isPrimary: true,
            order: 0,
          }],
        },
      },
    });
  }
  console.log('✅ Products created:', products.length);

  // Create Vouchers
  const vouchers = [
    {
      code: 'TECHDEAL',
      description: 'Diskon 10% khusus pecinta teknologi',
      type: VoucherType.PERCENTAGE,
      value: 10,
      minPurchase: 500000,
      maxDiscount: 200000,
      usageLimit: 100,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
    },
    {
      code: 'G gadget100K',
      description: 'Potongan Rp100.000 untuk pembelian minimal Rp2.000.000',
      type: VoucherType.FIXED_AMOUNT,
      value: 100000,
      minPurchase: 2000000,
      usageLimit: 50,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
    },
  ];

  for (const v of vouchers) {
    await prisma.voucher.create({
      data: v,
    });
  }
  console.log('✅ Vouchers created:', vouchers.length);

  // Create Default Settings
  const defaultSettings = [
    { key: 'shipping_cost', value: '15000', label: 'Biaya Pengiriman (Rp)' },
    { key: 'free_shipping_min', value: '500000', label: 'Minimum Gratis Ongkir (Rp)' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, label: s.label },
      create: s,
    });
  }
  console.log('✅ Settings created:', defaultSettings.length);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
