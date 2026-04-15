# NotaQ Kasir — Point of Sale (POS) App

> Aplikasi kasir berbasis web yang ringan, modern, dan lengkap untuk UMKM Indonesia.  
> Dibangun dengan Node.js + Express + EJS + SQLite. Berjalan tanpa perlu cloud atau database eksternal.

---

<!-- Ganti gambar di bawah dengan screenshot aplikasi Anda -->
![NotaQ Kasir Preview](docs/preview.png)

---

## ✨ Fitur Utama

### 🛒 Kasir (POS)
- Antarmuka kasir yang responsif, cocok untuk layar hp maupun desktop
- Scan barcode produk langsung dari input scanner
- Filter produk berdasarkan kategori (icon-only grid)
- Keranjang belanja real-time
- Pembayaran **Tunai** (dengan kalkulasi kembalian)
- Pembayaran **QRIS Dinamis** — QR Code ter-generate otomatis dengan nominal transaksi

### 📦 Manajemen Produk & Stok
- CRUD produk lengkap (nama, barcode, harga beli/jual, stok, kategori)
- Kategori produk dengan ikon Font Awesome
- Manajemen stok & riwayat penyesuaian
- Peringatan stok minimum

### 🧾 Purchase Order (PO)
- Buat PO ke supplier
- Status PO: Draft → Dipesan → Diterima → Dibatalkan
- Otomatis update stok saat PO diterima
- Cetak PO langsung dari browser

### 📊 Laporan
- Laporan penjualan harian/periode
- Laporan stok produk
- Laporan keuntungan (selisih harga beli vs jual)

### 👤 Manajemen User & Role
| Role    | Akses                                              |
|---------|----------------------------------------------------|
| `admin` | Full akses: produk, stok, PO, laporan, pengaturan  |
| `kasir` | Hanya akses POS & riwayat penjualan sendiri        |

### 💳 Pengaturan QRIS Merchant
- Upload gambar QRIS statis dari merchant (GoPay, OVO, DANA, BCA, dll)
- Scan & ekstrak QRIS string otomatis
- Validasi CRC16-CCITT sesuai standar EMVCo
- Modifikasi QRIS dinamis (insert tag `54` nominal) saat transaksi
- Toggle aktif/nonaktif QRIS payment

---

## 🛠 Tech Stack

| Komponen       | Teknologi                         |
|----------------|-----------------------------------|
| Backend        | Node.js, Express.js               |
| Templating     | EJS + express-ejs-layouts         |
| Database       | SQLite via sql.js (pure JS)       |
| Auth           | express-session + bcryptjs        |
| UI Framework   | Bootstrap 5 (mobile-first)        |
| Icons          | Bootstrap Icons + Font Awesome 6  |
| Alert/Modal    | SweetAlert2                       |
| QR Code        | qrcodejs + html5-qrcode           |
| QRIS           | CRC16-CCITT + EMVCo TLV parser    |

---

## 🚀 Instalasi & Menjalankan

### Prasyarat
- [Node.js](https://nodejs.org) versi **18 atau lebih baru**

### Langkah

```bash
# 1. Clone repository
git clone https://github.com/saputrabudi/notaq-kasir.git
cd notaq-kasir

# 2. Install dependencies
npm install

# 3. (Opsional) Isi data awal / sample
npm run seed

# 4. Jalankan server
npm start
```

Buka browser dan akses: **http://localhost:8080**

---

## 🔐 Login Default

| Username | Password  | Role  |
|----------|-----------|-------|
| `admin`  | `admin123`| Admin |
| `kasir`  | `kasir123`| Kasir |

> ⚠️ Segera ganti password setelah login pertama.

---

## 📁 Struktur Folder

```
notaq-kasir/
├── app.js                  # Entry point Express
├── config/
│   └── database.js         # Inisialisasi SQLite + wrapper API
├── middleware/
│   └── auth.js             # Auth & role middleware
├── routes/                 # Semua route Express
│   ├── auth.js
│   ├── sales.js
│   ├── products.js
│   ├── stock.js
│   ├── purchase-orders.js
│   ├── reports.js
│   ├── payment-settings.js
│   └── ...
├── views/                  # Template EJS
│   ├── layouts/
│   ├── partials/
│   ├── sales/
│   ├── products/
│   ├── settings/
│   └── ...
├── public/
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── pos.js
│       └── qris-utils.js   # CRC16 + TLV parser + modifyQRIS
├── database/               # File SQLite (auto-generated)
└── seed-data.js            # Seed data awal
```

---

## 💳 Cara Penggunaan QRIS Payment

<!-- Ganti gambar di bawah dengan screenshot halaman QRIS Setting -->
![QRIS Setting](docs/qris-setting.png)

1. Login sebagai **Admin**
2. Buka menu **Pengaturan Payment**
3. Upload gambar QR Code QRIS statis merchant Anda
4. Sistem scan & validasi CRC otomatis
5. Simpan dan aktifkan QRIS
6. Saat transaksi di POS → klik **Bayar** → pilih **QRIS**
7. QR Code dengan nominal transaksi ter-generate otomatis
8. Customer scan QR, kasir konfirmasi **"Sudah Bayar"**

---

## 📸 Screenshot

<!-- Upload screenshot ke folder docs/ lalu sesuaikan nama file -->

| Halaman | Preview |
|---------|---------|
| Login | ![Login](docs/login.png) |
| Dashboard | ![Dashboard](docs/dashboard.png) |
| POS Kasir | ![POS](docs/pos.png) |
| Modal QRIS | ![QRIS](docs/qris-modal.png) |
| Laporan | ![Laporan](docs/laporan.png) |
| Pengaturan QRIS | ![Setting](docs/qris-setting.png) |

---

## 💡 Catatan Teknis

- **sql.js** digunakan sebagai pengganti `better-sqlite3` agar kompatibel dengan Node.js versi terbaru tanpa perlu compile native module.
- **QRIS** mengikuti standar **EMVCo** dengan validasi CRC16-CCITT dan parsing TLV yang tepat.
- Aplikasi **tidak memerlukan internet** setelah install — semua berjalan lokal.

---

## 🙏 Donasi

Jika aplikasi ini bermanfaat, dukung pengembangan dengan donasi melalui QRIS:

<!-- Upload gambar QRIS donasi ke docs/qris-donasi.png -->
<p align="center">
  <img src="docs/qris-donasi.png" alt="QRIS Donasi Saputra Budi" width="250">
</p>

<p align="center">
  <strong>Scan untuk Donasi</strong><br>
  Terima kasih atas dukungan Anda! 🙏
</p>

---

## 👨‍💻 Developer

<p align="center">
  <strong>Saputra Budi</strong><br>
  IT Network & App Development Practitioner<br>
  🇮🇩 Indonesia
</p>

<p align="center">
  <a href="https://github.com/saputrabudi">github.com/saputrabudi</a>
</p>

---

## 📄 Lisensi

ISC License — bebas digunakan dan dimodifikasi untuk kebutuhan pribadi maupun komersial.

---

<p align="center">
  Made with ❤️ by <strong>Saputra Budi</strong>
</p>
