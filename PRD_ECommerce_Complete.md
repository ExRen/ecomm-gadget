# PRD — Full-Featured E-Commerce Platform
**Document Version:** 1.0.0  
**Status:** Ready for Execution  
**Last Updated:** 2026-04-04  
**Classification:** Internal — AI Agent Executor Reference

---

## 🧠 AGENT PANEL

| Agen | Peran | Domain |
|---|---|---|
| 🟦 PM | Project Manager | Scope, timeline, prioritas, success metrics |
| 🟩 SA | System Analyst | Alur bisnis, use case, data flow |
| 🟨 FE | Frontend Developer | UI/UX spec, komponen, state management |
| 🟥 BE | Backend Developer | API design, business logic, database schema |
| 🟪 DO | DevOps Engineer | Infrastruktur, CI/CD, deployment, environment |
| 🟫 CE | Cloud Engineer | Arsitektur cloud, storage, CDN, scaling |

---

## PART 1 — PROJECT OVERVIEW (🟦 PM)

### 1.1 Executive Summary

Platform e-commerce full-stack B2C (Business-to-Consumer) yang memungkinkan pengguna untuk browse produk, menambahkan ke cart, melakukan checkout, dan membayar via Midtrans Payment Gateway. Admin dapat mengelola produk, stok, harga, pesanan, dan laporan melalui panel terpisah.

### 1.2 Objectives

- Membangun platform e-commerce production-ready dengan fitur standar industri
- Integrasi payment gateway Midtrans (Snap + Core API)
- Panel admin untuk manajemen produk, pesanan, dan laporan
- Performa tinggi: TTFB < 200ms, LCP < 2.5s, CLS < 0.1
- Mobile-first, responsive design

### 1.3 Success Metrics (KPI)

| Metrik | Target |
|---|---|
| Page Load Time | < 2 detik |
| Checkout Completion Rate | > 70% |
| Payment Success Rate | > 95% |
| Uptime | 99.9% |
| Mobile Usability Score | > 90 (Lighthouse) |

### 1.4 Project Scope

**In Scope:**
- Customer-facing storefront (web)
- Admin dashboard
- Authentication & Authorization (JWT)
- Product management (CRUD + image upload)
- Cart & Wishlist
- Order management lifecycle
- Midtrans payment integration (Snap UI + webhook)
- Email notification (transactional)
- Search, filter, sorting
- Review & rating produk
- Alamat pengiriman (multi-address)
- Laporan dasar (revenue, order volume)

**Out of Scope (v1.0):**
- Mobile native app (iOS/Android)
- Multi-vendor marketplace
- Loyalty program / poin
- Live chat support
- AR product preview
- Subscription billing

### 1.5 Prioritas Fitur (MoSCoW)

**Must Have:**
- Autentikasi pengguna (register, login, logout, refresh token)
- Browse & search produk
- Filter kategori & harga
- Shopping cart
- Checkout flow
- Midtrans Snap Payment
- Order tracking status
- Admin: CRUD produk (termasuk stok & harga)
- Admin: manajemen pesanan

**Should Have:**
- Wishlist
- Review & rating
- Multi-address pengiriman
- Email notifikasi (order confirmation, payment success)
- Kupon / voucher diskon
- Admin: laporan penjualan

**Could Have:**
- Rekomendasi produk (related items)
- Recently viewed
- Bulk upload produk via CSV
- Export laporan ke Excel

**Won't Have (v1.0):**
- Real-time chat
- Mobile app
- Multi-currency

---

## PART 2 — TECH STACK DECISION (🟦 PM + 🟥 BE + 🟨 FE)

```
Frontend      : Next.js 14 (App Router) + TypeScript
Styling       : Tailwind CSS + shadcn/ui
State Mgmt    : Zustand (client state) + TanStack Query (server state)
Backend       : NestJS + TypeScript
ORM           : Prisma ORM
Database      : PostgreSQL 15
Cache         : Redis 7
Auth          : JWT (access token 15m + refresh token 7d) + httpOnly cookies
File Storage  : Cloudinary (gambar produk)
Payment       : Midtrans (Snap + Core API + Webhook)
Email         : Nodemailer + SMTP (Gmail/SendGrid)
Search        : PostgreSQL Full-Text Search (tsvector) — upgrade ke Elasticsearch v2
Containerize  : Docker + Docker Compose
CI/CD         : GitHub Actions
Deployment    : Railway / Render (backend) + Vercel (frontend)
Monitoring    : Sentry (error tracking) + Uptime Robot
```

---

## PART 3 — SYSTEM ARCHITECTURE (🟩 SA + 🟫 CE)

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                             │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
        ┌─────────▼──────────┐     ┌──────────▼──────────┐
        │   Vercel CDN       │     │   Midtrans Server   │
        │   (Next.js App)    │     │   (Payment Gateway) │
        └─────────┬──────────┘     └──────────┬──────────┘
                  │                           │ Webhook
        ┌─────────▼──────────────────────────▼──────────┐
        │              NestJS API Server                 │
        │         (REST API — Port 3001)                 │
        └──────┬─────────────────────────┬──────────────┘
               │                         │
    ┌──────────▼────────┐    ┌──────────▼────────────┐
    │   PostgreSQL DB   │    │     Redis Cache        │
    │   (Port 5432)     │    │     (Port 6379)        │
    └───────────────────┘    └───────────────────────┘
               │
    ┌──────────▼────────┐
    │    Cloudinary     │
    │  (Image Storage)  │
    └───────────────────┘
```

### 3.2 Request Flow — Checkout + Payment

```
User → Click Checkout
  → FE: POST /api/orders (create order, status: PENDING_PAYMENT)
  → BE: Validasi stok, hitung total, buat order + order_items
  → BE: POST ke Midtrans /charge (Snap Token)
  → BE: Return snap_token ke FE
  → FE: Buka Midtrans Snap popup
  → User: Pilih metode bayar & bayar
  → Midtrans: Kirim webhook ke BE /webhooks/midtrans
  → BE: Verifikasi signature key
  → BE: Update order status → PAID / FAILED
  → BE: Kurangi stok produk
  → BE: Kirim email konfirmasi ke user
  → FE: Polling order status → tampilkan success/failed page
```

### 3.3 Module Breakdown (NestJS)

```
src/
├── auth/           # Login, register, JWT, refresh token, guards
├── users/          # User profile, address management
├── products/       # CRUD produk, kategori, gambar
├── categories/     # Kategori & sub-kategori
├── cart/           # Cart management (Redis-backed)
├── wishlist/       # Wishlist management
├── orders/         # Order lifecycle, order items
├── payments/       # Midtrans integration, webhook handler
├── reviews/        # Product review & rating
├── vouchers/       # Coupon/voucher engine
├── notifications/  # Email service (Nodemailer)
├── uploads/        # Cloudinary integration
├── admin/          # Admin-specific endpoints
├── reports/        # Analytics & laporan
├── search/         # Full-text search service
└── common/         # Guards, interceptors, pipes, decorators
```

---

## PART 4 — DATABASE SCHEMA (🟥 BE + 🟩 SA)

### 4.1 Prisma Schema Lengkap

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────
// ENUMS
// ─────────────────────────────────

enum Role {
  CUSTOMER
  ADMIN
  SUPER_ADMIN
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  FAILED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  EXPIRED
  REFUNDED
}

enum PaymentMethod {
  BANK_TRANSFER
  CREDIT_CARD
  GOPAY
  SHOPEEPAY
  QRIS
  INDOMARET
  ALFAMART
  COD
}

enum VoucherType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

// ─────────────────────────────────
// USER & AUTH
// ─────────────────────────────────

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String
  name              String
  phone             String?
  role              Role      @default(CUSTOMER)
  isEmailVerified   Boolean   @default(false)
  emailVerifyToken  String?
  resetPasswordToken String?
  resetPasswordExpiry DateTime?
  avatarUrl         String?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  addresses         Address[]
  orders            Order[]
  cart              Cart?
  wishlist          Wishlist[]
  reviews           Review[]
  refreshTokens     RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
}

model Address {
  id           String  @id @default(uuid())
  userId       String
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label        String  // "Rumah", "Kantor"
  recipientName String
  phone        String
  province     String
  city         String
  district     String
  postalCode   String
  street       String
  isDefault    Boolean @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orders       Order[]

  @@map("addresses")
}

// ─────────────────────────────────
// PRODUCT & CATEGORY
// ─────────────────────────────────

model Category {
  id          String     @id @default(uuid())
  name        String     @unique
  slug        String     @unique
  description String?
  imageUrl    String?
  parentId    String?
  parent      Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children    Category[] @relation("SubCategories")
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  products    Product[]

  @@map("categories")
}

model Product {
  id            String    @id @default(uuid())
  name          String
  slug          String    @unique
  description   String
  price         Decimal   @db.Decimal(15, 2)
  comparePrice  Decimal?  @db.Decimal(15, 2) // Harga coret
  sku           String    @unique
  stock         Int       @default(0)
  weight        Float     // dalam gram
  categoryId    String
  category      Category  @relation(fields: [categoryId], references: [id])
  isActive      Boolean   @default(true)
  isFeatured    Boolean   @default(false)
  searchVector  Unsupported("tsvector")?

  images        ProductImage[]
  orderItems    OrderItem[]
  cartItems     CartItem[]
  wishlist      Wishlist[]
  reviews       Review[]
  tags          ProductTag[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([categoryId])
  @@index([isActive, isFeatured])
  @@map("products")
}

model ProductImage {
  id         String  @id @default(uuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url        String
  publicId   String  // Cloudinary public_id
  isPrimary  Boolean @default(false)
  order      Int     @default(0)
  createdAt  DateTime @default(now())

  @@map("product_images")
}

model Tag {
  id       String       @id @default(uuid())
  name     String       @unique
  slug     String       @unique
  products ProductTag[]

  @@map("tags")
}

model ProductTag {
  productId String
  tagId     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tags")
}

// ─────────────────────────────────
// CART
// ─────────────────────────────────

model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  items     CartItem[]

  @@map("carts")
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([cartId, productId])
  @@map("cart_items")
}

// ─────────────────────────────────
// WISHLIST
// ─────────────────────────────────

model Wishlist {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  createdAt DateTime @default(now())

  @@unique([userId, productId])
  @@map("wishlists")
}

// ─────────────────────────────────
// ORDER & PAYMENT
// ─────────────────────────────────

model Order {
  id              String        @id @default(uuid())
  orderNumber     String        @unique // ORD-20240101-XXXX
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  addressId       String
  address         Address       @relation(fields: [addressId], references: [id])
  status          OrderStatus   @default(PENDING_PAYMENT)
  subtotal        Decimal       @db.Decimal(15, 2)
  shippingCost    Decimal       @db.Decimal(15, 2) @default(0)
  discountAmount  Decimal       @db.Decimal(15, 2) @default(0)
  totalAmount     Decimal       @db.Decimal(15, 2)
  notes           String?
  voucherId       String?
  voucher         Voucher?      @relation(fields: [voucherId], references: [id])
  shippingMethod  String?       // "JNE REG", "J&T", dll
  trackingNumber  String?
  cancelReason    String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  items           OrderItem[]
  payment         Payment?

  @@index([userId])
  @@index([status])
  @@map("orders")
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  productName String   // snapshot nama saat order
  productSku  String   // snapshot SKU saat order
  price       Decimal  @db.Decimal(15, 2) // snapshot harga saat order
  quantity    Int
  subtotal    Decimal  @db.Decimal(15, 2)
  imageUrl    String?  // snapshot gambar saat order

  @@map("order_items")
}

model Payment {
  id                String        @id @default(uuid())
  orderId           String        @unique
  order             Order         @relation(fields: [orderId], references: [id])
  snapToken         String?       // Midtrans Snap Token
  midtransOrderId   String        @unique // sama dengan order.id
  midtransTransactionId String?
  paymentMethod     PaymentMethod?
  paymentStatus     PaymentStatus @default(PENDING)
  grossAmount       Decimal       @db.Decimal(15, 2)
  rawResponse       Json?         // full Midtrans webhook payload
  paidAt            DateTime?
  expiredAt         DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  @@map("payments")
}

// ─────────────────────────────────
// VOUCHER
// ─────────────────────────────────

model Voucher {
  id              String       @id @default(uuid())
  code            String       @unique
  description     String
  type            VoucherType
  value           Decimal      @db.Decimal(10, 2) // % atau nominal
  minPurchase     Decimal      @db.Decimal(15, 2) @default(0)
  maxDiscount     Decimal?     @db.Decimal(15, 2) // max discount untuk persentase
  usageLimit      Int?         // null = unlimited
  usedCount       Int          @default(0)
  isActive        Boolean      @default(true)
  startDate       DateTime
  endDate         DateTime
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  orders          Order[]

  @@map("vouchers")
}

// ─────────────────────────────────
// REVIEW
// ─────────────────────────────────

model Review {
  id        String       @id @default(uuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  productId String
  product   Product      @relation(fields: [productId], references: [id])
  rating    Int          // 1-5
  comment   String?
  status    ReviewStatus @default(PENDING)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([userId, productId])
  @@map("reviews")
}
```

---

## PART 5 — API SPECIFICATION (🟥 BE)

### 5.1 Base URL & Convention

```
Base URL Development : http://localhost:3001/api/v1
Base URL Production  : https://api.yourdomain.com/api/v1

Headers wajib (protected routes):
  Authorization: Bearer <access_token>
  Content-Type: application/json

Response format standar:
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "meta": {             // untuk pagination
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}

Error format:
{
  "success": false,
  "message": string,
  "error": string,
  "statusCode": number
}
```

### 5.2 AUTH MODULE — `/api/v1/auth`

```
POST   /auth/register
Body: { name, email, password, phone? }
Response: 201 { user: { id, name, email }, message: "Verifikasi email dikirim" }

POST   /auth/login
Body: { email, password }
Response: 200 { accessToken, user: { id, name, email, role } }
Note: refreshToken disimpan di httpOnly cookie

POST   /auth/refresh
Headers: Cookie: refresh_token=<token>
Response: 200 { accessToken }

POST   /auth/logout
Response: 200 { message: "Logged out" }
Note: Hapus refreshToken dari DB & clear cookie

POST   /auth/verify-email
Body: { token }
Response: 200 { message: "Email terverifikasi" }

POST   /auth/forgot-password
Body: { email }
Response: 200 { message: "Reset link dikirim" }

POST   /auth/reset-password
Body: { token, newPassword }
Response: 200 { message: "Password berhasil diubah" }
```

### 5.3 USER MODULE — `/api/v1/users`

```
GET    /users/me                    [AUTH]
Response: 200 { user: { id, name, email, phone, avatarUrl, addresses[] } }

PATCH  /users/me                    [AUTH]
Body: { name?, phone?, avatarUrl? }
Response: 200 { user }

PATCH  /users/me/change-password    [AUTH]
Body: { currentPassword, newPassword }
Response: 200 { message }

// Addresses
GET    /users/me/addresses          [AUTH]
POST   /users/me/addresses          [AUTH]
Body: { label, recipientName, phone, province, city, district, postalCode, street, isDefault }
PATCH  /users/me/addresses/:id      [AUTH]
DELETE /users/me/addresses/:id      [AUTH]
PATCH  /users/me/addresses/:id/default  [AUTH]
```

### 5.4 PRODUCT MODULE — `/api/v1/products`

```
GET    /products
Query params:
  - page (default: 1)
  - limit (default: 20, max: 100)
  - category (slug)
  - minPrice (number)
  - maxPrice (number)
  - sortBy (price_asc | price_desc | newest | popular | rating)
  - q (search query — full text search)
  - tags (comma-separated)
  - inStock (boolean)
Response: 200 { products: [], meta: { page, limit, total, totalPages } }

GET    /products/featured
Response: 200 { products: [] }

GET    /products/:slug
Response: 200 { product: { ...details, images[], category, reviews: { avg, count, items[] } } }

GET    /products/:id/related
Response: 200 { products: [] }

// ADMIN ONLY
POST   /admin/products              [AUTH + ADMIN]
Body (multipart/form-data):
  - name, description, price, comparePrice?, sku, stock, weight
  - categoryId, tags[]
  - images[] (file upload)
Response: 201 { product }

PATCH  /admin/products/:id          [AUTH + ADMIN]
Body: (partial product fields)
Response: 200 { product }

DELETE /admin/products/:id          [AUTH + ADMIN]
Response: 200 { message }

PATCH  /admin/products/:id/toggle-active  [AUTH + ADMIN]
Response: 200 { product }
```

### 5.5 CATEGORY MODULE — `/api/v1/categories`

```
GET    /categories
Response: 200 { categories: [{ id, name, slug, imageUrl, children[] }] }

GET    /categories/:slug
Response: 200 { category: { ...details, products: [] } }

// ADMIN
POST   /admin/categories            [AUTH + ADMIN]
PATCH  /admin/categories/:id        [AUTH + ADMIN]
DELETE /admin/categories/:id        [AUTH + ADMIN]
```

### 5.6 CART MODULE — `/api/v1/cart`

```
GET    /cart                        [AUTH]
Response: 200 { cart: { id, items: [{ product, quantity, subtotal }], total } }

POST   /cart/items                  [AUTH]
Body: { productId, quantity }
Response: 200 { cart }

PATCH  /cart/items/:productId       [AUTH]
Body: { quantity }
Response: 200 { cart }

DELETE /cart/items/:productId       [AUTH]
Response: 200 { cart }

DELETE /cart                        [AUTH]
Response: 200 { message: "Cart dikosongkan" }
```

### 5.7 WISHLIST MODULE — `/api/v1/wishlist`

```
GET    /wishlist                    [AUTH]
Response: 200 { wishlist: [{ product }] }

POST   /wishlist/:productId         [AUTH]
Response: 200 { message: "Ditambahkan ke wishlist" }

DELETE /wishlist/:productId         [AUTH]
Response: 200 { message: "Dihapus dari wishlist" }
```

### 5.8 ORDER MODULE — `/api/v1/orders`

```
GET    /orders                      [AUTH]
Query: page, limit, status
Response: 200 { orders: [], meta }

GET    /orders/:orderNumber         [AUTH]
Response: 200 { order: { ...details, items[], payment, address } }

POST   /orders                      [AUTH]
Body: {
  addressId,
  items: [{ productId, quantity }],   // atau dari cart
  fromCart: boolean,
  voucherCode?,
  shippingMethod,
  notes?
}
Response: 201 {
  order: { id, orderNumber, totalAmount, status },
  snapToken: "...",
  snapRedirectUrl: "..."
}

POST   /orders/:orderNumber/cancel  [AUTH]
Body: { reason }
Response: 200 { order }

// ADMIN
GET    /admin/orders                [AUTH + ADMIN]
Query: page, limit, status, dateFrom, dateTo, search
Response: 200 { orders: [], meta }

GET    /admin/orders/:orderNumber   [AUTH + ADMIN]
PATCH  /admin/orders/:id/status     [AUTH + ADMIN]
Body: { status, trackingNumber? }
Response: 200 { order }
```

### 5.9 PAYMENT MODULE — `/api/v1/payments`

```
// Internal — dipanggil saat create order
POST   /payments/create-snap-token  [AUTH — INTERNAL]
Body: { orderId }
Response: 200 { snapToken, redirectUrl }

// Midtrans Webhook — NO AUTH (verified via signature)
POST   /webhooks/midtrans
Headers: X-Callback-Token (Midtrans notification key)
Body: Midtrans webhook payload
Response: 200 OK

// Get payment status
GET    /payments/status/:orderId    [AUTH]
Response: 200 { payment }

// Repay (jika expired, buat snap token baru)
POST   /payments/repay/:orderNumber [AUTH]
Response: 200 { snapToken }
```

### 5.10 REVIEW MODULE — `/api/v1/reviews`

```
GET    /products/:productId/reviews
Query: page, limit, rating (filter by bintang)
Response: 200 { reviews: [], meta, summary: { avg, count, distribution } }

POST   /products/:productId/reviews [AUTH]
Body: { rating, comment? }
Note: Hanya bisa review jika order dengan status DELIVERED
Response: 201 { review }

// ADMIN
GET    /admin/reviews               [AUTH + ADMIN]
PATCH  /admin/reviews/:id/approve   [AUTH + ADMIN]
PATCH  /admin/reviews/:id/reject    [AUTH + ADMIN]
DELETE /admin/reviews/:id           [AUTH + ADMIN]
```

### 5.11 VOUCHER MODULE — `/api/v1/vouchers`

```
POST   /vouchers/validate           [AUTH]
Body: { code, totalAmount }
Response: 200 { voucher: { code, type, value, discountAmount } }

// ADMIN
GET    /admin/vouchers              [AUTH + ADMIN]
POST   /admin/vouchers              [AUTH + ADMIN]
PATCH  /admin/vouchers/:id          [AUTH + ADMIN]
DELETE /admin/vouchers/:id          [AUTH + ADMIN]
```

### 5.12 REPORT MODULE — `/api/v1/admin/reports`

```
GET    /admin/reports/summary       [AUTH + ADMIN]
Query: dateFrom, dateTo
Response: {
  totalRevenue, totalOrders, totalProducts,
  totalCustomers, avgOrderValue,
  revenueByDay: [], topProducts: []
}

GET    /admin/reports/orders        [AUTH + ADMIN]
Query: dateFrom, dateTo, groupBy (day|week|month)
Response: { data: [{ date, orderCount, revenue }] }

GET    /admin/reports/products      [AUTH + ADMIN]
Response: { topSelling: [], lowStock: [], outOfStock: [] }
```

---

## PART 6 — FRONTEND SPECIFICATION (🟨 FE)

### 6.1 Page Structure (Next.js App Router)

```
app/
├── (storefront)/
│   ├── layout.tsx                  # Navbar + Footer
│   ├── page.tsx                    # Halaman Utama / Home
│   ├── products/
│   │   ├── page.tsx                # Product Listing (semua produk)
│   │   └── [slug]/
│   │       └── page.tsx            # Product Detail
│   ├── categories/
│   │   └── [slug]/
│   │       └── page.tsx            # Produk per Kategori
│   ├── search/
│   │   └── page.tsx                # Search Results
│   ├── cart/
│   │   └── page.tsx                # Cart Page
│   ├── wishlist/
│   │   └── page.tsx                # Wishlist Page
│   └── checkout/
│       ├── page.tsx                # Checkout Page
│       ├── payment/
│       │   └── page.tsx            # Payment Page (Snap embed)
│       └── success/
│           └── page.tsx            # Order Success
│       └── failed/
│           └── page.tsx            # Payment Failed
│
├── (auth)/
│   ├── layout.tsx                  # Auth layout (no navbar)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
│
├── (account)/
│   ├── layout.tsx                  # Account sidebar layout
│   ├── account/
│   │   ├── page.tsx                # Profile
│   │   ├── orders/
│   │   │   ├── page.tsx            # Daftar Pesanan
│   │   │   └── [orderNumber]/
│   │   │       └── page.tsx        # Detail Pesanan
│   │   ├── addresses/
│   │   │   └── page.tsx            # Manajemen Alamat
│   │   ├── wishlist/
│   │   │   └── page.tsx            # Wishlist
│   │   └── security/
│   │       └── page.tsx            # Ganti Password
│
└── (admin)/
    ├── layout.tsx                  # Admin sidebar layout
    ├── admin/
    │   ├── page.tsx                # Dashboard Admin
    │   ├── products/
    │   │   ├── page.tsx            # Daftar Produk
    │   │   ├── new/page.tsx        # Tambah Produk
    │   │   └── [id]/edit/page.tsx  # Edit Produk
    │   ├── categories/
    │   │   └── page.tsx
    │   ├── orders/
    │   │   ├── page.tsx
    │   │   └── [orderNumber]/page.tsx
    │   ├── customers/
    │   │   └── page.tsx
    │   ├── vouchers/
    │   │   └── page.tsx
    │   ├── reviews/
    │   │   └── page.tsx
    │   └── reports/
    │       └── page.tsx
```

### 6.2 Komponen Utama

```typescript
// Komponen storefront wajib diimplementasikan:

// Layout
Navbar           — Logo, search bar, cart icon (badge), user avatar/menu
Footer           — Link, social media, copyright
Sidebar (mobile) — Hamburger menu

// Product
ProductCard      — Gambar, nama, harga, badge diskon, tombol add to cart, wishlist toggle
ProductGrid      — Responsive grid (2 col mobile, 4 col desktop)
ProductCarousel  — Swiper.js untuk featured products
ProductGallery   — Gambar produk dengan zoom & thumbnail
ProductBreadcrumb
ProductRating    — Star display component
ProductBadge     — "Diskon X%", "Stok Terbatas", "Terlaris"

// Filter & Search
FilterSidebar    — Kategori, harga (range slider), rating, in-stock toggle
PriceRangeSlider — @radix-ui/react-slider
SortDropdown     — Select dropdown
SearchBar        — Debounced input, autocomplete suggestion
ActiveFilters    — Chips/tags filter aktif dengan tombol hapus

// Cart
CartDrawer       — Slide-over drawer dari kanan
CartItem         — Gambar, nama, harga, qty stepper, hapus
CartSummary      — Subtotal, shipping, diskon, total

// Checkout
CheckoutStepper  — Step: Alamat → Pengiriman → Pembayaran → Review
AddressSelector  — Pilih alamat tersimpan atau buat baru
ShippingOptions  — Pilihan ekspedisi & harga
OrderSummary     — Summary barang + biaya
VoucherInput     — Input kode voucher dengan validasi

// Account
OrderStatusBadge — Color-coded status badge
OrderCard        — Preview pesanan di list
OrderDetail      — Detail lengkap + timeline status
AddressForm      — Form tambah/edit alamat
ReviewForm       — Rating stars + textarea

// Admin
DataTable        — sortable, filterable, paginated table
StatsCard        — Card metrik dashboard
RevenueChart     — Recharts LineChart
TopProductsTable
LowStockAlert
AdminProductForm — Form lengkap dengan drag-drop image upload
```

### 6.3 State Management

```typescript
// stores/useCartStore.ts (Zustand)
interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (product, quantity) => void
  removeItem: (productId) => void
  updateQuantity: (productId, quantity) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  total: number      // computed
  itemCount: number  // computed
}

// stores/useAuthStore.ts (Zustand)
interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setUser: (user) => void
  setAccessToken: (token) => void
  logout: () => void
}

// stores/useWishlistStore.ts (Zustand)
interface WishlistStore {
  productIds: string[]
  toggle: (productId) => void
  isWishlisted: (productId) => boolean
}
```

### 6.4 UI/UX Behavior Requirements

```
Search:
- Debounce 300ms sebelum API call
- Tampilkan loading skeleton saat fetching
- Autocomplete dropdown dengan max 5 suggestions
- Highlight keyword di hasil pencarian

Filter:
- URL-based filter state (query params) agar shareable & SSR-friendly
  Contoh: /products?category=elektronik&minPrice=100000&maxPrice=500000&sortBy=price_asc
- Apply filter tanpa page reload (Next.js router.push)
- Hitung jumlah filter aktif dan tampilkan di tombol filter (mobile)

Infinite Scroll vs Pagination:
- Gunakan traditional pagination (Next/Prev) untuk product listing
- Infinite scroll untuk reviews

Cart:
- Optimistic UI update: update UI dulu, rollback jika API error
- Tampilkan toast notification saat add/remove
- Cart badge update real-time
- Persistent via localStorage untuk guest, sinkron ke DB saat login

Loading States:
- Skeleton UI untuk semua loading state (bukan spinner tunggal)
- Product card skeleton: 8 cards
- Detail page skeleton
- Skeleton dimuat secara paralel dengan Suspense boundaries

Error Handling:
- Error boundary per section
- Toast untuk error aksi (gagal add cart, dll)
- Full error page untuk navigasi error (404, 500)

Mobile:
- Bottom navigation bar (Home, Kategori, Cart, Account)
- Swipe to dismiss cart drawer
- Touch-optimized quantity stepper
- Filter sebagai bottom sheet (mobile) vs sidebar (desktop)
```

---

## PART 7 — MIDTRANS PAYMENT INTEGRATION (🟥 BE)

### 7.1 Setup & Konfigurasi

```typescript
// .env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_NOTIFICATION_URL=https://yourdomain.com/api/v1/webhooks/midtrans

// Payment Service
import * as midtransClient from 'midtrans-client'

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
})
```

### 7.2 Create Snap Token Flow

```typescript
// payments.service.ts
async createSnapToken(order: Order, user: User): Promise<SnapTokenResponse> {
  const parameter = {
    transaction_details: {
      order_id: order.id,         // HARUS unik per transaksi
      gross_amount: Number(order.totalAmount),
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
      phone: user.phone,
      billing_address: {
        address: order.address.street,
        city: order.address.city,
        postal_code: order.address.postalCode,
        country_code: 'IDN',
      },
    },
    item_details: order.items.map(item => ({
      id: item.productId,
      price: Number(item.price),
      quantity: item.quantity,
      name: item.productName,
    })),
    // Tambahkan shipping cost sebagai item
    ...(order.shippingCost > 0 && {
      item_details_append: [{
        id: 'shipping',
        price: Number(order.shippingCost),
        quantity: 1,
        name: 'Ongkos Kirim',
      }]
    }),
    callbacks: {
      finish: `${process.env.FRONTEND_URL}/checkout/success?order=${order.orderNumber}`,
      error: `${process.env.FRONTEND_URL}/checkout/failed?order=${order.orderNumber}`,
      pending: `${process.env.FRONTEND_URL}/account/orders/${order.orderNumber}`,
    },
    expiry: {
      unit: 'hours',
      duration: 24,  // Pembayaran expired dalam 24 jam
    },
  }

  const transaction = await snap.createTransaction(parameter)
  return {
    snapToken: transaction.token,
    redirectUrl: transaction.redirect_url,
  }
}
```

### 7.3 Webhook Handler (KRITIS)

```typescript
// webhooks/midtrans.controller.ts
@Post('/webhooks/midtrans')
@HttpCode(200)
async handleMidtransWebhook(@Body() payload: any) {
  // STEP 1: Verifikasi signature key
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  const hash = crypto
    .createHash('sha512')
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`
    )
    .digest('hex')

  if (hash !== payload.signature_key) {
    throw new UnauthorizedException('Invalid signature')
  }

  // STEP 2: Find order by midtrans order_id
  const payment = await this.paymentsService.findByOrderId(payload.order_id)
  if (!payment) throw new NotFoundException('Order not found')

  // STEP 3: Update status berdasarkan transaction_status
  const { transaction_status, fraud_status, payment_type } = payload

  let newStatus: PaymentStatus
  let newOrderStatus: OrderStatus

  if (transaction_status === 'capture') {
    if (fraud_status === 'accept') {
      newStatus = PaymentStatus.SUCCESS
      newOrderStatus = OrderStatus.PAID
    } else {
      newStatus = PaymentStatus.FAILED
      newOrderStatus = OrderStatus.FAILED
    }
  } else if (transaction_status === 'settlement') {
    newStatus = PaymentStatus.SUCCESS
    newOrderStatus = OrderStatus.PAID
  } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
    newStatus = transaction_status === 'expire'
      ? PaymentStatus.EXPIRED
      : PaymentStatus.FAILED
    newOrderStatus = transaction_status === 'cancel'
      ? OrderStatus.CANCELLED
      : OrderStatus.FAILED
  } else if (transaction_status === 'pending') {
    newStatus = PaymentStatus.PENDING
    newOrderStatus = OrderStatus.PENDING_PAYMENT
  } else if (transaction_status === 'refund') {
    newStatus = PaymentStatus.REFUNDED
    newOrderStatus = OrderStatus.REFUNDED
  }

  // STEP 4: Update DB dalam transaction
  await this.prisma.$transaction(async (tx) => {
    // Update payment record
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: newStatus,
        paymentMethod: this.mapPaymentType(payment_type),
        midtransTransactionId: payload.transaction_id,
        rawResponse: payload,
        paidAt: newStatus === PaymentStatus.SUCCESS ? new Date() : undefined,
      },
    })

    // Update order status
    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: newOrderStatus },
    })

    // STEP 5: Kurangi stok produk jika PAID
    if (newStatus === PaymentStatus.SUCCESS) {
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: payment.orderId },
      })

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Hapus cart jika pembayaran sukses
      const order = await tx.order.findUnique({ where: { id: payment.orderId } })
      await tx.cart.deleteMany({ where: { userId: order.userId } })
    }
  })

  // STEP 6: Kirim email notifikasi
  if (newStatus === PaymentStatus.SUCCESS) {
    await this.notificationsService.sendOrderConfirmation(payment.orderId)
  }

  return { status: 'OK' }
}
```

### 7.4 Frontend Snap Integration

```typescript
// hooks/useMidtransSnap.ts
export function useMidtransSnap() {
  const snap = useRef<any>(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute(
      'data-client-key',
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!
    )
    script.onload = () => { snap.current = (window as any).snap }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const pay = useCallback((snapToken: string, callbacks: SnapCallbacks) => {
    if (!snap.current) {
      toast.error('Payment sistem belum siap, coba lagi')
      return
    }
    snap.current.pay(snapToken, {
      onSuccess: callbacks.onSuccess,
      onPending: callbacks.onPending,
      onError: callbacks.onError,
      onClose: callbacks.onClose,
    })
  }, [])

  return { pay }
}

// Penggunaan di checkout/payment/page.tsx
const { pay } = useMidtransSnap()

const handlePay = () => {
  pay(snapToken, {
    onSuccess: (result) => {
      router.push(`/checkout/success?order=${orderNumber}`)
    },
    onPending: (result) => {
      toast.info('Pembayaran sedang diproses')
      router.push(`/account/orders/${orderNumber}`)
    },
    onError: (result) => {
      toast.error('Pembayaran gagal')
      router.push(`/checkout/failed?order=${orderNumber}`)
    },
    onClose: () => {
      toast.warning('Jendela pembayaran ditutup')
    },
  })
}
```

---

## PART 8 — SECURITY REQUIREMENTS (🟦 PM + 🟥 BE + 🟪 DO)

### 8.1 Authentication Security

```
- JWT Access Token: expire 15 menit
- JWT Refresh Token: expire 7 hari, rotate setiap digunakan
- Refresh Token disimpan di DB (untuk revoke) + httpOnly cookie
- Password: bcrypt dengan salt rounds 12
- Rate limiting pada /auth/* endpoints: max 5 req/menit per IP
- Lockout setelah 5 failed login: blokir 15 menit
- Email verification wajib sebelum bisa checkout
```

### 8.2 API Security

```
- Helmet.js untuk security headers (HSTS, CSP, X-Frame-Options, dll)
- CORS: whitelist domain frontend saja
- Rate limiting global: 100 req/15 menit per IP (via @nestjs/throttler)
- Input validation: class-validator + class-transformer di semua DTO
- SQL injection: handled by Prisma ORM (parameterized queries)
- XSS: sanitize semua input string
- File upload: validasi MIME type, max size 5MB per gambar, max 5 gambar per produk
- Midtrans webhook: signature verification (wajib, jangan lewati)
```

### 8.3 Admin Security

```
- Endpoint /admin/* hanya boleh diakses role ADMIN atau SUPER_ADMIN
- Log semua aksi admin: siapa, kapan, aksi apa, data sebelum & sesudah
- Pisahkan admin panel di subdomain: admin.yourdomain.com
```

---

## PART 9 — ENVIRONMENT VARIABLES

### 9.1 Backend (.env)

```env
# App
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Midtrans
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_NOTIFICATION_URL=https://your-api-domain.com/api/v1/webhooks/midtrans

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Frontend
FRONTEND_URL=http://localhost:3000

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 9.2 Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
NEXT_PUBLIC_IS_PRODUCTION=false
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## PART 10 — INFRASTRUCTURE & DEVOPS (🟪 DO + 🟫 CE)

### 10.1 Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecommerce_db
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://dev_user:dev_password@postgres:5432/ecommerce_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run start:dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

### 10.2 Project Structure

```
ecommerce-platform/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── [modules seperti di 3.3]
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
│
├── frontend/                   # Next.js App
│   ├── app/                    # App router (lihat 6.1)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── layout/             # Navbar, Footer, Sidebar
│   │   ├── product/            # ProductCard, ProductGrid, dll
│   │   ├── cart/               # CartDrawer, CartItem, dll
│   │   ├── checkout/           # Stepper, AddressSelector, dll
│   │   ├── account/            # Order, Address components
│   │   └── admin/              # Admin-specific components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API client (axios), utils
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   ├── public/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Test & lint on PR
│       └── deploy.yml          # Deploy on merge to main
│
└── docker-compose.yml
```

### 10.3 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm run test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build

  deploy-backend:
    needs: test-backend
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend

  deploy-frontend:
    needs: test-frontend
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 10.4 Database Migration & Seeding

```
# Perintah untuk AI executor:

# 1. Generate migration dari schema
npx prisma migrate dev --name init

# 2. Deploy migration di production
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Seed data awal (admin user + sample categories)
npx prisma db seed

# Seed file harus mencakup:
# - 1 Super Admin account (email: admin@ecommerce.com, pass: Admin@123!)
# - 8-10 kategori produk (Elektronik, Fashion, Makanan, Olahraga, dll)
# - 20 sample products dengan gambar placeholder
# - 3 sample voucher (WELCOME10, DISKON50K, GRATIS_ONGKIR)
```

---

## PART 11 — EMAIL TEMPLATES (🟥 BE)

Implementasikan template email HTML untuk:

```
1. welcome.html          — Selamat datang + verifikasi email
2. email-verify.html     — Link verifikasi email
3. order-confirm.html    — Konfirmasi order diterima (+ detail item)
4. payment-success.html  — Pembayaran berhasil
5. payment-failed.html   — Pembayaran gagal / expired
6. order-shipped.html    — Pesanan dikirim + nomor resi
7. order-delivered.html  — Pesanan terkirim + ajakan review
8. reset-password.html   — Link reset password
9. voucher-reminder.html — Voucher hampir expired
```

---

## PART 12 — ADMIN DASHBOARD SPECIFICATION (🟨 FE + 🟩 SA)

### 12.1 Dashboard Home Widgets

```
┌──────────────────────────────────────────────────────────────┐
│  Hari ini  │ Total Order  │ Revenue  │ Pending  │ Low Stock  │
│  overview  │     42       │ 8.5 jt   │    7     │     3      │
├──────────────────────────────────────────────────────────────┤
│  Revenue Chart (30 hari terakhir — Line Chart)               │
├────────────────────────┬─────────────────────────────────────┤
│  Top 5 Produk          │  Pesanan Terbaru (5 items)          │
│  Terlaris              │  Real-time updates                  │
├────────────────────────┴─────────────────────────────────────┤
│  Peringatan: Stok Menipis (< 10 unit)                        │
└──────────────────────────────────────────────────────────────┘
```

### 12.2 Product Management

```
List View:
- Tabel dengan: Gambar, Nama, SKU, Kategori, Harga, Stok, Status, Aksi
- Filter: Kategori, Status (aktif/nonaktif), Stok (ada/habis)
- Sort: Nama, Harga, Stok, Tanggal dibuat
- Bulk action: Aktifkan, Nonaktifkan, Hapus
- Search by nama atau SKU

Form Tambah/Edit Produk:
Tab 1 - Informasi Dasar:
  - Nama Produk (required)
  - Deskripsi (rich text editor — TipTap atau React-Quill)
  - Kategori (dropdown/select)
  - Tags (multi-select input)

Tab 2 - Harga & Stok:
  - Harga Jual (required)
  - Harga Coret / Compare Price (optional — untuk badge diskon otomatis)
  - SKU (required, unique)
  - Stok (required, integer)
  - Berat dalam gram (required — untuk kalkulasi ongkir)

Tab 3 - Gambar:
  - Drag & drop upload (max 5 gambar, max 5MB/gambar)
  - Preview dengan delete per gambar
  - Set gambar utama (primary)
  - Reorder via drag & drop

Tab 4 - SEO (optional):
  - Meta title
  - Meta description
  - Slug (auto-generate dari nama, editable)
```

### 12.3 Order Management

```
Tabel Pesanan:
- Kolom: No. Pesanan, Tanggal, Pelanggan, Total, Status Bayar, Status Order, Aksi
- Filter: Status, Tanggal (range picker), Metode Bayar
- Search: By nomor pesanan atau email pelanggan
- Export: Unduh CSV pesanan terpilih

Detail Pesanan:
- Info pelanggan + alamat pengiriman
- Daftar produk + kuantitas + harga
- Rincian biaya (subtotal + ongkir + diskon + total)
- Timeline status pesanan (visual stepper)
- Tombol Update Status:
  PENDING_PAYMENT → (otomatis via webhook)
  PAID → PROCESSING
  PROCESSING → SHIPPED (+ input nomor resi)
  SHIPPED → DELIVERED
  Kapanpun → CANCELLED (+ input alasan)
- Info pembayaran (metode, waktu bayar, ID transaksi Midtrans)
- Catatan dari pembeli
```

---

## PART 13 — TESTING STRATEGY (🟪 DO + 🟥 BE)

### 13.1 Backend Testing

```
Unit Tests (Jest):
- AuthService: register, login, token refresh
- OrderService: create order, calculate total, apply voucher
- PaymentService: signature verification, status mapping
- VoucherService: validate, calculate discount

Integration Tests:
- Auth flow end-to-end
- Checkout flow end-to-end
- Midtrans webhook handling (mock Midtrans response)

API Tests (Supertest):
- Semua endpoint terproteksi menghasilkan 401 tanpa token
- Admin endpoint menghasilkan 403 untuk role CUSTOMER
- Input validation menghasilkan 400 dengan pesan yang tepat
```

### 13.2 Frontend Testing

```
Component Tests (Vitest + Testing Library):
- ProductCard: render, add to cart, wishlist toggle
- CartDrawer: open/close, item count, total calculation
- CheckoutStepper: step navigation, form validation

E2E Tests (Playwright):
- Happy path: browse → cart → checkout → payment (Midtrans sandbox)
- Guest user: redirect ke login saat checkout
- Admin: CRUD produk end-to-end
```

---

## PART 14 — IMPLEMENTATION CHECKLIST (AI Executor Guide)

### Phase 1: Foundation (Week 1-2)
- [ ] Setup monorepo structure
- [ ] Docker Compose untuk dev environment
- [ ] NestJS project init + semua module (empty)
- [ ] Prisma schema + migration + seed
- [ ] Next.js project init + folder structure
- [ ] shadcn/ui setup + custom theme
- [ ] Zustand stores (auth, cart, wishlist)
- [ ] Axios API client dengan interceptor (auto refresh token)

### Phase 2: Auth & Core (Week 2-3)
- [ ] Backend: AuthModule lengkap (JWT, refresh, email verify)
- [ ] Backend: UserModule (profile, addresses)
- [ ] Frontend: Login, Register, Forgot/Reset Password pages
- [ ] Frontend: AuthGuard (protected routes + role-based)
- [ ] Frontend: Profile & Address management

### Phase 3: Product & Catalog (Week 3-4)
- [ ] Backend: CategoryModule CRUD
- [ ] Backend: ProductModule CRUD + upload Cloudinary
- [ ] Backend: Full-text search (tsvector trigger)
- [ ] Frontend: Home page (banner, featured, categories)
- [ ] Frontend: Product Listing + Filter + Sort
- [ ] Frontend: Product Detail + Gallery + Reviews
- [ ] Frontend: Search results page
- [ ] Admin: Category management
- [ ] Admin: Product management (list + form)

### Phase 4: Cart & Checkout (Week 4-5)
- [ ] Backend: CartModule
- [ ] Backend: WishlistModule
- [ ] Backend: VoucherModule
- [ ] Backend: OrderModule (create, list, detail)
- [ ] Frontend: Cart drawer + cart page
- [ ] Frontend: Wishlist page
- [ ] Frontend: Checkout flow (stepper)
- [ ] Frontend: Voucher input dengan validasi real-time

### Phase 5: Payment (Week 5-6)
- [ ] Backend: PaymentModule + Midtrans Snap token
- [ ] Backend: Webhook handler dengan signature verify
- [ ] Backend: Stok decrement saat PAID
- [ ] Frontend: useMidtransSnap hook
- [ ] Frontend: Payment page (trigger Snap popup)
- [ ] Frontend: Success / Failed / Pending pages
- [ ] Frontend: Order status polling (setelah payment)
- [ ] Testing: Midtrans sandbox end-to-end

### Phase 6: Admin & Reports (Week 6-7)
- [ ] Admin: Dashboard dengan stats dan charts
- [ ] Admin: Order management + status update
- [ ] Admin: Customer list
- [ ] Admin: Voucher management
- [ ] Admin: Review moderation
- [ ] Admin: Laporan penjualan + grafik

### Phase 7: Polish & Deploy (Week 7-8)
- [ ] Email templates (semua 9 template)
- [ ] SEO: meta tags, og:image, sitemap.xml, robots.txt
- [ ] Performance: image optimization, code splitting
- [ ] Error monitoring (Sentry)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Deploy: Railway (backend) + Vercel (frontend)
- [ ] DNS setup + SSL
- [ ] Smoke testing production

---

## PART 15 — NOTES UNTUK AI EXECUTOR

```
1. URUTAN EKSEKUSI: Selalu mulai dari database schema (Prisma),
   kemudian backend module, kemudian frontend. Jangan buat UI
   tanpa API yang siap.

2. TIDAK ADA PLACEHOLDER: Semua komponen harus fungsional.
   Tidak boleh ada "TODO: implement later".

3. TYPE SAFETY: Gunakan TypeScript strict mode. Tidak ada "any"
   kecuali untuk Midtrans raw response (rawResponse: Json).

4. ERROR HANDLING: Setiap API call di frontend harus ada
   try/catch dengan toast notification yang informatif.

5. OPTIMISTIC UI: Cart dan wishlist harus optimistic update.

6. MIDTRANS SANDBOX: Gunakan kredensial sandbox selama development.
   Nomor kartu test: 4811 1111 1111 1114 (Visa, success)
   CVV: 123, Expiry: 01/25

7. GAMBAR: Gunakan Cloudinary untuk semua gambar produk.
   Thumbnail via Cloudinary transformation: w_400,h_400,c_fill

8. SLUG: Auto-generate slug dari nama produk menggunakan slugify.
   Handle duplicate dengan append -2, -3, dst.

9. ORDER NUMBER FORMAT: ORD-YYYYMMDD-XXXX
   Contoh: ORD-20240101-0001

10. STOK RACE CONDITION: Gunakan SELECT ... FOR UPDATE atau
    Prisma.$transaction saat decrement stok untuk mencegah
    overselling.
```

---

*PRD ini dibuat secara kolaboratif oleh panel agen multi-disiplin.*  
*Versi ini siap untuk dieksekusi oleh AI coding agent.*  
*Total fitur: ~120 endpoints, ~35 halaman, 14 modul backend.*
