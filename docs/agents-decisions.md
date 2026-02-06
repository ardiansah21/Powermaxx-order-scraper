# Keputusan yang Sudah Dikunci

Indeks keputusan yang sudah disepakati. Jika ada keputusan besar yang butuh konteks panjang, buat file detail terpisah dan link-kan dari sini.

- [2025-01-16] Nama ekstensi "Powermaxx Order Scraper" — branding produk — nama ditampilkan di manifest dan UI.
- [2025-01-17] Token global via `/api/login` — mudah dipakai lintas aksi — token dipakai untuk export API.
- [2025-01-17] Popup tampil login dahulu lalu main view — UX standar — Base URL tetap di pengaturan.
- [2026-01-25] Keyword marketplace TikTok adalah `tiktok_shop` — konsistensi payload — backend menerima format ini.
- [2026-01-25] Payload TikTok Shop hanya 2 field — sesuai kebutuhan DB — `tiktok_shop_fulfillment_order_get_json` dan `tiktok_shop_statement_json`.
- [2026-01-25] Format nama file AWB pakai detik — konsistensi file — `YYYYMMDD-HHmmss_SHOPEE_{order_sn}.pdf` dan `YYYYMMDD-HHmmss_TIKTOKSHOP_{main_order_id}.pdf`.
- [2026-01-25] Aksi utama popup Ambil + Kirim + AWB — workflow utama — aksi lain di dropdown.
- [2026-01-25] Bulk Auto: coba Shopee dulu, fallback TikTok Shop — input order SN campuran — mapping Shopee via search endpoint.
- [2026-01-26] Bulk punya mode Ambil+Kirim atau Ambil+Kirim+AWB — fleksibilitas — AWB bisa dilewati.
- [2026-01-26] Bulk menambahkan mode Update Income — pembaruan income saja — AWB tidak dijalankan.
- [2026-01-26] Log bulk menampilkan detail langkah + endpoint + timing — troubleshooting — error lebih mudah dipahami.
- [2026-01-28] Pesan error TikTok memakai fallback payload — info lebih jelas — notifikasi dan log menampilkan pesan TikTok lengkap.
- [2026-01-28] Notifikasi error TikTok dipecah jadi judul + subjudul + deskripsi — UX lebih jelas — `status_msg_text` jadi subjudul, `status_msg_sop_text` jadi deskripsi.
- [2026-01-28] Format detail error bulk disamakan dengan popup — konsisten — pakai `summary/context/externalResponse/trace`.
- [2026-01-28] Notifikasi Shopee menampilkan subjudul dari `user_message`/`message` — konsistensi UX — digunakan di status/error popup.
- [2026-01-28] Detail error bulk menambahkan subjudul untuk Shopee/TikTok — konsisten — `user_message` atau pesan TikTok jadi subtitle.
- [2026-01-30] Auto logout jika API mengembalikan unauthenticated — keamanan sesi — token dibersihkan di popup dan bulk.
- [2026-01-30] Detail error popup default collapse — UI lebih ringkas — tombol tampilkan detail disediakan.
- [2026-01-30] Device Name auto dari email — lebih sederhana — format `{email}-powermaxx_extension` tanpa input.
- [2026-01-30] Validasi email sebelum login — UX lebih jelas — device name tetap otomatis tanpa input.
- [2026-01-30] Bulk tidak export jika fetch tidak valid — mencegah data parsial — log berhenti di langkah fetch.
- [2026-01-30] Bulk TikTok menunggu readiness berbasis perf/load — stabilitas — lanjut fetch saat perf muncul atau load selesai.
- [2026-01-30] Aksi utama popup jadi 3 tombol — akses cepat — Ambil+Kirim ditaruh di baris kedua.
- [2026-02-01] Bulk menambahkan mode Update Order — update order saja — income/AWB tidak dipakai.
- [2026-02-01] Web Powermaxx bisa memicu bulk via postMessage — integrasi web → extension — bulk auto-run dari payload order_sn.
- [2026-02-01] Powermaxx bridge pakai optional host permissions — domain fleksibel — konten script didaftarkan dinamis saat login.
- [2026-02-01] Base URL API disatukan di Pengaturan — lebih sederhana — auth dan export semua marketplace memakai satu base URL.
- [2026-02-01] Izin host diminta saat popup dibuka dan saat simpan pengaturan — siap pakai — bridge aktif lebih cepat.
- [2026-02-02] Bridge Powermaxx mendukung mode `single` dan `bulk` — alur per order vs massal — mode single tidak membuka halaman bulk.
- [2026-02-02] Bridge Shopee memakai `mp_order_id` dengan `id_type: mp_order_id` — tidak perlu search tab — order langsung dibuka.
- [2026-02-02] Bridge bulk bisa campur marketplace per order — fleksibel — tiap item punya field `marketplace`.
- [2026-02-02] `update_both` artinya update order + income — konsistensi aksi — dipetakan ke mode ambil + kirim tanpa AWB.
- [2026-02-03] Distribusi internal tanpa Chrome Web Store pakai GitHub Releases (ZIP) — praktis untuk tim Windows non-managed — user install via `Load unpacked` dari folder hasil extract, update dengan download ZIP versi baru lalu replace isi folder yang sama dan klik **Reload** di `chrome://extensions` (tanpa uninstall).
- [2026-02-03] Referensi `examples/` disimpan tanpa file `.har` — repo lebih ringan & lebih aman — HAR di-ignore dan diganti ringkasan `.summary.json` yang sudah disanitasi (tanpa cookie/token).
- [2026-02-03] Nama repo GitHub diubah menjadi `powermaxx-order-scraper` — konsisten dengan nama aplikasi — distribusi tetap via GitHub Releases (ZIP) dan link lama diharapkan redirect dari GitHub.
- [2026-02-06] Response export mengembalikan `order_id` — popup menampilkan tombol besar untuk membuka order Powermaxx di `{base_url}/admin/orders/{order_id}`.
