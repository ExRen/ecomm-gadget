# Plan Deployment & Project Overview: ShopVerse E-Commerce

Dokumen ini merangkum keseluruhan struktur aplikasi ShopVerse, stack teknologi yang digunakan, alur fungsi utama, serta rancangan deployment menggunakan layanan web hosting (VPS / cPanel).

## 🚀 Tech Stack (Teknologi yang Digunakan)

Aplikasi dibangun menggunakan model **Monorepo** dengan pemisahan Frontend dan Backend secara fungsional (Headless Commerce architecture).

### Frontend
- **Framework Utama:** Next.js (App Router, React 18)
- **Styling:** Vanilla CSS (CSS Modules)
- **State Management:** Zustand (untuk Global State Cart & Auth LocalStorage)
- **Data Fetching:** Axios (REST API Client)
- **UI Components:** Lucide-React (Icons), React Hot Toast (Notifications)
- **Integrasi Pihak ke 3:** Midtrans Snap SDK JS (Pop-up Pembayaran)

### Backend
- **Framework Utama:** NestJS (Node.js REST API Architecture)
- **Database ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Autentikasi:** Passport.js (Local & JWT Strategy), Bcrypt JS
- **File Upload:** Multer & Cloudinary
- **Validasi:** Class-Validator & Class-Transformer (DTO Pattern)

---

## 📁 Struktur Direktori Kode & File

### Root Direktori
- `frontend/`: Berisi kode User Interface dan Admin Panel Next.js.
- `backend/`: Berisi backend API Restful dengan NestJS.

### Arsitektur `frontend/`
- `src/app/(storefront)`: Berisi halaman publik Customer (Beranda, Kategori, Produk, Checkout, Profile).
- `src/app/admin`: Berisi panel CMS khusus admin (Manajemen Produk, Kategori, Order, Voucher).
- `src/components`: Komponen modular UI yang dapat di-reuse (Navbar, ProductCard, CartDrawer).
- `src/lib`: Helper functions (formatHarga, formatDate) dan instansi Axios Middleware (`api.ts`).
- `src/stores`: Zustand state files (`useCartStore`, `useAuthStore`).

### Arsitektur `backend/`
- `prisma/`: Mendefinisikan Skema Database ORM (`schema.prisma`) untuk tabel User, Product, Order, Payment.
- `src/main.ts`: Entry point awal program & Global Exception Filters.
- `src/auth`: Sistem login, verifikasi JWT Guard, & Registrasi.
- `src/orders`: Logika pesanan, kalkulasi diskon voucher, & pembuatan kerangka transaksi di DB.
- `src/payments`: Logika pembuatan `snap_token` Midtrans dan integrasi *Webhook Midtrans Listener*.
- `src/users`, `src/products`, `src/vouchers`: CRUD Controllers & Service Layer.

---

## ⚙️ Logika Fungsi Utama Aplikasi

### 1. Checkout & Pembayaran (Customer Journey)
Aplikasi menggunakan metode *Reserve Stock at Checkout*:
1. Cart Customer diproses saat tombol "Bayar" diklik.
2. Endpoint `POST /orders` memotong otomatis Stok Produk (`decrement stock`), menghilangkan isi keranjang, dan mengambil token URL snap pembayaran Midtrans.
3. Midtrans SDK Pop-up muncul di frontend untuk memproses opsi metode transfer.
4. Ketika dibayar, API panggil endpoint `POST /webhooks/midtrans` melalui Server Eksternal untuk mengupdate order menjadi `PAID`. (Frontend juga menembak trigger `confirm-payment` untuk sinkronisasi sekunder).
5. Jika pembayaran Dibatalkan/Expired, maka Webhook Midtrans akan otomatis *mengembalikan stok produk* ke database (+ `increment stock`).

### 2. Autentikasi dan Role (RBAC)
Pemisahan hak akses:
- **USER:** Customer, hanya bisa mengakses profil dan melakukan order.
- **ADMIN:** Tim Management toko (Akses `/admin/` Dashboard). Admin diotorisasi melalui JSON Web Token (JWT) Bearer di HTTP Headers pada Request yang mengarah ke `Controller` dengan decorator `@Roles(Role.ADMIN)`.

### 3. File Processing (Manajemen Foto Produk)
Backend menerima stream gambar/file lalu mengirimkannya (unggah) tanpa membebani disk/hardisk server secara langsung ke Cloudinary API Cloud. Backend menyimpan URL resolusi gambarnya di string database.

---

## 🌐 Rencana Deployment via Web Hosting

Untuk web hosting dalam negeri/tradisional, tipe terbaik adalah **Cloud Linux VPS**, namun berikut panduan umum bila menggunakan VPS.

### Tahap 1: Setup Infrastructure Server
1. Akses instance VPS kamu yang telah aktif dengan OS minimal Ubuntu 22.04 LTS.
2. Instal Node.js (Minimal v18) dan Process Manager (`PM2`).
3. Setup dan aktifkan PostgreSQL Database engine, lalu buat User & kredensial password.
4. Instal web server reverse proxy misal `Nginx`.

### Tahap 2: Backend Node API (Berjalan di background port 3001)
1. Lakukan GIT CLONE repositori aplikasi kamu atau upload via File Transfer Protocol.
2. Setup file `.env` di dalam root direktori backend dan input alamat URL PostgreSQL yang baru dibuat diserver.
3. Eksekusi Skema Database Production via terminal server di folder backend:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
4. Build API dan aktifkan 24/7 menggunakan PM2:
   ```bash
   npm run build
   pm2 start dist/src/main.js --name "shopverse-api"
   pm2 save
   ```
5. Binding domain (contoh: `api.shopverse.com`) ke port `3001` via `Nginx` block file.

### Tahap 3: Frontend NextJS App (Berjalan di background port 3000)
1. Setup file konfigurasi `.env.local` pada frontend dengan URL Public API backend yang baru di setup (contoh: `https://api.shopverse.com/api/v1`).
2. Proses Build Next.js dan jalankan instance Server (SSR):
   ```bash
   npm install
   npm run build
   pm2 start npm --name "shopverse-frontend" -- start
   pm2 save
   ```
3. Binding Top Level Domain utama misal `shopverse.com` ke port `3000` via pengaturan `Nginx`.
4. Install koneksi HTTPS Sertifikat SSL dari (Let's Encrypt botc) pada Nginx.

### Tahap 4: Finalisasi Server Midtrans Produksi
Masuk ke pengaturan Midtrans Dashboard tab *Configuration* dan ganti URL Notification/Webhook menjadi endpoint production api yang terdaftar HTTPS.
`https://api.shopverse.com/api/v1/webhooks/midtrans`
