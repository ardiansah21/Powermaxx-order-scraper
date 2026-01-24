# Powermaxx Order Scraper

Ekstensi Chrome (Manifest V3) untuk mengambil data order dan income marketplace (Shopee/TikTok Shop) lalu mengirim ke API Powermaxx.

Developer: Ardiansah / Arva.

## Cara pasang

- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder ini.
- Pin ekstensi agar mudah dibuka.

## Cara pakai

- Buka tab `seller.shopee.co.id` (sudah login) dan biarkan sebagai tab aktif.
- Saat popup dibuka, tampil layar login (Base URL diambil dari Pengaturan).
- Login di popup menggunakan **/api/login** agar token global tersimpan.
- Aksi utama: **Ambil + Kirim** (ambil data lalu POST ke `/api/orders/import`).
- **Download AWB**, **Ambil Data**, **Kirim Data**, dan **Lihat Data** ada di menu **Aksi lainnya**.
- Logout ada di menu profil (klik kartu profil).

## Pengaturan

- Klik ikon **Pengaturan** di popup untuk membuka halaman options.
- Atur Base URL API per marketplace (Shopee/TikTok) untuk kebutuhan export.
- Atur endpoint AWB Shopee (get_package, create_sd_jobs, download_sd_job) + opsi file label.
- Marketplace aktif dideteksi otomatis dari URL tab; jika tidak terdeteksi, pakai default marketplace di pengaturan.

## Catatan

- Fetch berjalan di tab aktif dengan `credentials: include`, jadi cookie sesi Shopee ikut terkirim.
- Token API didapat dari `/api/login` di popup, disimpan di storage, dan dipakai di semua request export.
- Download AWB membutuhkan tab order detail (URL mengandung `/order/<order_id>`).
- Nama file AWB otomatis: `YYYYMMDD-HHmm_SHOPEE_{order_sn}.pdf` (waktu lokal).
- Endpoint bawaan Shopee:
  - `https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components`
  - `https://seller.shopee.co.id/api/v3/order/get_one_order`
  - `https://seller.shopee.co.id/api/v3/order/get_package`
  - `https://seller.shopee.co.id/api/v3/logistics/create_sd_jobs`
  - `https://seller.shopee.co.id/api/v3/logistics/download_sd_job`

## Output viewer

- Ringkasan berbasis `get_one_order` (Order SN ditampilkan paling besar).
- **Order Items (Sheet)** dan **Income Breakdown (Sheet)** disembunyikan default; bisa ditampilkan.
- JSON income/order disembunyikan default; bisa ditampilkan dan diunduh.

## Struktur singkat

- `manifest.json`: konfigurasi MV3 + permissions.
- `src/popup/`: UI popup (login view -> main view, status di atas, aksi utama + menu aksi lainnya).
- `src/viewer/`: viewer untuk ringkasan, sheet, dan JSON.
- `src/options/`: halaman pengaturan per marketplace.
- `examples/shopee/`: contoh payload dan hasil respons.
