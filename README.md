# Powermaxx Order Scraper

Ekstensi Chrome (Manifest V3) untuk mengambil data order/income dari Shopee & TikTok Shop lalu mengirim ke API Powermaxx.

Developer: Ardiansah / Arva.

## Cara pasang

Opsi A (untuk developer):

- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder repo ini.
- Pin ekstensi agar mudah dibuka.

Opsi B (untuk tim internal via GitHub Releases / ZIP):

- Download file ZIP release dari GitHub Releases repo ini (contoh: `powermaxx-order-scraper.zip`).
- Extract ZIP ke folder yang lokasinya stabil (jangan pindah-pindah) agar setting extension tidak hilang.
- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder hasil extract (folder yang berisi `manifest.json`).

Update (untuk Opsi B):

- Download ZIP versi terbaru, extract, lalu replace isi folder lama (gunakan path folder yang sama).
- Buka `chrome://extensions` lalu klik **Reload** pada extension.

## Alur cepat (non-teknis)

1. Buka tab `seller.shopee.co.id` atau `seller-id.tokopedia.com`, pastikan sudah login.
2. Buka popup extension, login dengan akun Powermaxx (Base URL diambil dari Pengaturan).
3. Pilih aksi utama: **Ambil + Kirim + AWB**, **Ambil + Kirim**, atau **Update Income**.
4. Untuk banyak order, buka halaman **Bulk** (ikon ☰) lalu jalankan.

## Alur utama

### Manual via popup

- Aksi utama ada di popup: **Ambil + Kirim + AWB**, **Ambil + Kirim**, **Update Income**.
- Aksi tambahan ada di menu **Aksi lainnya** (Ambil Data, Kirim Data, Download AWB, Lihat Data).
- TikTok Shop memakai `order_no` di URL order detail.

### Bulk (halaman Bulk)

- Buka Bulk dari popup (ikon ☰).
- Pilih mode: **Ambil + Kirim + AWB**, **Ambil + Kirim**, **Update Income**, atau **Update Order**.
- Tempel daftar order (1 per baris), lalu **Mulai**.
- Mode **Auto**: coba Shopee dulu, jika tidak ketemu lanjut TikTok Shop.

### Bridge dari Web Powermaxx

- Mode `single` menjalankan proses langsung tanpa halaman bulk (tetap membuka tab order marketplace).
- Mode `bulk` membuka halaman Bulk dan auto-run.
- Payload bridge:
  - `source: "powermaxx"`
  - `action: "update_order" | "update_income" | "update_both"`
  - `mode: "single" | "bulk"`
  - `orders`: array item `{ id, marketplace, id_type }`
- Shopee pakai `mp_order_id` dengan `id_type: "mp_order_id"` (tanpa search tab).
- TikTok Shop pakai `order_sn` dengan `marketplace: "tiktok_shop"`.
- `update_both` artinya update order + income.

Contoh payload:
```js
window.postMessage({
  source: "powermaxx",
  action: "update_both",
  mode: "bulk",
  orders: [
    { id: "1234567890", marketplace: "shopee", id_type: "mp_order_id" },
    { id: "7100112233", marketplace: "tiktok_shop", id_type: "order_sn" }
  ]
}, "*");
```

## Pengaturan

- Base URL API dipakai untuk login & export semua marketplace.
- Endpoint TikTok: Order, Statement, Statement Detail, dan AWB `shipping_doc/generate`.
- Endpoint Shopee: order, income, dan AWB (get_package, create_sd_jobs, download_sd_job).
- Marketplace aktif dideteksi dari URL tab; jika tidak terdeteksi, pakai default marketplace.

## Troubleshooting singkat

- **Token belum ada** → login ulang di popup.
- **URL bukan Shopee/TikTok** → pastikan tab seller aktif & sudah login marketplace.
- **Izin host belum diberikan** → buka popup/pengaturan lalu izinkan host sesuai Base URL.
- **Export gagal** → cek Base URL + koneksi jaringan.

## Catatan teknis ringkas

- Fetch marketplace berjalan di tab seller aktif dengan `credentials: include`.
- Export API memakai `POST /api/orders/import` dengan Bearer token.
- AWB butuh tab order detail (Shopee `/order/<order_id>`, TikTok detail order).

## Struktur singkat

- `manifest.json`: konfigurasi MV3 + permissions.
- `src/popup/`: UI popup.
- `src/bulk/`: UI bulk.
- `src/viewer/`: viewer ringkasan & JSON.
- `src/options/`: halaman pengaturan.
