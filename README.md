# Arva Shopee Order Fetcher

Ekstensi Chrome (Manifest V3) untuk menarik data komponen pendapatan dan detail pesanan Shopee seller.

Developer: Ardiansah / Arva.

## Cara pasang
- Buka `chrome://extensions`, aktifkan **Developer mode**.
- Klik **Load unpacked** dan pilih folder ini.
- Pin ekstensi agar mudah dibuka.

## Cara pakai
- Buka tab `seller.shopee.co.id` (sudah login) dan biarkan sebagai tab aktif, idealnya di halaman detail pesanan (`.../portal/sale/order/<order_id>`).
- Panel Income (get_order_income_components): endpoint & payload bisa dibiarkan default (payload kosong = `{ order_id: <auto>, components: [2,3,4,5] }`). Jika diisi, payload dikirim persis seperti JSON dari DevTools.
- Panel Order (get_one_order): endpoint GET, order_id otomatis dari URL tab (bisa diubah).
- Klik **Ambil Data**. Income (POST) dan Order (GET) berjalan di tab aktif dengan `credentials: include`.
- Hasil terpisah: Ringkasan + breakdown, Income JSON (copy/download), Order JSON (copy/download). Semua bagian bisa di-collapse.

## Catatan
- Permintaan dikirim dengan `credentials: include`, jadi cookie sesi Anda ikut terkirim selama domain Shopee diizinkan di host permissions.
- Endpoint bawaan:  
  `https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components` (SPC_CDS & SPC_CDS_VER ditambahkan otomatis dari cookie/tab aktif).  
  `https://seller.shopee.co.id/api/v3/order/get_one_order` untuk detail order.

## Struktur singkat
- `popup.html`, `popup.css`, `popup.js`: UI popup Arva.
- `manifest.json`: konfigurasi MV3 + permissions.
- `data-contoh/`: contoh fetch dan hasil respon untuk acuan payload/format.
