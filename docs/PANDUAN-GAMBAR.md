# Panduan Gambar untuk README.md

Upload semua gambar ke folder `docs/` ini, dengan nama file sesuai di bawah.

---

## Daftar Gambar yang Dibutuhkan

### 1. `preview.png` — Gambar Utama (Hero Image)
**Teks/Alt:** `NotaQ Kasir Preview`

**Saran konten:**
- Screenshot tampilan keseluruhan aplikasi — bisa gabungan beberapa halaman (collage)
- Atau screenshot halaman POS yang paling menarik
- Ukuran ideal: lebar minimal 1200px, rasio 16:9 atau 21:9

---

### 2. `login.png` — Halaman Login
**Teks/Alt:** `Halaman Login NotaQ Kasir`

**Saran konten:**
- Screenshot halaman `http://localhost:8080/login`
- Tampilkan form login dengan background hijau gradient
- Tunjukkan nama aplikasi "NotaQ Kasir" di kartu login

---

### 3. `dashboard.png` — Dashboard
**Teks/Alt:** `Dashboard NotaQ Kasir`

**Saran konten:**
- Screenshot halaman dashboard setelah login sebagai admin
- Tampilkan ringkasan: total penjualan, produk, stok, dll

---

### 4. `pos.png` — Halaman POS Kasir
**Teks/Alt:** `Halaman POS Kasir`

**Saran konten:**
- Screenshot halaman `http://localhost:8080/sales/pos`
- Tampilkan daftar produk dan keranjang belanja
- Idealnya ada beberapa produk di keranjang

---

### 5. `qris-modal.png` — Modal QRIS saat Bayar
**Teks/Alt:** `Modal QRIS Payment`

**Saran konten:**
- Screenshot modal SweetAlert yang muncul saat memilih "QRIS" di POS
- Tampilkan QR Code dengan nominal transaksi (contoh: Rp 50.000)
- Tombol "Sudah Bayar" dan "Batal" harus terlihat

---

### 6. `qris-setting.png` — Pengaturan QRIS
**Teks/Alt:** `Pengaturan QRIS Merchant`

**Saran konten:**
- Screenshot halaman `http://localhost:8080/payment-settings`
- Tampilkan area upload gambar dan status QRIS tersimpan

---

### 7. `laporan.png` — Halaman Laporan
**Teks/Alt:** `Laporan Penjualan NotaQ Kasir`

**Saran konten:**
- Screenshot halaman laporan penjualan atau laporan keuntungan
- Idealnya ada data transaksi yang terisi

---

### 8. `qris-donasi.png` — QR Code Donasi
**Teks/Alt:** `QRIS Donasi Saputra Budi`

**Saran konten:**
- Gambar QR Code QRIS Anda (dari bank/e-wallet) untuk menerima donasi
- Bisa tambahkan teks "Donasi via QRIS" di sekitar QR
- Ukuran ideal: 500x500px, background putih bersih
- Pastikan QR bisa di-scan dengan jelas

---

## Tips Screenshot

1. Gunakan browser **Chrome/Edge** untuk hasil terbaik
2. Tekan `F12` → klik ikon **Toggle Device Toolbar** untuk mode mobile
3. Resolusi screenshot yang disarankan: **1280x720** atau lebih
4. Gunakan **snipping tool** atau ekstensi **GoFullPage** untuk full-page screenshot
5. Simpan dalam format **PNG** untuk kualitas terbaik

---

## Cara Upload ke GitHub

1. Buka repository di `https://github.com/saputrabudi`
2. Buat folder `docs/` di repository (drag & drop gambar ke sana)
3. Atau gunakan perintah:

```bash
git add docs/
git commit -m "feat: add docs screenshots for README"
git push
```

---

*Dibuat oleh Saputra Budi*
