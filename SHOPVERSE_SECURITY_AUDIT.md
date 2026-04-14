# ShopVerse — Security Audit Report & Remediation Playbook
**Versi Dokumen:** 1.0  
**Tanggal:** 2026-04-13  
**Klasifikasi:** Internal / Confidential  
**Scope:** Backend (NestJS), Frontend (Next.js), Database Layer (Prisma + PostgreSQL), Payment Integration (Midtrans), Deployment (VPS + Nginx)

---

## Daftar Isi

1. [Executive Summary](#1-executive-summary)
2. [Metodologi Audit](#2-metodologi-audit)
3. [Vulnerability Register](#3-vulnerability-register)
4. [Remediasi Detail Per Isu](#4-remediasi-detail-per-isu)
   - [SEK-001] Authorization Bypass via Frontend Role Check
   - [SEK-002] Webhook Replay Attack
   - [SEK-003] Price Tampering pada Checkout Payload
   - [SEK-004] JWT Refresh Token Tidak Dirotasi / Tidak Diinvalidasi
   - [SEK-005] Mass Assignment via DTO Whitelist Tidak Ketat
   - [SEK-006] Rate Limiting Tidak Menutupi Semua Endpoint Sensitif
   - [SEK-007] Midtrans Server Key Exposure Risk
   - [SEK-008] Missing Security Headers di Nginx
   - [SEK-009] Error Response Bocorkan Detail Internal
   - [SEK-010] SQL Injection via Raw Query Prisma (Potential)
   - [SEK-011] Unrestricted File Upload ke Cloudinary
   - [SEK-012] Insufficient Logging & Audit Trail Transaksi
5. [Prioritas Eksekusi](#5-prioritas-eksekusi)
6. [Checklist Verifikasi Post-Remediation](#6-checklist-verifikasi-post-remediation)
7. [Referensi](#7-referensi)

---

## 1. Executive Summary

ShopVerse dibangun di atas fondasi arsitektur yang secara umum benar — penggunaan `$transaction()` Prisma, DTO validation pipeline, dan JWT-based auth menunjukkan pemahaman dasar yang baik terhadap keamanan sistem transaksional. Namun, audit ini mengidentifikasi **12 celah keamanan aktif** dengan tingkat keparahan bervariasi dari *Informational* hingga *Critical*.

Celah paling berbahaya adalah **SEK-001** dan **SEK-003**: lapisan otorisasi yang hanya bergantung pada state frontend JavaScript dapat di-bypass dalam hitungan detik menggunakan browser DevTools, dan validasi harga yang tidak dilakukan dari sisi server membuka potensi pembelian barang dengan harga yang dimanipulasi. Keduanya harus diremediasi sebelum aplikasi menerima transaksi produksi pertama.

**Ringkasan temuan:**

| Severity | Jumlah | Status |
|---|---|---|
| 🔴 Critical | 2 | Harus selesai sebelum go-live |
| 🟠 High | 4 | Selesai dalam sprint pertama produksi |
| 🟡 Medium | 4 | Selesai dalam 30 hari pertama |
| 🔵 Low / Info | 2 | Scheduled improvement |

---

## 2. Metodologi Audit

Audit dilakukan secara **whitebox** berdasarkan dokumentasi arsitektur, struktur kode, dan spesifikasi deployment yang tersedia. Pendekatan yang digunakan mengacu pada:

- **OWASP Top 10 2021** sebagai kerangka referensi utama
- **OWASP API Security Top 10** untuk celah spesifik REST API
- **CWE (Common Weakness Enumeration)** untuk klasifikasi teknis
- Review spesifik terhadap keamanan integrasi **Midtrans Payment Gateway**

Setiap temuan dilengkapi dengan: deskripsi teknis, skenario eksploitasi, referensi OWASP/CWE, dan langkah remediasi yang actionable beserta contoh kode implementasi.

---

## 3. Vulnerability Register

| ID | Nama | Komponen | Severity | OWASP 2021 | CWE |
|---|---|---|---|---|---|
| SEK-001 | Authorization Bypass via Frontend Role Check | Frontend + Backend | 🔴 Critical | A01 Broken Access Control | CWE-285 |
| SEK-002 | Webhook Replay Attack | Backend / payments | 🔴 Critical | A08 Software & Data Integrity | CWE-294 |
| SEK-003 | Price Tampering pada Checkout Payload | Backend / orders | 🟠 High | A03 Injection | CWE-472 |
| SEK-004 | JWT Refresh Token Tidak Dirotasi | Backend / auth | 🟠 High | A07 Auth Failures | CWE-613 |
| SEK-005 | Mass Assignment via DTO Whitelist | Backend / users, products | 🟠 High | A03 Injection | CWE-915 |
| SEK-006 | Rate Limiting Coverage Tidak Lengkap | Backend / auth | 🟠 High | A07 Auth Failures | CWE-307 |
| SEK-007 | Midtrans Server Key Exposure Risk | Backend / payments | 🟡 Medium | A02 Cryptographic Failures | CWE-321 |
| SEK-008 | Missing Security Headers di Nginx | Infra / Nginx | 🟡 Medium | A05 Security Misconfiguration | CWE-693 |
| SEK-009 | Error Response Bocorkan Detail Internal | Backend (global) | 🟡 Medium | A05 Security Misconfiguration | CWE-209 |
| SEK-010 | Potensi Raw Query Prisma Tanpa Sanitasi | Backend / products | 🟡 Medium | A03 Injection | CWE-89 |
| SEK-011 | Unrestricted File Upload | Backend / products | 🔵 Low | A04 Insecure Design | CWE-434 |
| SEK-012 | Insufficient Audit Trail Transaksi | Backend / orders, payments | 🔵 Low | A09 Logging Failures | CWE-778 |

---

## 4. Remediasi Detail Per Isu

---

### [SEK-001] Authorization Bypass via Frontend Role Check

**Severity:** 🔴 Critical  
**Komponen:** `frontend/src/components/layout/AdminLayout.tsx`, semua endpoint admin di backend  
**OWASP:** A01:2021 — Broken Access Control  
**CWE:** CWE-285 (Improper Authorization)

#### Deskripsi

Sistem saat ini mengandalkan pengecekan `user.role` dari Zustand store di komponen `<AdminLayout>` sebagai satu-satunya mekanisme perlindungan halaman admin. Zustand menyimpan state di **JavaScript heap browser** yang sepenuhnya dapat dimodifikasi melalui browser DevTools pada runtime.

Selain itu, apabila endpoint API admin (seperti `GET /reports`, `DELETE /products/:id`, `PUT /orders/:id/status`) tidak secara eksplisit menerapkan `RolesGuard` di level backend, maka attacker dapat langsung mengakses endpoint tersebut menggunakan JWT token milik user `CUSTOMER` biasa — tanpa perlu menyentuh UI sama sekali.

#### Skenario Eksploitasi

```
Langkah 1: Attacker login sebagai CUSTOMER biasa → mendapatkan JWT token valid
Langkah 2: Buka DevTools → Application tab → modify Zustand state:
           useAuthStore.setState({ user: { ...user, role: 'ADMIN' } })
Langkah 3: Akses /admin/products → frontend redirect tidak terjadi
Langkah 4 (lebih serius): Langsung hit API endpoint tanpa UI:
           curl -X DELETE https://api.domain.com/products/123 \
                -H "Authorization: Bearer <customer_jwt_token>"
           → Jika tidak ada RolesGuard: 200 OK, produk terhapus.
```

#### Remediasi

**Langkah 1 — Backend: Pastikan semua endpoint admin memiliki RolesGuard**

Buat `Roles` decorator jika belum ada:

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Buat `RolesGuard` yang membaca metadata dari decorator:

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true; // endpoint tanpa @Roles = publik/authenticated saja

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

Registrasi global di `app.module.ts` atau terapkan per-module:

```typescript
// src/app.module.ts — registrasi global providers
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard, // semua route butuh auth by default
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard,
  },
],
```

Terapkan decorator di semua controller admin:

```typescript
// src/reports/reports.controller.ts
@Controller('reports')
@Roles('ADMIN', 'SUPER_ADMIN') // Semua endpoint di controller ini butuh role ini
export class ReportsController {
  @Get()
  getReports() { ... }

  @Get('export')
  exportReport() { ... }
}

// src/products/products.controller.ts
@Controller('products')
export class ProductsController {
  @Get()       // Publik — tidak butuh role
  findAll() { ... }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN') // Hanya admin bisa create
  create(@Body() dto: CreateProductDto) { ... }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN') // Hanya admin bisa delete
  remove(@Param('id') id: string) { ... }
}
```

**Langkah 2 — Frontend: Tambahkan server-side verification di Next.js**

Jangan hanya andalkan Zustand. Lakukan validasi session di server component atau middleware:

```typescript
// src/middleware.ts (Next.js Middleware — berjalan di server sebelum route dirender)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Decode JWT payload (tanpa verifikasi signature — hanya untuk redirect UX)
    // Verifikasi sebenarnya tetap di backend saat API dipanggil
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

**Langkah 3 — Audit Checklist Endpoint**

Verifikasi semua endpoint berikut sudah memiliki `@Roles('ADMIN', 'SUPER_ADMIN')`:

- [ ] `GET /reports` dan semua sub-route
- [ ] `GET /reports/export`
- [ ] `POST /products` (create)
- [ ] `PUT /products/:id` (update)
- [ ] `DELETE /products/:id`
- [ ] `PUT /orders/:id/status` (manual status change)
- [ ] `GET /users` (list semua user)
- [ ] `DELETE /users/:id`
- [ ] `PUT /settings`
- [ ] `GET /vouchers` (admin management view)
- [ ] `POST /vouchers`
- [ ] `DELETE /vouchers/:id`
- [ ] `PUT /reviews/:id/status` (approve/reject review)

---

### [SEK-002] Webhook Replay Attack

**Severity:** 🔴 Critical  
**Komponen:** `backend/src/payments/payments.controller.ts`, `payments.service.ts`  
**OWASP:** A08:2021 — Software and Data Integrity Failures  
**CWE:** CWE-294 (Authentication Bypass by Capture-replay)

#### Deskripsi

Endpoint `/payments/webhook` memverifikasi signature Midtrans, yang sudah benar. Namun, verifikasi signature saja tidak mencegah **replay attack**: attacker yang berhasil mencapture satu legitimate webhook request dapat mengirimkan ulang request yang sama berkali-kali. Karena signature-nya valid, semua request akan lolos verifikasi. Jika tidak ada idempotency check, satu payment event yang sama bisa diprocess beberapa kali — berpotensi memicu logika downstream yang tidak diharapkan (double status update, double inventory adjustment, dsb).

#### Skenario Eksploitasi

```
Langkah 1: Attacker intercept (atau bocoran log) legitimate POST request ke /payments/webhook
           dengan payload valid dan signature Midtrans yang benar
Langkah 2: Resend request yang sama 10 kali dalam waktu singkat
Langkah 3: Jika tidak ada idempotency check, handleWebhook() dieksekusi 10 kali
           → Semua 10 eksekusi lolos signature verification
           → Jika ada logika non-idempotent (misal: increment balance, send email 10x), terjadi kerusakan data
```

#### Remediasi

**Langkah 1 — Implementasi Idempotency Check di Service**

```typescript
// src/payments/payments.service.ts
async handleWebhook(payload: MidtransWebhookDto): Promise<void> {
  // Step 1: Verifikasi signature Midtrans (sudah ada, pertahankan)
  const isValid = this.verifyMidtransSignature(payload);
  if (!isValid) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  const { order_id, transaction_status, fraud_status } = payload;

  // Step 2: Idempotency check — cek apakah order ini sudah pernah diprocess
  const payment = await this.prisma.payment.findFirst({
    where: { midtransOrderId: order_id },
  });

  if (!payment) {
    // Log anomali: webhook untuk order yang tidak ada di database
    this.logger.warn(`Webhook received for unknown order: ${order_id}`);
    return; // Return 200 agar Midtrans tidak retry terus-menerus
  }

  // Step 3: Cek status saat ini — jangan proses ulang status terminal
  const TERMINAL_STATUSES = ['PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED'];
  if (TERMINAL_STATUSES.includes(payment.status)) {
    this.logger.log(`Duplicate webhook ignored for order ${order_id}, status: ${payment.status}`);
    return; // Idempotent — sudah final, tidak perlu diproses lagi
  }

  // Step 4: Map status Midtrans ke status internal dan update atomically
  const newStatus = this.mapMidtransStatus(transaction_status, fraud_status);

  await this.prisma.$transaction([
    this.prisma.payment.update({
      where: { midtransOrderId: order_id },
      data: {
        status: newStatus,
        midtransResponse: payload as any,
        processedAt: new Date(),
      },
    }),
    this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: newStatus === 'PAID' ? 'PAID' : 'CANCELLED' },
    }),
  ]);

  this.logger.log(`Webhook processed: order ${order_id} → ${newStatus}`);
}

private mapMidtransStatus(transactionStatus: string, fraudStatus: string): string {
  if (transactionStatus === 'capture' && fraudStatus === 'accept') return 'PAID';
  if (transactionStatus === 'settlement') return 'PAID';
  if (['cancel', 'deny', 'expire'].includes(transactionStatus)) return 'CANCELLED';
  if (transactionStatus === 'pending') return 'PENDING_PAYMENT';
  return 'PENDING_PAYMENT';
}
```

**Langkah 2 — Tambahkan Database Index untuk Lookup Idempotency yang Cepat**

```prisma
// prisma/schema.prisma
model Payment {
  id               String   @id @default(uuid())
  orderId          String   @unique
  midtransOrderId  String   @unique  // ← Pastikan ini UNIQUE dan ada index
  status           String
  midtransResponse Json?
  processedAt      DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([midtransOrderId])  // ← Index untuk lookup cepat di webhook handler
}
```

Jalankan setelah perubahan schema:

```bash
npx prisma migrate dev --name add_payment_idempotency_index
```

**Langkah 3 — Tambahkan IP Allowlist untuk Webhook di Nginx**

Midtrans mendokumentasikan range IP server mereka. Tambahkan whitelist di Nginx untuk endpoint webhook:

```nginx
# /etc/nginx/sites-available/api.domain.com
location /payments/webhook {
  # Midtrans server IP ranges (verifikasi di dokumentasi Midtrans terbaru)
  allow 103.208.23.0/24;
  allow 103.208.23.6;
  allow 103.208.23.7;
  deny all;

  proxy_pass http://localhost:4000;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

---

### [SEK-003] Price Tampering pada Checkout Payload

**Severity:** 🟠 High  
**Komponen:** `backend/src/orders/orders.service.ts`  
**OWASP:** A03:2021 — Injection (Parameter Tampering)  
**CWE:** CWE-472 (External Control of Assumed-Immutable Web Parameter)

#### Deskripsi

Jika kalkulasi total harga order menggunakan data harga yang dikirim dari client (request body), attacker dapat memodifikasi nilai `price` di payload HTTP request menggunakan tools seperti Burp Suite atau browser DevTools sebelum request dikirim ke server.

#### Skenario Eksploitasi

```bash
# Request normal dari user legitimate
POST /orders
{
  "items": [
    { "productId": "abc123", "quantity": 1, "price": 500000 }
  ]
}

# Request yang dimanipulasi attacker (harga diubah dari 500.000 menjadi 1)
POST /orders
{
  "items": [
    { "productId": "abc123", "quantity": 1, "price": 1 }
  ]
}
# Jika backend percaya nilai price dari client → snapToken dibuat untuk transaksi Rp 1
# User membayar Rp 1 → webhook Midtrans confirm settlement → order PAID dengan harga Rp 1
```

#### Remediasi

**Implementasi Server-Side Price Calculation di `orders.service.ts`:**

```typescript
// src/orders/orders.service.ts
async createOrder(userId: string, dto: CreateOrderDto) {
  const { items, voucherCode, addressId } = dto;
  const productIds = items.map(item => item.productId);

  // Step 1: Ambil semua data produk dari database — JANGAN percaya harga dari client
  const products = await this.prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true, // Pastikan produk masih aktif
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
    },
  });

  // Step 2: Validasi semua produk ditemukan
  if (products.length !== productIds.length) {
    const foundIds = products.map(p => p.id);
    const missingIds = productIds.filter(id => !foundIds.includes(id));
    throw new BadRequestException(`Product not found or inactive: ${missingIds.join(', ')}`);
  }

  // Step 3: Validasi stok availability untuk setiap item
  const productMap = new Map(products.map(p => [p.id, p]));
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (product.stock < item.quantity) {
      throw new ConflictException(
        `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
      );
    }
  }

  // Step 4: Hitung total dari database price — bukan dari client
  let subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + (product.price * item.quantity); // Selalu dari DB
  }, 0);

  // Step 5: Aplikasikan voucher jika ada (validasi juga dari DB)
  let discount = 0;
  if (voucherCode) {
    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: voucherCode,
        isActive: true,
        expiresAt: { gt: new Date() },
        minPurchase: { lte: subtotal },
      },
    });
    if (!voucher) throw new BadRequestException('Voucher tidak valid atau sudah kadaluarsa');
    discount = voucher.type === 'PERCENTAGE'
      ? Math.floor(subtotal * (voucher.value / 100))
      : voucher.value;
  }

  const grandTotal = subtotal - discount;

  // Step 6: Buat order dan Midtrans transaction dalam satu atomic transaction
  return await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        addressId,
        subtotal,
        discount,
        grandTotal,
        status: 'PENDING_PAYMENT',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: productMap.get(item.productId).price, // Harga saat order dibuat
          })),
        },
      },
    });

    // Kurangi stok secara atomic
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Buat Midtrans transaction dengan grandTotal dari DB
    const snapToken = await this.paymentsService.createSnapTransaction({
      orderId: order.id,
      amount: grandTotal, // Nilai dari server, bukan client
      customerDetails: { userId },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        midtransOrderId: order.id,
        snapToken,
        status: 'PENDING_PAYMENT',
      },
    });

    return { orderId: order.id, snapToken };
  });
}
```

**Update DTO — Hapus field `price` dari client input:**

```typescript
// src/orders/dto/create-order.dto.ts
export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100) // Batasi max quantity per item untuk mencegah DoS via oversized order
  quantity: number;

  // HAPUS field price dari sini — harga selalu diambil dari database
  // price: number; ← JANGAN ADA INI
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50) // Batasi jumlah item per order
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsUUID()
  addressId: string;
}
```

---

### [SEK-004] JWT Refresh Token Tidak Dirotasi / Tidak Diinvalidasi

**Severity:** 🟠 High  
**Komponen:** `backend/src/auth/auth.service.ts`, model `RefreshToken`  
**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-613 (Insufficient Session Expiration)

#### Deskripsi

Jika refresh token yang sudah digunakan tidak langsung di-invalidasi dan tidak dirotasi, token tersebut rentan terhadap **refresh token theft**. Attacker yang berhasil mencuri refresh token dapat terus memperbarui access token bahkan setelah user melakukan logout, selama refresh token belum expired secara natural.

#### Remediasi

**Implementasi Refresh Token Rotation dengan One-Time Use:**

```typescript
// src/auth/auth.service.ts
async refreshTokens(userId: string, refreshToken: string) {
  // Step 1: Cari refresh token di database
  const storedToken = await this.prisma.refreshToken.findFirst({
    where: {
      userId,
      token: await this.hashToken(refreshToken), // Simpan sebagai hash, bukan plaintext
      expiresAt: { gt: new Date() },
      isRevoked: false,
    },
  });

  if (!storedToken) {
    // Jika token tidak ditemukan padahal user mengklaim punya token valid,
    // ini indikasi token reuse attack → revoke SEMUA token user ini
    await this.revokeAllUserTokens(userId);
    throw new UnauthorizedException('Invalid refresh token — all sessions revoked');
  }

  // Step 2: Revoke token yang sedang digunakan (one-time use)
  await this.prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true, revokedAt: new Date() },
  });

  // Step 3: Generate token baru (rotation)
  const newAccessToken = this.generateAccessToken(userId);
  const newRefreshToken = this.generateRefreshToken();

  // Step 4: Simpan refresh token baru di database
  await this.prisma.refreshToken.create({
    data: {
      userId,
      token: await this.hashToken(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
      isRevoked: false,
    },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async logout(userId: string, refreshToken: string) {
  // Revoke hanya token yang sedang aktif ini
  await this.prisma.refreshToken.updateMany({
    where: {
      userId,
      token: await this.hashToken(refreshToken),
    },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

async revokeAllUserTokens(userId: string) {
  // Digunakan saat deteksi token reuse atau force logout semua session
  await this.prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true, revokedAt: new Date() },
  });
}

private async hashToken(token: string): Promise<string> {
  // Simpan hash di DB, bukan plaintext refresh token
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Update Prisma Schema:**

```prisma
// prisma/schema.prisma
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique // SHA-256 hash dari token
  expiresAt DateTime
  isRevoked Boolean   @default(false)
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([token])
}
```

---

### [SEK-005] Mass Assignment via DTO Whitelist Tidak Ketat

**Severity:** 🟠 High  
**Komponen:** `backend/src/users/dto/update-user.dto.ts`, `products/dto/`  
**OWASP:** A03:2021 — Injection  
**CWE:** CWE-915 (Improperly Controlled Modification of Object Prototype Attributes)

#### Deskripsi

Jika DTO menggunakan `PartialType` atau tidak secara eksplisit mengexclude field sensitif, attacker dapat menyertakan field tambahan dalam request body — seperti `role`, `isActive`, atau `balance` — dan field tersebut bisa saja ter-persist ke database jika Prisma update object tidak melakukan whitelist eksplisit.

#### Remediasi

**Aktifkan `whitelist` dan `forbidNonWhitelisted` di ValidationPipe global:**

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // Strip semua property yang tidak ada @decorator di DTO
    forbidNonWhitelisted: true, // Throw error jika ada property yang tidak dikenal
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

**Pastikan DTO user update tidak mengizinkan field sensitif:**

```typescript
// src/users/dto/update-profile.dto.ts
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // Field berikut TIDAK boleh ada di DTO ini:
  // role, isActive, email (butuh flow tersendiri), password (butuh flow tersendiri)
}

// src/users/users.service.ts
async updateProfile(userId: string, dto: UpdateProfileDto) {
  // Dengan whitelist: true, dto sudah bersih dari field berbahaya
  // Tapi tetap explicit: destructure hanya field yang diizinkan
  const { name, phone } = dto;

  return this.prisma.user.update({
    where: { id: userId },
    data: { name, phone }, // Eksplisit — tidak spread dto langsung
  });
}
```

---

### [SEK-006] Rate Limiting Coverage Tidak Lengkap

**Severity:** 🟠 High  
**Komponen:** `backend/src/auth/`, `main.ts`  
**OWASP:** A07:2021 — Identification and Authentication Failures  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

#### Deskripsi

`@nestjs/throttler` sudah terdaftar di tech stack, namun coverage default biasanya diterapkan secara global dengan limit yang sama untuk semua endpoint. Endpoint auth (login, register, forgot-password) membutuhkan throttle yang jauh lebih ketat karena merupakan target utama brute force dan credential stuffing attack.

#### Remediasi

**Konfigurasi throttler bertingkat dengan limit berbeda per endpoint:**

```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',   // Burst protection: 10 request per 1 detik
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',  // General API: 100 request per 1 menit
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',    // Sustained rate: 300 request per 15 menit
        ttl: 900000,
        limit: 300,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
```

**Terapkan throttle ketat di endpoint auth:**

```typescript
// src/auth/auth.controller.ts
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Login: maksimal 5 percobaan per menit
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) { ... }

  // Register: maksimal 3 akun baru per 10 menit dari IP yang sama
  @Post('register')
  @Throttle({ default: { ttl: 600000, limit: 3 } })
  register(@Body() dto: RegisterDto) { ... }

  // Forgot password: maksimal 3 request per 15 menit
  @Post('forgot-password')
  @Throttle({ default: { ttl: 900000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) { ... }

  // Refresh token: maksimal 20 per menit
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  refresh(@Body() dto: RefreshTokenDto) { ... }
}
```

**Untuk VPS dengan Redis, gunakan Redis storage agar throttle state tidak hilang saat restart:**

```typescript
// src/app.module.ts
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

ThrottlerModule.forRoot({
  throttlers: [ /* ... */ ],
  storage: new ThrottlerStorageRedisService({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  }),
}),
```

---

### [SEK-007] Midtrans Server Key Exposure Risk

**Severity:** 🟡 Medium  
**Komponen:** `backend/src/payments/`, `.env`  
**OWASP:** A02:2021 — Cryptographic Failures  
**CWE:** CWE-321 (Use of Hard-coded Cryptographic Key)

#### Deskripsi

Midtrans Server Key harus **tidak pernah** ter-commit ke repository Git, ter-expose di response API, atau ter-log di sistem logging. Celah umum: key di-hardcode langsung di source code, atau file `.env` tidak masuk `.gitignore`.

#### Remediasi

**Verifikasi `.gitignore` mencakup semua file sensitif:**

```bash
# .gitignore — pastikan semua baris ini ada
.env
.env.local
.env.production
.env.*.local
*.env
```

**Scan repository untuk accidental secret exposure:**

```bash
# Gunakan git-secrets atau truffleHog untuk scan history
npx trufflehog git file://. --only-verified

# Atau cek manual apakah ada .env yang pernah di-commit
git log --all --full-history -- "**/.env"
git log --all --full-history -- ".env"
```

**Jika key sudah pernah ter-commit:** Rotasi key di Midtrans Dashboard segera — riwayat Git tidak bisa dihapus secara sempurna, anggap key tersebut compromised.

**Validasi environment variables ada saat startup:**

```typescript
// src/main.ts
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MIDTRANS_SERVER_KEY',
    'MIDTRANS_CLIENT_KEY',
    'CLOUDINARY_API_SECRET',
    'NODEMAILER_PASSWORD',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnvironment(); // Fail fast jika env tidak lengkap
  const app = await NestFactory.create(AppModule);
  // ...
}
```

---

### [SEK-008] Missing Security Headers di Nginx

**Severity:** 🟡 Medium  
**Komponen:** `/etc/nginx/sites-available/`  
**OWASP:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-693 (Protection Mechanism Failure)

#### Deskripsi

Tanpa security headers yang tepat, browser tidak mendapat instruksi tentang kebijakan keamanan aplikasi — membuka celah untuk XSS, clickjacking, MIME sniffing, dan serangan downgrade dari HTTPS ke HTTP.

#### Remediasi

**Update konfigurasi Nginx untuk kedua server (API dan Frontend):**

```nginx
# /etc/nginx/sites-available/api.domain.com
server {
    listen 443 ssl http2;
    server_name api.domain.com;

    ssl_certificate /etc/letsencrypt/live/api.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.domain.com/privkey.pem;

    # Modern TLS only
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Content Security Policy untuk API (lebih ketat karena pure API)
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none';" always;

    # Sembunyikan versi Nginx
    server_tokens off;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook dengan IP restriction (lihat SEK-002)
    location /payments/webhook {
        allow 103.208.23.0/24;
        deny all;
        proxy_pass http://localhost:4000;
    }
}

# Redirect HTTP ke HTTPS
server {
    listen 80;
    server_name api.domain.com;
    return 301 https://$server_name$request_uri;
}
```

**Verifikasi headers dengan:**

```bash
curl -I https://api.domain.com
# Atau gunakan: https://securityheaders.com
```

---

### [SEK-009] Error Response Bocorkan Detail Internal

**Severity:** 🟡 Medium  
**Komponen:** `backend/src/common/filters/`  
**OWASP:** A05:2021 — Security Misconfiguration  
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

#### Deskripsi

Tanpa global exception filter, NestJS secara default dapat mengembalikan stack trace, nama module, atau detail query error ke client. Ini memberikan informasi berharga bagi attacker untuk memetakan arsitektur sistem.

#### Remediasi

**Implementasi Global Exception Filter:**

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorCode = (exceptionResponse as any).error || errorCode;
      }
    }

    // Log detail internal untuk debugging (di server, bukan di response)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Response ke client: minimal, tidak bocorkan detail internal
    response.status(status).json({
      statusCode: status,
      errorCode,
      message: status >= 500 ? 'Internal server error' : message, // Sembunyikan detail 5xx
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**Register di `main.ts`:**

```typescript
// src/main.ts
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

app.useGlobalFilters(new GlobalExceptionFilter());
```

---

### [SEK-010] Potensi Raw Query Prisma Tanpa Sanitasi

**Severity:** 🟡 Medium  
**Komponen:** `backend/src/products/products.service.ts`, fitur search/filter  
**OWASP:** A03:2021 — Injection  
**CWE:** CWE-89 (SQL Injection)

#### Deskripsi

Prisma ORM secara default parameterized untuk semua query standar. Risiko muncul hanya ketika menggunakan `prisma.$queryRaw` atau `prisma.$executeRaw` dengan string interpolasi — yang sering dilakukan untuk fitur pencarian produk yang kompleks.

#### Remediasi

**Gunakan `Prisma.sql` template tag alih-alih string interpolasi:**

```typescript
// src/products/products.service.ts

// BERBAHAYA — SQL Injection langsung
async searchProducts(query: string) {
  return this.prisma.$queryRaw`SELECT * FROM "Product" WHERE name LIKE '%${query}%'`;
  // Jika query = "'; DROP TABLE Product; --" → bencana
}

// AMAN — gunakan Prisma.sql dengan parameterized value
import { Prisma } from '@prisma/client';

async searchProducts(query: string) {
  return this.prisma.$queryRaw(
    Prisma.sql`SELECT id, name, price, stock FROM "Product"
               WHERE name ILIKE ${`%${query}%`}
               AND "isActive" = true
               LIMIT 50`
  );
}

// LEBIH AMAN — gunakan Prisma query builder biasa jika memungkinkan
async searchProducts(searchDto: SearchProductDto) {
  const { query, categoryId, minPrice, maxPrice, sortBy } = searchDto;

  return this.prisma.product.findMany({
    where: {
      AND: [
        { isActive: true },
        query ? { name: { contains: query, mode: 'insensitive' } } : {},
        categoryId ? { categoryId } : {},
        minPrice ? { price: { gte: minPrice } } : {},
        maxPrice ? { price: { lte: maxPrice } } : {},
      ],
    },
    orderBy: sortBy === 'price_asc' ? { price: 'asc' }
           : sortBy === 'price_desc' ? { price: 'desc' }
           : { createdAt: 'desc' },
    take: 50,
  });
}
```

**Audit semua penggunaan raw query:**

```bash
# Cari semua penggunaan $queryRaw dan $executeRaw di codebase
grep -rn '\$queryRaw\|\$executeRaw' backend/src/
# Setiap hasil harus di-review apakah menggunakan string interpolasi berbahaya
```

---

### [SEK-011] Unrestricted File Upload

**Severity:** 🔵 Low  
**Komponen:** `backend/src/products/` (multer + cloudinary)  
**OWASP:** A04:2021 — Insecure Design  
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

#### Deskripsi

Tanpa validasi MIME type yang ketat di sisi server, attacker bisa mengupload file dengan ekstensi gambar (.jpg) tapi konten berbeda (executable, script, SVG dengan XSS payload).

#### Remediasi

```typescript
// src/common/config/multer.config.ts
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import * as fileType from 'file-type';

export const multerConfig = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5,                   // Max 5 file per request
  },
  fileFilter: (req: any, file: Express.Multer.File, callback: Function) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    // Validasi MIME type dari header (bisa dipalsukan, tapi ini layer pertama)
    if (!allowedMimes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(`File type ${file.mimetype} not allowed. Only JPEG, PNG, WEBP.`),
        false
      );
    }
    callback(null, true);
  },
};

// Di service — validasi MIME type dari konten binary (tidak bisa dipalsukan)
async uploadProductImage(file: Express.Multer.File): Promise<string> {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(file.buffer);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!detected || !allowedTypes.includes(detected.mime)) {
    throw new BadRequestException('File content does not match allowed image types');
  }

  // Upload ke Cloudinary setelah validasi
  return this.cloudinaryService.uploadBuffer(file.buffer, {
    folder: 'shopverse/products',
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  });
}
```

---

### [SEK-012] Insufficient Audit Trail Transaksi

**Severity:** 🔵 Low  
**Komponen:** `backend/src/orders/`, `backend/src/payments/`  
**OWASP:** A09:2021 — Security Logging and Monitoring Failures  
**CWE:** CWE-778 (Insufficient Logging)

#### Deskripsi

Untuk sistem e-commerce yang menyentuh transaksi keuangan, audit trail yang lengkap bukan hanya best practice — ini dibutuhkan untuk dispute resolution (customer claim sudah bayar tapi status masih pending), compliance, dan forensic debugging saat ada insiden.

#### Remediasi

**Implementasi structured logging untuk semua event transaksi:**

```typescript
// src/common/services/audit-logger.service.ts
import { Injectable, Logger } from '@nestjs/common';

export type AuditEvent =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'PAYMENT_WEBHOOK_RECEIVED'
  | 'PAYMENT_WEBHOOK_PROCESSED'
  | 'PAYMENT_WEBHOOK_IGNORED'
  | 'STOCK_DECREMENTED'
  | 'VOUCHER_APPLIED'
  | 'UNAUTHORIZED_ADMIN_ATTEMPT';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger('AUDIT');

  log(event: AuditEvent, context: Record<string, any>) {
    this.logger.log(
      JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
  }
}

// Penggunaan di orders.service.ts
this.auditLogger.log('ORDER_CREATED', {
  orderId: order.id,
  userId,
  grandTotal,
  itemCount: items.length,
  voucherCode: voucherCode ?? null,
});

// Penggunaan di payments.service.ts — webhook handler
this.auditLogger.log('PAYMENT_WEBHOOK_RECEIVED', {
  orderId: payload.order_id,
  transactionStatus: payload.transaction_status,
  grossAmount: payload.gross_amount,
  sourceIp: request.ip,
});
```

---

## 5. Prioritas Eksekusi

Urutan eksekusi berikut mengikuti prinsip **risk-first**: celah yang paling mudah dieksploitasi dengan dampak terbesar diselesaikan terlebih dahulu.

### 🔴 Sprint 0 — Sebelum Go-Live (Hari ini)

| # | ID | Task | Estimasi |
|---|---|---|---|
| 1 | SEK-001 | Buat `RolesGuard`, audit semua endpoint admin, tambahkan `@Roles()` decorator | 4–6 jam |
| 2 | SEK-003 | Refactor `createOrder()` untuk server-side price calculation, update DTO hapus field price | 3–4 jam |
| 3 | SEK-002 | Implementasi idempotency check di webhook handler, tambahkan index ke `Payment.midtransOrderId` | 2–3 jam |

### 🟠 Sprint 1 — Minggu Pertama Produksi

| # | ID | Task | Estimasi |
|---|---|---|---|
| 4 | SEK-004 | Implementasi refresh token rotation, update schema `RefreshToken` | 3–4 jam |
| 5 | SEK-005 | Aktifkan `whitelist: true` di ValidationPipe, audit semua DTO | 2 jam |
| 6 | SEK-006 | Konfigurasi throttler per-endpoint untuk auth, aktifkan Redis storage | 2 jam |

### 🟡 Sprint 2 — 30 Hari Pertama

| # | ID | Task | Estimasi |
|---|---|---|---|
| 7 | SEK-008 | Update konfigurasi Nginx dengan security headers dan TLS settings | 1–2 jam |
| 8 | SEK-009 | Implementasi `GlobalExceptionFilter`, pastikan tidak ada stack trace di response | 1–2 jam |
| 9 | SEK-007 | Audit `.env` dan `.gitignore`, validasi env vars di startup, scan git history | 1 jam |
| 10 | SEK-010 | Audit semua `$queryRaw` penggunaan, migrasi ke Prisma query builder | 2–3 jam |

### 🔵 Backlog

| # | ID | Task | Estimasi |
|---|---|---|---|
| 11 | SEK-011 | Tambahkan binary MIME type validation untuk file upload | 2 jam |
| 12 | SEK-012 | Implementasi `AuditLoggerService` untuk semua event transaksi | 3–4 jam |

---

## 6. Checklist Verifikasi Post-Remediation

Setelah setiap remediation diimplementasi, verifikasi dengan pengujian berikut:

### Verifikasi SEK-001 (Authorization Bypass)
```bash
# Test 1: Login sebagai CUSTOMER, coba akses endpoint admin
TOKEN=$(curl -s -X POST https://api.domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"password"}' | jq -r '.accessToken')

curl -s -X GET https://api.domain.com/reports \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden

curl -s -X DELETE https://api.domain.com/products/any-id \
  -H "Authorization: Bearer $TOKEN"
# Expected: 403 Forbidden

# Test 2: Tanpa token sama sekali
curl -s -X GET https://api.domain.com/reports
# Expected: 401 Unauthorized
```

### Verifikasi SEK-002 (Webhook Replay)
```bash
# Kirim webhook yang sama 3 kali berturut-turut
WEBHOOK_PAYLOAD='{"order_id":"test-order","transaction_status":"settlement","gross_amount":"100000","signature_key":"..."}'

for i in 1 2 3; do
  curl -s -X POST https://api.domain.com/payments/webhook \
    -H "Content-Type: application/json" \
    -d "$WEBHOOK_PAYLOAD"
done
# Expected: Request ke-2 dan ke-3 mengembalikan "Already processed" tanpa mengubah database
```

### Verifikasi SEK-003 (Price Tampering)
```bash
# Coba kirim order dengan harga yang dimanipulasi
curl -s -X POST https://api.domain.com/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"abc","quantity":1,"price":1}],"addressId":"addr-id"}'
# Expected: DTO menolak field "price" (400 Bad Request: property price should not exist)
# Dan snapToken yang dikembalikan menggunakan harga dari database, bukan dari request
```

### Verifikasi SEK-008 (Security Headers)
```bash
curl -I https://api.domain.com
# Expected headers yang harus ada:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# content-security-policy: ...
```

### Verifikasi SEK-009 (Error Exposure)
```bash
# Trigger 500 error dengan request invalid ke endpoint yang ada
curl -s https://api.domain.com/nonexistent-endpoint-xyz
# Expected: {"statusCode":404,"message":"..."} — TANPA stack trace
```

---

## 7. Referensi

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NestJS Security Documentation](https://docs.nestjs.com/security/authentication)
- [Prisma Security Considerations](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [Midtrans Webhook Documentation](https://docs.midtrans.com/en/after-payment/http-notification)
- [Mozilla Security Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)

---

*Dokumen ini dihasilkan berdasarkan review arsitektur whitebox. Disarankan untuk melakukan penetration testing blackbox tambahan setelah semua remediasi diimplementasi, terutama untuk alur pembayaran end-to-end.*
