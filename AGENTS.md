# AGENTS

Panduan untuk AI yang bekerja di repo ini. Wajib dibaca sebelum mengubah apa pun.

## Aturan wajib

- Selalu perbarui `AGENTS.md` setiap kali ada keputusan baru (perubahan arsitektur, endpoint, alur UI, atau format data). Tambahkan entri di "Decision Log" dan perbarui "Last Updated".
- Jika sebuah fitur/bug/update selesai, ingatkan user untuk melakukan `git push`.
- Jaga perubahan tetap minimal dan jelas; hindari refactor besar jika tidak diminta.
- Gunakan ASCII sebagai default; pakai Unicode hanya jika file sudah menggunakannya.
- Tambahkan komentar singkat hanya bila diperlukan untuk blok kode yang tidak jelas.

## Last Updated

- 2025-01-13: AGENTS.md dibuat sebagai panduan dasar.
- 2025-01-13: Menambahkan fitur export JSON ke API dengan base URL + token.
- 2025-01-13: Default base URL export diset ke https://powermaxx.test dan token ditampilkan (input text).
- 2025-01-13: Format payload export diubah ke shopee_get_one_order_json + shopee_get_order_income_components_json.
- 2025-01-16: Menambahkan halaman pengaturan (options page) dengan konfigurasi per marketplace dan auto-detect dari URL tab.
- 2025-01-16: Pengaturan dihapus dari popup; sheet dipindah hanya ke viewer; ringkasan/JSON default tersembunyi.
- 2025-01-16: Popup disederhanakan: hanya ambil data, kirim data, buka pengaturan, buka viewer, dan download JSON.
- 2025-01-16: Download JSON dipindah ke halaman viewer; popup hanya tombol ambil/kirim + status.
- 2025-01-16: Popup dibuat sangat minimal dengan status animasi dan error box yang bisa dicopy.
- 2025-01-16: Viewer menampilkan ringkasan berbasis get_one_order dan JSON default tersembunyi.
- 2025-01-16: Viewer mengutamakan Order Items dan kedua sheet disembunyikan default (bisa ditampilkan).
- 2025-01-16: Rebrand nama ekstensi menjadi Powermaxx Order Scraper.
- 2025-01-17: Rapikan struktur folder ke `src/` dan `examples/`.
- 2025-01-17: Menambahkan download AWB Shopee (get_package -> create_sd_jobs -> download_sd_job) dan pengaturannya.
- 2025-01-17: Format nama file AWB: YYYYMMDD-HHmm_SHOPEE_{order_sn}.pdf (waktu lokal).
- 2025-01-17: Menambahkan tombol Ambil + Kirim untuk fetch dan export sekaligus.
- 2025-01-17: Autentikasi token global via /api/login + tampil profil di options.
- 2025-01-17: Login token dipindah ke popup; options fokus ke pengaturan marketplace.
- 2025-01-17: Popup pakai layar login terpisah dan tampilan utama muncul setelah login (Base URL tetap di Pengaturan).
- 2025-01-17: Refresh UI popup ke gaya app standar dark (login view + main view lebih rapi).
- 2025-01-17: Popup dibuat lebih minimal dengan aksi utama saja + detail aksi lainnya (status UX ditingkatkan).
- 2025-01-17: Download AWB dijadikan aksi utama di popup dan token API disembunyikan.
- 2025-01-17: Aksi utama popup sekarang Ambil + Kirim; Download AWB pindah ke aksi sekunder.
- 2025-01-17: Info session disederhanakan; logout dipindah ke menu profil.
- 2025-01-17: UI halaman pengaturan dirapikan dengan card center dan layout lebih fokus.
- 2025-01-17: Panel status/notifikasi dipindah ke bagian paling atas popup.
- 2025-01-25: Menambahkan dukungan TikTok Shop (order get + statement) dan deteksi domain seller-id.tokopedia.com.
- 2026-01-24: Menambahkan detail error popup (status, URL, body) untuk fetch/export/AWB.
- 2026-01-24: TikTok pakai URL XHR terbaru dari performance entries + validasi app code/message.
- 2026-01-24: TikTok statement fallback merge query param + default pagination; error box jadi scroll.
- 2026-01-24: TikTok menambah statement transaction detail untuk fee per order + viewer Income Detail JSON.
- 2026-01-24: TikTok detail fallback buang signature & tambah hint jika invalid params.
- 2026-01-24: Viewer menambah panel TikTok Detail (modul order & income) untuk inspeksi cepat.
- 2026-01-24: TikTok Detail dipisah per endpoint di viewer.
- 2026-01-24: TikTok Detail menampilkan raw response per endpoint.
- 2026-01-25: Menambahkan tombol Update Income untuk refresh income saja dan kirim ulang ke API.
- 2026-01-25: TikTok detail yang belum tersedia ditandai warning (bukan error) dan fetch tetap dianggap sukses.
- 2026-01-25: Keyword marketplace diubah dari tiktok ke tiktok_shop (settings + payload).
- 2026-01-25: Payload TikTok Shop diringkas jadi 2 field (order + statement gabungan).

## Ringkasan proyek

Ekstensi Chrome MV3 untuk `seller.shopee.co.id` yang mengambil:
- Income breakdown (POST `get_order_income_components`).
- Order detail (GET `get_one_order`).
- AWB/label pengiriman (GET `get_package` -> POST `create_sd_jobs` -> GET `download_sd_job`).
- TikTok Shop: order detail (POST `fulfillment/order/get`) dan statement (GET `pay/statement/order/list`).
- Login token global via `/api/login` untuk export API.

Data diambil dengan menjalankan `fetch` di tab aktif agar cookie sesi ikut (`credentials: include`).

## Struktur file utama

- `manifest.json`: konfigurasi MV3, permissions, dan branding.
- `src/popup/`: UI popup (login view -> main view, ambil/kirim, status, dan error copy).
- `src/viewer/`: viewer untuk ringkasan, sheet, dan JSON (toggle + download JSON).
- `src/options/`: halaman pengaturan Base URL + endpoint per marketplace.
- `examples/shopee/`: contoh payload dan hasil respons.

## Alur data (ringkas)

1. User login di popup (token global via `/api/login`).
2. User klik **Ambil Data** di popup.
3. `src/popup/popup.js` menjalankan `pageFetcher` via `chrome.scripting.executeScript` di tab aktif.
4. `pageFetcher`:
   - Ambil cookie `SPC_CDS` dan `SPC_CDS_VER` (fallback `2`).
   - Bangun URL income (POST) dan order (GET).
   - Kirim income payload (default `{ order_id, components }`).
   - Ambil order detail dengan `order_id` dari URL tab.
5. Hasil income + order disimpan ke `chrome.storage.local` dengan key `viewerPayload`.
6. `src/viewer/viewer.js` membaca `viewerPayload` dan menampilkan ringkasan, sheet, dan JSON.

Alur AWB (ringkas):

1. User klik **Download AWB** di popup.
2. `pageFetcherAwb` memanggil `get_one_order` untuk `shop_id`, lalu `get_package`.
3. Buat job via `create_sd_jobs` dan unduh PDF via `download_sd_job` (fallback buka `awbprint`).

## Autentikasi Shopee

- Gunakan `fetch(..., { credentials: "include" })` di tab aktif `seller.shopee.co.id`.
- Parameter penting:
  - `SPC_CDS` dan `SPC_CDS_VER` (ambil dari cookie; fallback `SPC_CDS_VER=2`).
- Jika endpoint butuh CSRF, gunakan cookie `csrftoken` ke header `x-csrftoken`.
- Jangan hardcode cookie statis; selalu ambil dari tab aktif.

## Format output

- Viewer menampilkan ringkasan: order_sn (utama), order_id, waktu dibuat, status, total harga.
- JSON raw (income/order) default tersembunyi, bisa ditampilkan dan diunduh.
- Sheet output (TSV) default tersembunyi:
  - Income: `buildIncomeSheet` menghasilkan format long (breakdown + sub_breakdown + ext_info).
  - Order: `buildOrderSheet` berisi item per baris.

## Panduan perubahan kode

- Jika menambah endpoint baru:
  - Tambahkan konfigurasi di `src/options/` bila perlu.
  - Update logic di `pageFetcher` dan hasil render di viewer.
  - Update README + `examples/`.
  - Tambahkan entri di Decision Log.
- Jika mengubah UI/tema:
  - Jaga konsistensi warna, spacing, dan tombol.
  - Hindari layout sempit; gunakan panel terpisah seperti sekarang.

## Checklist selesai perubahan

- UI masih rapi dan ringan.
- Fetch tidak hardcode cookie.
- Download AWB Shopee berjalan (get_package -> create_sd_jobs -> download_sd_job).
- Viewer bisa menampilkan ringkasan + JSON + sheet.
- README sudah diperbarui jika ada perubahan alur/endpoint.
- Decision Log diperbarui.
- Ingatkan user untuk `git push`.

## Decision Log

- 2025-01-13: Membuat AGENTS.md dan menetapkan aturan update keputusan.
- 2025-01-13: Menambahkan panel export API (POST `/api/orders/import`) dengan autentikasi Bearer.
- 2025-01-13: Default base URL export ditetapkan ke https://powermaxx.test dan token tidak disembunyikan.
- 2025-01-13: Payload export diganti sesuai format baru (dua field JSON Shopee).
- 2025-01-16: Menambahkan options page untuk konfigurasi Shopee/TikTok dan auto-detect marketplace.
- 2025-01-16: Menghapus pengaturan dari popup dan menyederhanakan tampilan.
- 2025-01-16: Menyembunyikan sheet di viewer secara default dan mengutamakan Order Items.
- 2025-01-16: Rebrand ke Powermaxx Order Scraper.
- 2025-01-17: Menata ulang struktur ke `src/` dan `examples/`.
- 2025-01-17: Menambahkan alur download AWB Shopee + pengaturan endpoint/file.
- 2025-01-17: Menetapkan format nama file AWB dengan tanggal + Order SN.
- 2025-01-17: Menambahkan tombol Ambil + Kirim di popup.
- 2025-01-17: Menambahkan login token global + profil di options.
- 2025-01-17: Memindahkan login token ke popup dan menyederhanakan options.
- 2025-01-17: Popup menampilkan layar login terlebih dahulu, lalu main view setelah login; Base URL tetap di pengaturan.
- 2025-01-17: UI popup dirapikan dengan layout standar app dark tanpa mengubah alur login.
- 2025-01-17: UI popup disederhanakan (aksi utama + detail) dan status/error dibuat lebih informatif.
- 2025-01-17: Aksi utama popup diganti ke Download AWB; input token API tidak ditampilkan.
- 2025-01-17: Aksi utama popup diubah ke Ambil + Kirim; Download AWB jadi aksi sekunder.
- 2025-01-17: UI popup menyembunyikan teks status login/refresh; logout diakses lewat klik profil.
- 2025-01-17: Halaman pengaturan dipusatkan dalam card untuk UX lebih rapi.
- 2025-01-17: Status/notifikasi popup diposisikan di atas agar lebih terlihat.
- 2025-01-25: TikTok Shop gunakan /api/fulfillment/order/get + /api/v1/pay/statement/order/list; summary di viewer menyesuaikan struktur TikTok.
- 2026-01-24: Detail error popup ditingkatkan (status, URL, body) untuk debug.
- 2026-01-24: TikTok auto-pakai URL XHR terbaru dan cek code/message untuk error.
- 2026-01-24: TikTok statement copy query param dari order + default pagination; UI error bisa scroll.
- 2026-01-24: TikTok fetch statement transaction detail (per order) + simpan Income Detail JSON.
- 2026-01-24: Fallback detail TikTok hapus X-Bogus/X-Gnarly + hint bila invalid params.
- 2026-01-24: Viewer tampilkan modul TikTok (trade_order_module, price_module, sku_records, dsb).
- 2026-01-24: Viewer TikTok dipecah per endpoint untuk kejelasan.
- 2026-01-24: Viewer TikTok menampilkan raw response per endpoint.
- 2026-01-25: Menambahkan tombol Update Income (income-only) di popup dan kirim ulang ke API.
- 2026-01-25: TikTok detail missing dianggap warning agar tetap bisa lanjut (success).
- 2026-01-25: Rename keyword marketplace tiktok -> tiktok_shop untuk settings dan payload export.
- 2026-01-25: Payload TikTok Shop digabung jadi 2 field sesuai kebutuhan DB.
