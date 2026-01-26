# AGENTS.md

## 0) Tujuan Utama

Repo ini untuk: ekstensi Chrome yang mengambil data order/income dari Shopee dan TikTok Shop lalu mengirim ke API Powermaxx.

Target kamu sebagai agent:

- Implement fitur / fix bug / refactor yang relevan
- Hasil rapi, mudah dipahami, dan gampang diverifikasi
- Setiap keputusan yang sudah dikonfirmasi user wajib dicatat di file ini

## 1) Konteks Cepat (biar kamu bisa mulai kerja tanpa baca semua code)

Produk ini dipakai untuk: tim internal Powermaxx (ops/packing) agar data order & income dari marketplace bisa dikirim ke API Powermaxx.  
Jenis aplikasi: Tool (Chrome Extension MV3)

Output yang dianggap “beres”:

- Aksi ambil data sukses, export ke API sukses, dan tidak ada error runtime yang terlihat
- Download AWB berjalan dan file tersimpan sesuai format nama
- Viewer menampilkan ringkasan + JSON sesuai data yang diambil

## 2) Cara Menjalankan & Verifikasi (WAJIB)

Kalau command repo belum jelas, kamu wajib cari dari sumber yang ada di repo, contoh:

- `README.md`
- `package.json` bagian `scripts`
- `composer.json` bagian `scripts`
- `Makefile`
- folder `scripts/`
- konfigurasi CI (kalau ada)

Aturan verifikasi minimal sebelum bilang selesai:

- Fitur berjalan sesuai requirement
- Gak ada error runtime yang jelas kelihatan
- Kalau repo punya test atau quality check, jalankan yang relevan

Catatan repo ini:

- Tidak ada script otomatis untuk run/test.
- Verifikasi dilakukan manual via Chrome (Load unpacked).

## 3) Aturan README.md (wajib dijaga tetap akurat)

- README.md harus selalu menjelaskan cara menjalankan project dan cara verifikasi paling sederhana.
- Kalau perubahan yang kamu buat mempengaruhi salah satu hal di bawah ini, kamu wajib update README.md juga:
  - Cara install / setup
  - Command run/dev/test/build
  - Konfigurasi environment (.env / config)
  - Fitur utama / alur penggunaan (kalau berubah signifikan)
  - Requirement versi (runtime/framework) kalau ada
  - Troubleshooting umum (kalau bug tertentu sering kejadian)
- Jangan bikin README kepanjangan. Fokus ke “cara pakai yang benar” dan poin penting yang sering bikin orang nyangkut.

## 4) Aturan Dependency & Versi Package (WAJIB)

- Kalau kamu butuh package/library baru dan package itu belum ada di project:
  - Gunakan versi terbaru yang masih kompatibel dengan project ini (runtime + framework + environment).
- Kalau package/library itu sudah ada di project:
  - Gunakan versi yang sudah dipakai project saat ini sebagai acuan penulisan code (API/fiturnya menyesuaikan versi yang ada).
- Jangan memaksakan fitur yang hanya ada di versi lebih baru kalau project masih memakai versi lama.
- Kalau ada pilihan upgrade versi demi fitur tertentu:
  - Ajukan sebagai opsi dan tunggu persetujuan user sebelum melakukan upgrade.

## 5) Aturan Kerja (wajib diikuti)

- Utamakan solusi paling kecil yang menyelesaikan masalah.
- Kalau ada solusi lain yang lebih effort tapi lebih worth it (lebih rapi, lebih scalable, lebih aman jangka panjang), kamu boleh mengusulkan sebagai opsi.
- Jangan jalankan solusi yang lebih besar tanpa persetujuan user.
- Saat mengusulkan opsi, jelaskan singkat:
  - Benefit utamanya
  - Konsekuensi/risikonya
  - Effort kira-kira (kecil/sedang/besar)
- Kalau ada opsi A vs B, kasih rekomendasi + alasannya, lalu tunggu persetujuan user.

Aturan umum lainnya:

- Hindari refactor besar kalau tidak diminta.
- Kalau butuh asumsi, tulis asumsinya dengan jelas.
- Kalau behavior berubah, tambahkan test atau jelaskan kenapa belum ada.
- Jangan simpan secrets di code/dokumentasi/log (API key, token, credential).

Aturan dokumentasi:

- Setiap kali user bilang “oke/sesuai/sip/lanjut/gas”, anggap keputusan itu FINAL.
- Keputusan FINAL wajib ditulis di bagian **Keputusan yang Sudah Dikunci**.
- Kalau ada perubahan cara kerja fitur, tambahkan ringkasan di **Catatan Perilaku Sistem**.

## 6) Standar Penulisan Code (umum)

- Ikuti style yang sudah dominan di repo (jangan bikin gaya baru).
- Naming konsisten, gampang dibaca.
- Error message jelas dan bisa ditindaklanjuti.
- Hindari duplikasi logic tanpa alasan yang kuat.
- Perubahan harus mudah direview (hindari file berubah terlalu banyak tanpa kebutuhan).

## 7) Aturan “Ikut Beresin Dampaknya” (penting)

Setiap perubahan code biasanya punya efek samping.  
Kamu wajib cek dan perbarui bagian lain yang perlu ikut berubah, misalnya:

- Test yang relevan
- Dokumentasi behavior / endpoint / flow (termasuk README.md kalau terdampak)
- Konfigurasi / env example
- Validasi dan error message
- Tempat lain yang mengandalkan kontrak data yang sama (payload/response/schema)
- Tipe data / mapping / serializer / transformer
- Query / indexing / performa (kalau terdampak)

Kalau perubahan itu sensitif atau berisiko, minta konfirmasi dulu sebelum lanjut.

Contoh hal sensitif/berisiko (umum):

- Migrasi database atau perubahan schema besar
- Perubahan kontrak API yang bisa bikin integrasi rusak
- Perubahan autentikasi/otorisasi
- Refactor besar yang mengubah banyak file sekaligus
- Perubahan yang berpotensi menyebabkan data loss / overwrite

Kalau kamu minta konfirmasi, jelaskan:

- Resikonya apa
- Dampaknya apa
- Opsi aman yang lebih kecil (kalau ada)

## 8) Definition of Done (DoD)

Task dianggap selesai kalau:

- Requirement sudah terpenuhi
- Perubahan code rapi dan aman
- Cara verifikasi jelas
- Dokumentasi di file ini sudah ter-update kalau ada keputusan/behavior baru
- Kamu menyarankan langkah commit & push dengan commit message yang kamu rekomendasikan
- Kamu memberi saran aksi/perubahan berikutnya (kalau memang relevan)

## 9) Format Jawaban Saat Selesai (WAJIB)

Setiap kamu selesai mengerjakan task, jawab pakai format ini:

### Ringkasan

- Apa yang diubah
- Kenapa diubah

### File yang berubah

- `path/to/file` — ringkas perubahan

### Cara cek (verify)

- Langkah & command yang relevan

### Dokumentasi yang di-update

- Bagian mana yang kamu perbarui + poinnya (termasuk README.md kalau terdampak)

### Next step (commit & push)

Sarankan user:

1. `git status`
2. Commit dengan message yang kamu rekomendasikan (user tinggal setujui)
3. Push ke branch

Commit message harus kamu buat berdasarkan perubahan yang kamu lakukan.  
Format yang disarankan:

- `fix: ...`
- `feat: ...`
- `refactor: ...`
- `test: ...`
- `docs: ...`

### Saran aksi/perubahan berikutnya (wajib diisi)

Berikan 2–5 poin yang masuk akal untuk langkah lanjutan, misalnya:

- Tambah test coverage di area tertentu
- Rapihin error handling
- Refactor kecil untuk nyederhanain logic
- Optimasi performa
- Rapihin dokumentasi di bagian yang sering bikin bingung

Catatan:

- Saran ini jangan dipaksain kalau memang gak perlu.
- Prioritaskan yang paling berdampak dan effort-nya kecil.

## 10) Keputusan yang Sudah Dikunci (update setiap ada konfirmasi)

Format:

- [YYYY-MM-DD] Keputusan — alasan singkat — dampak

Daftar:

- [2025-01-16] Nama ekstensi "Powermaxx Order Scraper" — branding produk — nama ditampilkan di manifest dan UI.
- [2025-01-17] Token global via `/api/login` — mudah dipakai lintas aksi — token dipakai untuk export API.
- [2025-01-17] Popup tampil login dahulu lalu main view — UX standar — Base URL tetap di pengaturan.
- [2026-01-25] Keyword marketplace TikTok adalah `tiktok_shop` — konsistensi payload — backend menerima format ini.
- [2026-01-25] Payload TikTok Shop hanya 2 field — sesuai kebutuhan DB — `tiktok_shop_fulfillment_order_get_json` dan `tiktok_shop_statement_json`.
- [2026-01-25] Format nama file AWB pakai detik — konsistensi file — `YYYYMMDD-HHmmss_SHOPEE_{order_sn}.pdf` dan `YYYYMMDD-HHmmss_TIKTOKSHOP_{main_order_id}.pdf`.
- [2026-01-25] Aksi utama popup Ambil + Kirim + AWB — workflow utama — aksi lain di dropdown.
- [2026-01-25] Bulk Auto: coba Shopee dulu, fallback TikTok Shop — input order SN campuran — mapping Shopee via search endpoint.
- [2026-01-26] Bulk punya mode Ambil+Kirim atau Ambil+Kirim+AWB — fleksibilitas — AWB bisa dilewati.
- [2026-01-26] Log bulk menampilkan detail langkah + endpoint + timing — troubleshooting — error lebih mudah dipahami.

## 11) Catatan Perilaku Sistem (biar agent cepat paham tanpa baca semua code)

Isi yang cocok ditaruh di sini:

- Aturan validasi penting
- Format response/error yang harus konsisten
- Alur status/workflow utama
- Edge case yang sering kejadian
- Aturan format tanggal/timezone/angka (kalau ada)

Daftar:

- Fetch marketplace dilakukan di tab seller aktif dengan `credentials: include`.
- Shopee butuh cookie `SPC_CDS` dan `SPC_CDS_VER` untuk request income/order.
- TikTok order memakai `order_no` di URL; statement detail bisa tidak tersedia dan dianggap warning.
- Export API memakai `POST /api/orders/import` dengan Bearer token dari `/api/login`.
- Request export menambahkan `Accept: application/json` agar error backend tidak HTML.
- Bulk Auto melakukan pencarian order SN di Shopee, jika tidak ketemu lanjut TikTok Shop.
- Bulk log menyimpan detail langkah (fetch/export/AWB) termasuk endpoint dan timing.
- Format nama file AWB mengikuti waktu lokal dengan detik.
