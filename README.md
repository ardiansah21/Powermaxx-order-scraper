# Powermaxx Order Scraper

Ekstensi Chrome (Manifest V3) untuk mengambil data order dan income marketplace (Shopee/TikTok Shop) lalu mengirim ke API Powermaxx.

Developer: Ardiansah / Arva.

## Cara pasang

- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder ini.
- Pin ekstensi agar mudah dibuka.

## Cara pakai

- Buka tab `seller.shopee.co.id` (Shopee) atau `seller-id.tokopedia.com` (TikTok Shop) dan biarkan sebagai tab aktif.
- Saat popup dibuka, tampil layar login (Base URL diambil dari Pengaturan).
- Login di popup menggunakan **/api/login** agar token global tersimpan.
- Aksi utama: **Ambil + Kirim + AWB**, **Ambil + Kirim**, dan **Update Income**.
- Jika income perlu diperbarui, gunakan **Update Income** (income-only) lalu otomatis kirim ulang ke API.
- Untuk TikTok Shop, order ID diambil dari query `order_no` di URL order detail.
- **Ambil + Kirim**, **Ambil Data**, **Kirim Data**, **Download AWB**, dan **Lihat Data** ada di menu **Aksi lainnya**.
- Ikon **Bulk** (☰) di header popup membuka halaman bulk dengan mode aksi: **Ambil + Kirim + AWB**, **Ambil + Kirim**, **Update Income**, atau **Update Order**.
- Web Powermaxx bisa memicu bulk lewat `window.postMessage` dengan action `update_order`, `update_income`, atau `update_both` dan daftar `order_sn` (extension akan buka bulk + auto-run).
- Domain Powermaxx tidak di-hardcode; izin host akan diminta saat login sesuai Base URL agar tombol web bisa memanggil extension.
- Bulk Auto: coba cari order SN di Shopee (search endpoint), jika tidak ditemukan maka diproses sebagai TikTok Shop.
- Logout ada di menu profil (klik kartu profil).

## Pengaturan

- Klik ikon **Pengaturan** di popup untuk membuka halaman options.
- Atur satu Base URL API untuk kebutuhan login/export semua marketplace.
- Untuk TikTok Shop, atur endpoint Order (`/api/fulfillment/order/get`), Statement (`/api/v1/pay/statement/order/list`), dan Statement Detail (`/api/v1/pay/statement/transaction/detail`).
- Untuk TikTok Shop, atur endpoint AWB `shipping_doc/generate` + file prefix label jika perlu.
- Atur endpoint AWB Shopee (get_package, create_sd_jobs, download_sd_job) + opsi file label.
- Marketplace aktif dideteksi otomatis dari URL tab; jika tidak terdeteksi, pakai default marketplace di pengaturan.

## Catatan

- Fetch berjalan di tab aktif dengan `credentials: include`, jadi cookie sesi Shopee ikut terkirim.
- Token API didapat dari `/api/login` di popup, disimpan di storage, dan dipakai di semua request export.
- Keyword marketplace untuk TikTok Shop di payload/export: `tiktok_shop`.
- Payload TikTok Shop hanya 2 field: `tiktok_shop_fulfillment_order_get_json` + `tiktok_shop_statement_json` (berisi order/list + transaction/detail).
- Download AWB membutuhkan tab order detail (URL mengandung `/order/<order_id>`).
- Download AWB TikTok memakai `shipping_doc/generate` lalu unduh dari `doc_url` (link bisa expired).
- Nama file AWB otomatis: `YYYYMMDD-HHmmss_SHOPEE_{order_sn}.pdf` (waktu lokal).
- Nama file AWB TikTok otomatis: `YYYYMMDD-HHmmss_TIKTOKSHOP_{main_order_id}.pdf` (waktu lokal).
- Endpoint bawaan Shopee:
  - `https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components`
  - `https://seller.shopee.co.id/api/v3/order/get_one_order`
  - `https://seller.shopee.co.id/api/v3/order/get_package`
  - `https://seller.shopee.co.id/api/v3/logistics/create_sd_jobs`
  - `https://seller.shopee.co.id/api/v3/logistics/download_sd_job`

- Endpoint bawaan TikTok Shop:
  - `https://seller-id.tokopedia.com/api/fulfillment/order/get`
  - `https://seller-id.tokopedia.com/api/v1/pay/statement/order/list`
  - `https://seller-id.tokopedia.com/api/v1/pay/statement/transaction/detail`
  - `https://seller-id.tokopedia.com/api/v1/fulfillment/shipping_doc/generate`

## Output viewer

- Ringkasan berbasis `get_one_order` (Order SN ditampilkan paling besar).
- **Order Items (Sheet)** dan **Income Breakdown (Sheet)** disembunyikan default; bisa ditampilkan.
- JSON income/order disembunyikan default; bisa ditampilkan dan diunduh.
- TikTok: JSON detail settlement tambahan ditampilkan sebagai Income Detail JSON.
- TikTok: panel "TikTok Detail" dipisah per endpoint (order/get, statement/order/list, transaction/detail) + raw response per endpoint.

## Struktur singkat

- `manifest.json`: konfigurasi MV3 + permissions.
- `src/popup/`: UI popup (login view -> main view, status di atas, aksi utama + menu aksi lainnya).
- `src/viewer/`: viewer untuk ringkasan, sheet, dan JSON.
- `src/options/`: halaman pengaturan per marketplace.
- `examples/shopee/`: contoh payload dan hasil respons.
