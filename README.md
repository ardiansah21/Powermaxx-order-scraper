# Powermaxx Order Scraper

Ekstensi Chrome (Manifest V3) untuk mengambil data order dan income marketplace (Shopee/TikTok Shop) lalu mengirim ke API Powermaxx.

Developer: Ardiansah / Arva.

## Cara pasang

- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder ini.
- Pin ekstensi agar mudah dibuka.

## Cara pakai

- Buka tab `seller.shopee.co.id` (sudah login) dan biarkan sebagai tab aktif.
- Klik **Ambil Data** untuk mengambil `get_one_order` + `get_order_income_components`.
- Klik **Kirim Data** untuk POST ke `/api/orders/import` (base URL + token diatur di Pengaturan).
- Klik **Lihat Data** untuk membuka viewer (ringkasan, sheet, JSON).

## Pengaturan

- Klik ikon **Pengaturan** di popup untuk membuka halaman options.
- Simpan Base URL + Bearer Token per marketplace (Shopee/TikTok).
- Marketplace aktif dideteksi otomatis dari URL tab; jika tidak terdeteksi, pakai default marketplace di pengaturan.

## Catatan

- Fetch berjalan di tab aktif dengan `credentials: include`, jadi cookie sesi Shopee ikut terkirim.
- Endpoint bawaan Shopee:
  - `https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components`
  - `https://seller.shopee.co.id/api/v3/order/get_one_order`

## Output viewer

- Ringkasan berbasis `get_one_order` (Order SN ditampilkan paling besar).
- **Order Items (Sheet)** dan **Income Breakdown (Sheet)** disembunyikan default; bisa ditampilkan.
- JSON income/order disembunyikan default; bisa ditampilkan dan diunduh.

## Struktur singkat

- `manifest.json`: konfigurasi MV3 + permissions.
- `src/popup/`: UI popup minimal (ambil/kirim + status).
- `src/viewer/`: viewer untuk ringkasan, sheet, dan JSON.
- `src/options/`: halaman pengaturan per marketplace.
- `examples/shopee/`: contoh payload dan hasil respons.
