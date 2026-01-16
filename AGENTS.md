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

## Ringkasan proyek

Ekstensi Chrome MV3 untuk `seller.shopee.co.id` yang mengambil:
- Income breakdown (POST `get_order_income_components`).
- Order detail (GET `get_one_order`).

Data diambil dengan menjalankan `fetch` di tab aktif agar cookie sesi ikut (`credentials: include`).

## Struktur file utama

- `manifest.json`: konfigurasi MV3, permissions, dan branding.
- `src/popup/`: UI popup minimal (ambil/kirim + status + error copy).
- `src/viewer/`: viewer untuk ringkasan, sheet, dan JSON (toggle + download JSON).
- `src/options/`: halaman pengaturan Base URL + token per marketplace.
- `examples/shopee/`: contoh payload dan hasil respons.

## Alur data (ringkas)

1. User klik **Ambil Data** di popup.
2. `src/popup/popup.js` menjalankan `pageFetcher` via `chrome.scripting.executeScript` di tab aktif.
3. `pageFetcher`:
   - Ambil cookie `SPC_CDS` dan `SPC_CDS_VER` (fallback `2`).
   - Bangun URL income (POST) dan order (GET).
   - Kirim income payload (default `{ order_id, components }`).
   - Ambil order detail dengan `order_id` dari URL tab.
4. Hasil income + order disimpan ke `chrome.storage.local` dengan key `viewerPayload`.
5. `src/viewer/viewer.js` membaca `viewerPayload` dan menampilkan ringkasan, sheet, dan JSON.

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
