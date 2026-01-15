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

## Ringkasan proyek

Ekstensi Chrome MV3 untuk `seller.shopee.co.id` yang mengambil:
- Income breakdown (POST `get_order_income_components`).
- Order detail (GET `get_one_order`).

Data diambil dengan menjalankan `fetch` di tab aktif agar cookie sesi ikut (`credentials: include`).

## Struktur file utama

- `manifest.json`: konfigurasi MV3, permissions, dan branding.
- `popup.html`: UI utama (input endpoint/payload, tombol fetch, ringkasan, JSON raw, sheet output, toggle).
- `popup.css`: tema Arva (warna gelap lembut) dan layout komponen.
- `popup.js`: logic fetch, parsing, rendering, sheet builder, dan storage untuk viewer.
- `viewer.html` / `viewer.css` / `viewer.js`: halaman viewer untuk tabel sheet + JSON; sumber data dari `chrome.storage.local`.
- `data-contoh/`: contoh payload dan hasil respons untuk referensi.

## Alur data (ringkas)

1. User klik **Ambil Data** di popup.
2. `popup.js` menjalankan `pageFetcher` via `chrome.scripting.executeScript` di tab aktif.
3. `pageFetcher`:
   - Ambil cookie `SPC_CDS` dan `SPC_CDS_VER` (fallback `2`).
   - Bangun URL income (POST) dan order (GET).
   - Kirim income payload (default `{ order_id, components }` atau payload custom dari UI).
   - Ambil order detail dengan `order_id` dari URL tab atau payload.
4. Hasil income + order:
   - Dirender ke ringkasan dan breakdown.
   - Diubah ke format sheet (TSV) untuk tempel ke spreadsheet.
   - Disimpan ke `chrome.storage.local` dengan key `viewerPayload`.
5. `viewer.html` membaca `viewerPayload` dan menampilkan tabel + JSON raw.

## Autentikasi Shopee

- Gunakan `fetch(..., { credentials: "include" })` di tab aktif `seller.shopee.co.id`.
- Parameter penting:
  - `SPC_CDS` dan `SPC_CDS_VER` (ambil dari cookie; fallback `SPC_CDS_VER=2`).
- Jika endpoint butuh CSRF, gunakan cookie `csrftoken` ke header `x-csrftoken`.
- Jangan hardcode cookie statis; selalu ambil dari tab aktif.

## Format output

- Ringkasan menampilkan: order_id, order_sn, waktu dibuat (utama dari `get_one_order`), status, estimasi penghasilan.
- Income breakdown + buyer breakdown dirender sebagai kartu.
- JSON raw dipisahkan (Income JSON dan Order JSON) dengan tombol copy/download masing-masing.
- Sheet output (TSV):
  - Income: `buildIncomeSheet` menghasilkan format long (breakdown + sub_breakdown + service_fee_infos).
  - Order: `buildOrderSheet` berisi item per baris.

## Panduan perubahan kode

- Jika menambah endpoint baru:
  - Tambahkan input endpoint/payload di UI bila perlu.
  - Update logic di `pageFetcher` dan hasil render.
  - Update README + `data-contoh/`.
  - Tambahkan entri di Decision Log.
- Jika mengubah UI/tema:
  - Jaga konsistensi warna, spacing, dan tombol.
  - Hindari layout sempit; gunakan panel terpisah seperti sekarang.

## Checklist selesai perubahan

- UI masih rapi dan dapat di-collapse.
- Fetch tidak hardcode cookie.
- JSON raw + sheet output masih bisa di-copy/download.
- README sudah diperbarui jika ada perubahan alur/endpoint.
- Decision Log diperbarui.
- Ingatkan user untuk `git push`.

## Decision Log

- 2025-01-13: Membuat AGENTS.md dan menetapkan aturan update keputusan.
- 2025-01-13: Menambahkan panel export API (POST `/api/orders/import`) dengan autentikasi Bearer.
- 2025-01-13: Default base URL export ditetapkan ke https://powermaxx.test dan token tidak disembunyikan.
