# Product Requirements Document (PRD)
**Project Name:** Ollapos (Elderly-Friendly)
**Version:** 1.0 (Pilot Phase - Standalone Mode)
**Platform:** Web Application (Optimized for Desktop All-in-One / 1920x1080)
**Tech Stack:** Next.js 14+ (App Router), PostgreSQL, Better Auth, Tailwind CSS, Lucide React.

---

## 1. Executive Summary
Aplikasi ini adalah sistem Point of Sale (POS) dan Manajemen Stok berbasis web yang dirancang khusus untuk **Pangkalan LPG** (Retailer Gas).

**Unique Selling Point:**
Aplikasi ini memiliki antarmuka **"Elderly-Friendly" (Ramah Lansia)**. Target pengguna utamanya adalah "Bude" (Wanita usia 50+) yang tidak mahir teknologi. Desain harus meminimalisir input keyboard, menggunakan tombol visual yang besar, dan memiliki logika otomatisasi untuk mencegah kesalahan hitung stok dan uang.

**Phase 1 Context:**
Meskipun sistem didesain untuk hierarki *Agen > Pangkalan*, fase ini akan berjalan dalam **Mode Mandiri (Standalone)**. Pangkalan akan melakukan restock (kulakan) data secara manual karena belum ada integrasi real-time dengan Agen.

---

## 2. Target User (Persona)

**Primary User: "Bude" (Pemilik Pangkalan)**
* **Hardware:** PC Desktop All-in-One (Layar Sentuh/Mouse + Keyboard Fisik).
* **Karakteristik:** Penglihatan menurun (perlu font besar), bingung dengan menu yang tersembunyi, takut salah pencet.
* **Input Preference:** Lebih suka Klik Mouse daripada mengetik.
* **Pain Points:** Sering lupa harga khusus untuk tetangga, bingung hitung kembalian, stok tabung kosong sering hilang.

---

## 3. UI/UX Design Principles (Strict Rules)

1.  **Split Screen Layout (Desktop Optimized):**
    * Jangan gunakan navigasi halaman yang berpindah-pindah. Gunakan layout **Kiri (Katalog)** dan **Kanan (Kasir/Struk)** yang statis.
2.  **Interaction Model:**
    * **Single Click:** Tambah item (+1).
    * **Click on Quantity:** Edit jumlah masif (muncul Modal Numpad).
    * **Forbidden:** *Long-press* (Tekan tahan) atau *Right-click* (Klik kanan) -> **DILARANG** karena membingungkan lansia.
3.  **Visual Hierarchy:**
    * Ukuran Font Dasar: **18px**.
    * Harga & Total: **24px - 36px (Bold)**.
    * Tombol Aksi (Bayar/Simpan): Warna Kontras (Hijau/Biru) dan berukuran besar (Min padding 20px).
4.  **Input:**
    * Hindari keyboard QWERTY sebisa mungkin.
    * Gunakan **On-Screen Numpad** untuk segala input angka.

---

## 4. Functional Requirements

### 4.1. Authentication
* Library: **Better Auth**.
* Method: Email & Password.
* **Requirement:** Session harus bersifat *long-lived* (misal: 30 hari) agar user tidak perlu login berulang kali.

### 4.2. Dashboard / POS Interface (Main Screen)
**Layout Kiri (Katalog Produk):**
* **Tabs Kategori Besar:** [GAS LPG] | [AIR GALON] | [LAINNYA].
* **Product Card:** Gambar Produk (Dominan) + Nama + Harga.
* **Badge:** Menampilkan jumlah item yang sedang ada di keranjang di atas gambar produk.

**Layout Kanan (Keranjang & Checkout):**
* List item dengan tombol **(+)** dan **(-)** besar.
* **Fitur Edit Jumlah:** Jika angka jumlah diklik, buka **Modal Numpad** ("Ubah jumlah jadi berapa?").
* **Customer Selector:**
    * Default: "Tamu Umum" (Harga Normal).
    * Tombol "Pilih Pelanggan": Membuka modal daftar pelanggan.
    * *Logic:* Saat pelanggan VIP dipilih, harga item di keranjang otomatis terupdate menjadi harga VIP.

### 4.3. Payment System (Smart Calculator)
Saat tombol "BAYAR" ditekan, muncul Modal Pembayaran:

1.  **Metode Tunai (Cash):**
    * Tampilkan Total Tagihan.
    * **Smart Buttons:** Tampilkan pecahan uang instan (Pas, 20rb, 50rb, 100rb).
    * **Manual Input:** Numpad untuk input nominal lain.
    * **Display Kembalian:** Tampilkan hasil kembalian dengan font RAKSASA.
2.  **Metode QRIS:**
    * Tampilkan instruksi/QR Code statis.
    * Tombol konfirmasi manual: "Uang Sudah Masuk".
3.  **Metode Kasbon (Hutang):**
    * Wajib memilih nama Pelanggan.
    * Status transaksi menjadi `UNPAID`.

### 4.4. Inventory Management (Manual Restock)
Menu khusus "Barang Masuk" untuk mencatat kedatangan truk agen.
* **Input:** Pilih Produk -> Input Jumlah (via Numpad).
* **Logic Tukar Guling (Swap Logic):**
    * *Trigger:* User input "Terima 50 Gas 3kg".
    * *Action:*
        1.  Stok Isi (Filled) bertambah **+50**.
        2.  Stok Kosong (Empty) berkurang **-50**.
    * *Alasan:* Asumsi pangkalan menukar tabung kosong dengan tabung isi.

---

## 5. Database Schema (PostgreSQL)

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('agent', 'pangkalan');
CREATE TYPE product_category AS ENUM ('gas', 'water', 'general');
CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'debt');
CREATE TYPE transaction_status AS ENUM ('paid', 'unpaid', 'void');

-- 1. USERS (Better Auth Base)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role user_role DEFAULT 'pangkalan',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. PANGKALANS (Profil Toko)
CREATE TABLE pangkalans (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL, -- "Pangkalan Bude Sri"
  address TEXT,
  phone TEXT
);

-- 3. CUSTOMERS (Pelanggan Tetap)
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id),
  name TEXT NOT NULL, -- "Pak Joko Bakso"
  is_vip BOOLEAN DEFAULT FALSE, -- True = Dapat Harga Murah
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. PRODUCTS (Master Produk)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id), -- NULL jika Global Product (LPG)
  name TEXT NOT NULL,
  category product_category,
  image_url TEXT,
  is_global BOOLEAN DEFAULT FALSE -- True untuk LPG 3kg/12kg
);

-- 5. INVENTORY (Stok Real-time)
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id),
  product_id TEXT REFERENCES products(id),
  stock_filled INT DEFAULT 0, -- Stok Siap Jual
  stock_empty INT DEFAULT 0,  -- Tabung Kosong (Aset Return)
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(pangkalan_id, product_id)
);

-- 6. PRICE RULES (Logika Harga Bertingkat)
CREATE TABLE price_rules (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id),
  product_id TEXT REFERENCES products(id),
  price_regular DECIMAL(10, 2) NOT NULL, -- Harga Tamu
  price_vip DECIMAL(10, 2) NOT NULL,     -- Harga Langganan
  UNIQUE(pangkalan_id, product_id)
);

-- 7. TRANSACTIONS (Header Transaksi)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id),
  customer_id TEXT REFERENCES customers(id), -- NULL jika Tamu
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method,
  cash_received DECIMAL(10, 2), -- Uang fisik diterima
  change_amount DECIMAL(10, 2), -- Kembalian
  status transaction_status DEFAULT 'paid',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TRANSACTION ITEMS (Detail Barang)
CREATE TABLE transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id),
  product_id TEXT REFERENCES products(id),
  qty INT NOT NULL,
  price_at_purchase DECIMAL(10, 2) NOT NULL, -- Snapshot harga saat deal
  subtotal DECIMAL(10, 2) NOT NULL
);

-- 9. INVENTORY LOGS (Riwayat Keluar Masuk)
CREATE TABLE inventory_logs (
  id TEXT PRIMARY KEY,
  pangkalan_id TEXT REFERENCES pangkalans(id),
  product_id TEXT REFERENCES products(id),
  qty_change_filled INT, -- Perubahan stok isi (+/-)
  qty_change_empty INT,  -- Perubahan stok kosong (+/-)
  type TEXT, -- 'sale', 'manual_restock', 'correction'
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);



6. Business Logic Implementation Guide
A. Pricing Engine Logic
Input: pangkalan_id, product_id, customer_id (optional).

Process:

Query tabel price_rules berdasarkan pangkalan & produk.

Jika customer_id ada: Cek status is_vip di tabel customers.

Jika VIP: Return price_vip.

Jika Regular/Null: Return price_regular.

B. Sales Transaction Logic (Gas Product)
Event: Transaksi Berhasil (Paid).

Inventory Action:

stock_filled: Berkurang sebesar Qty (Barang dibawa pembeli).

stock_empty: Bertambah sebesar Qty (Pembeli mengembalikan tabung kosong).

Exception: Jika penjualan tabung perdana (New Tube), stock_empty tidak bertambah. (Untuk fase 1, asumsikan semua Refill dulu untuk simplifikasi).

C. Manual Restock Logic (Barang Datang)
Event: User input Stok Masuk.

Inventory Action:

stock_filled: Bertambah (+Qty).

stock_empty: Berkurang (-Qty).

Validation: Pastikan stock_empty tidak minus (optional warning).

7. Step-by-Step Development Plan for AI
Project Init: Setup Next.js, Tailwind, Shadcn, dan Better Auth.

Database: Run SQL Migrations based on the schema above.

Seeding: Buat data dummy:

1 User (Role: Pangkalan).

3 Global Products (Gas 3kg, 5.5kg, 12kg).

2 Local Products (Galon, Beras).

1 Customer VIP (Pak Joko).

Price Rules untuk produk tersebut.

Component Build:

Buat component ProductCard dengan prop qty.

Buat component CartItem dengan tombol +/-.

Buat component NumpadModal (Reusable for Quantity Edit & Payment).

Page Build:

Implementasi layout Split Screen page.tsx.

Integrasi logic Cart (Zustand/Context).

Backend Logic:

Implementasi Server Action untuk createTransaction dan updateStock.

Testing: Coba alur "Beli 50 Gas" -> "Ubah Harga VIP" -> "Bayar Cash 1 Juta".