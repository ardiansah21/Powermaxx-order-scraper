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
- Panel Export API: isi Base URL + Bearer Token, lalu klik **Kirim ke API** untuk POST ke `/api/orders/import` dengan payload:
  - `marketplace: "shopee"`
  - `shopee_get_one_order_json: <full response get_one_order>`
  - `shopee_get_order_income_components_json: <full response get_order_income_components>`
- Klik **Ambil Data**. Income (POST) dan Order (GET) berjalan di tab aktif dengan `credentials: include`.
- Hasil terpisah: Ringkasan + breakdown, Order Items (Sheet), Income Breakdown (Sheet), Income JSON (copy/download), Order JSON (copy/download). Semua bagian bisa di-collapse.
- Tombol **Buka di Tab** membuka viewer halaman penuh untuk melihat data yang panjang dengan lebih nyaman.

## Pengaturan

- Buka halaman **Pengaturan** dari tombol **Buka Pengaturan** di popup.
- Simpan Base URL + Bearer Token per marketplace (Shopee/TikTok).
- Marketplace aktif dideteksi otomatis dari URL tab; jika tidak terdeteksi, pakai default marketplace di pengaturan.

## Catatan

- Permintaan dikirim dengan `credentials: include`, jadi cookie sesi Anda ikut terkirim selama domain Shopee diizinkan di host permissions.
- Endpoint bawaan:
  - `https://seller.shopee.co.id/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components` (SPC_CDS & SPC_CDS_VER ditambahkan otomatis dari cookie/tab aktif).
  - `https://seller.shopee.co.id/api/v3/order/get_one_order` untuk detail order.

## Output sheet (popup)

- **Order Items (Sheet)**: output TSV siap tempel; header tampil di tabel, tombol **Copy Data** menyalin data tanpa header.
- **Income Breakdown (Sheet)**: format long (kolom tetap, aman untuk lookup). Kolom:
  - `order_id`, `order_sn`
  - `level`: `breakdown`, `sub_breakdown`, atau `service_fee_infos`
  - `parent_field_name`: nama parent (mis. `FEES_AND_CHARGES` atau `SERVICE_FEE`)
  - `field_name`, `display_name`, `amount`
- `amount` sudah dikonversi ke angka rupiah (dibagi 100000, tanpa simbol). Nilai negatif tetap memakai tanda `-`.
- Jika `sub_breakdown.ext_info.seller_voucher_codes` berisi beberapa kode, `display_name` akan digabung dengan koma (contoh: `Voucher Toko yang ditanggung Penjual - POWE15K11, POWE20K11`).

## Struktur singkat

- `popup.html`, `popup.css`, `popup.js`: UI popup Arva.
- `manifest.json`: konfigurasi MV3 + permissions.
- `data-contoh/`: contoh fetch dan hasil respon untuk acuan payload/format.
