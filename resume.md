# Dokumentasi Proyek: E-Commerce Midtrans (ShopVerse)

Dokumen ini berisi rangkuman komprehensif mengenai struktur, spesifikasi, detail teknis logika dan fungsi di dalam implementasi kode, hingga strategi *deployment* di server VPS untuk sistem e-commerce **ShopVerse**.

---

## 1. Penjelasan Singkat Proyek
**ShopVerse (E-Commerce Midtrans)** adalah platform e-commerce *full-stack* modern berskala enterprise. Sistem ini diciptakan untuk memfasilitasi perdagangan online end-to-end, dikendalikan oleh backend (REST API) kokoh dan frontend teroptimasi. Fitur krusial yang menonjol adalah metode *single-transaction checkout* terintegrasi Midtrans (menerima aneka jenis bank transfer, e-wallet, dsb) secara instan.

---

## 2. Struktur Tree Proyek Terperinci
Sistem ini menggunakan arsitektur *monorepo* terbagi dalam lingkungan backend (NestJS) dan frontend (Next.js):

```text
E-Commerce Midtrans/
├── backend/                  
│   ├── prisma/               
│   │   ├── schema.prisma     # Definisi Data Model (PostgreSQL)
│   │   └── seed.ts           # Skrip pengisian data dasar awal (Mock data)
│   ├── src/                  
│   │   ├── auth/             # Logika otentikasi (JWT strategy, Guards, SignIn/Up)
│   │   ├── cart/             # Manajemen keranjang belanja pengguna
│   │   ├── categories/       # API Kategori produk
│   │   ├── common/           # Decorator custom, Filters, Interceptor, DTO Global
│   │   ├── orders/           # Logika Lifecycle pesanan (Pending, Paid, Shipped)
│   │   ├── payments/         # Layanan webhook & interaksi SDK Midtrans
│   │   ├── prisma/           # Prisma service instantiation
│   │   ├── products/         # API Katalog, SKU, Manajemen Stok (CRUD)
│   │   ├── reports/          # Logika export laporan admin
│   │   ├── reviews/          # Ulasan dan rating per item
│   │   ├── settings/         # Manajemen konfigurasi e-commerce
│   │   ├── users/            # Pengaturan profil pengguna dan alamat
│   │   ├── vouchers/         # Kalkulasi diskon promosional dinamis
│   │   ├── wishlist/         # Manajemen barang favorit
│   │   ├── app.module.ts     # Root module NestJS
│   │   └── main.ts           # Titik masuk eksekusi (Bootstrap API)
│   └── docker-compose.yml    # Konfigurasi containerized database
│
└── frontend/                 
    ├── public/               # Favicon dan aset statis publik
    ├── src/
    │   ├── app/              # (App Router)
    │   │   ├── (storefront)/ # Halaman end-user publik (Katalog produk, Home, Rekening)
    │   │   ├── admin/        # Dashboard Admin CMS terlindungi (grafik, kelola produk & order)
    │   │   ├── login/        # Halaman Login
    │   │   ├── register/     # Halaman Registrasi
    │   │   ├── globals.css   # Reset styling Tailwind global
    │   │   └── providers.tsx # Wrapper React Query & Config global
    │   ├── components/       
    │   │   ├── cart/         # UI sidebar keranjang belanja
    │   │   ├── layout/       # Navbar, Footer publik, dan Sidebar Admin
    │   │   └── product/      # Rendering card produk, image gallery
    │   ├── lib/              
    │   │   ├── axios.ts      # Instansi spesifik Http client
    │   │   └── utils.ts      # Fungsi format harga (Rupiah), format tanggal
    │   ├── stores/           
    │   │   ├── authStore.ts  # Zustand: Menyimpan state sesi login saat ini
    │   │   └── cartStore.ts  # Zustand: State keranjang
    │   └── types/            # Interface & Tipe TypeScript untuk sinkronisasi dengan endpoint API
    └── tailwind.config.js    # Konfigurasi token komponen visual
```

---

## 3. Fitur Utama & Logika Kode yang Dipakai

Secara teknis, berikut adalah aliran fitur dan *function* esensial di dalamnya:

### A. Fitur Backend (NestJS)
* **Autentikasi & Otorisasi:** 
  * Menggunakan modul `Passport` & `JwtService`.
  * *Function/Decorator yang dipakai:* `@UseGuards(JwtAuthGuard, RolesGuard)`. Endpoint akan menolak akses yang tidak valid. Guard mengekstrak identitas JWT dalam `req.user`.
* **Proses Checkout (Orders & Payments):** 
  * Saat *Checkout*, method `createOrder()` di `orders.service.ts` akan membuat baris database order. 
  * Di saat yang sama, ia akan memanggil fungsi dari modul `payments` (via `snap.createTransaction()`) milik API SDK **Midtrans**. 
  * Hasil dari *checkout* itu langsung me-return `snapToken`. Ini mencegah user harus melewati 2 tahap hanya untuk membayar.
* **Database Transactions:**
  * Dalam pembuatan Order (yang melibatkan pemesanan, pengurangan stok, pembuatan riwayat pembayaran), kode menggunakan mekanisme transaction block `$transaction()` di Prisma `prisma.service.ts`, untuk memastikan semua query gagal total apabila terjadi setidaknya satu pesan error (menjaga konsistensi data).
* **Payment Webhook Callback:**
  * Terdapat Endpoint `/payments/webhook` tanpa JWT guard (Publik). Endpoint ini menunggu *event post* dari server Midtrans (misalnya saat customer membayar kasir di Indomaret). 
  * *Function logic:* akan mengonfirmasi signature `crypto-js` lalu mentrigger ubah status `OrderStatus.PAID` ke database secara *real-time*.
* **Manajemen DTO & Validasi (Data Transfer Object):**
  * Tiap input diamankan dengan kelas DTO (contoh `CreateProductDto`). Dihiasi dengan tag class-validator seperti `@IsString()`, `@IsNumber()`. Semua data divalidasi *ValidationPipe* bawaan di `main.ts`.

### B. Fitur Frontend (Next.js)
* **Integrasi Fetching Data yang Optimis (React Query):**
  * Bukannya memakai dasar `useEffect` biasa, fetch data dimandatkan pada instruksi Hook (contoh: `useQuery({ queryKey: ['products'], queryFn: ... })`). Ini menyediakan status *isLoading*, sinkronisasi cache, serta _auto-refetch_ pada panel Admin.
* **Manajemen Global State (Zustand):**
  * Menyimpan state spesifik dengan ringan. Contoh `useAuthStore` dan `useCartStore`. Saat login berhasil, respons token diekstrak dan *user payload* disisipkan ke state aplikasi tanpa memicu *rerender* tak perlu.
* **Pop-Up Midtrans Snap Window:**
  * Menggunakan event dari frontend, misal `window.snap.pay(snapToken)`. Memicu pop up bawaan midtrans untuk pemilihan metode bayar tanpa harus berpindah link *redirect* dan merusak pengalaman pengguna.
* **Rendering Data Kustom Berbasis Role:**
  * Komponen `<AdminLayout>` langsung mengidentifikasi role via `useAuthStore().user.role`. Apabila nilainya `CUSTOMER`, dia di-*redirect* (menggunakan *Router from next/navigation*) kembali ke halaman utama mencegah eskalasi sistem.

---

## 4. Spesifikasi Database & Sistem
* **Database Utama:** PostgreSQL.
* **In-Memory Store:** Redis (dipakai eksklusif oleh Backend).
* **Delivery Image:** Cloudinary Integrations.
* **Mailing:** Nodemailer SMTP.

---

## 5. Implementasi Deployment VPS (Lokal vs Server)

Membangun platform di VPS berbeda secara drastis dibanding tahap development `npm run dev` pada localhost komputer.

| Aspek Operasional | Environment Komputer Lokal (Development) | Environment Server VPS (Production) | Penjelasan Teknis & Solusi |
| :--- | :--- | :--- | :--- |
| **Domain Host & URL** | `http://localhost:3000` & `http://localhost:4000` | Misal: `https://shop.domain.com` (Frontend) & `https://api.domain.com` (Backend) | Di VPS, konfigurasi *Environment Variable* (seperti `NEXT_PUBLIC_API_URL` dan `CORS_ORIGIN`) harus mengarah ke Domain Public yang riil. |
| **Reverse Proxy / Web Server** | Mengakses Node.Js port langsung secara native. | Diwajibkan memakai **Nginx**. | Di VPS, *Nginx* digunakan sebagai penjaga depan. Request ke port `80`/`443` akan disuntikkan ke daemon internal port `3000`/`4000`. Ini menunjang keamanan IP, Gzip compression skala raksasa, dan perutean traffic efisien. |
| **Sertifikat Keamanan HTTPS** | Tidak digunakan (polos HTTP). | HTTPS Mutlak / **Let's Encrypt / Certbot**. | Agar Midtrans snap dapat digunakan, atau fungsi geolocation dapat diambil, browser modern dan webhook Midtrans Production memblokir keras koneksi HTTP biasa. SSL dikonfigurasi melalui Nginx. |
| **Process Manager (Runner)** | `npm run start:dev` / *Nodemon* berjalan di Terminal foreground. | **PM2** (Process Manager) atau Kontainerisasi **Docker**. | Jika terminal SSH ditutup, server biasa mati. Di VPS kita menggunakan PM2 (`pm2 start dist/main.js`) agar proses tetap menyala di *background*, dan fitur `auto-restart` saat *crash* atau *Server Reboot* terpenuhi. |
| **Konfigurasi Database** | Prisma menargetkan Docker PostgreSQL Host (`localhost:5432`) | Variabel Env `DATABASE_URL` menggunakan kredensial spesifik production. | Seringkali database dipisah servernya, atau kalau servernya sama, password user database lebih direstriksi hak akses publiknya (ditutup ufw/firewall 5432-nya). |
| **Midtrans Environment Key** | *Sandbox Mode* (Key Uji Coba). | *Production Mode* (Key Riil Pencairan Uang). | Modul di NestJS harus mengubah instruksi integrasi isProduction: true pada inisiasi variabel *global client SDK*. |
