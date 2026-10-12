# 🛒 TroliBijak - Smart Grocery & Budget Safety Tracker (PWA)

Aplikasi Web Progresif (PWA) mobile-first bergaya *native smartphone application* yang dirancang khusus untuk mahasiswa dan siswa rantau yang sedang berbelanja kebutuhan bulanan di supermarket sambil mendorong troli belanja dengan satu tangan.

---

## 📱 Arsitektur & Tampilan Mobile

1. **Format Layar Smartphone (Mobile UI)**:
   - Lebar responsif maksimal `430px` (berada di tengah layar secara estetis saat dibuka pada browser desktop).
   - Layar penuh (*full viewport*) tanpa pembatas saat dibuka pada perangkat smartphone.
2. **Navigasi Bawah Melayang (Floating Bottom Navigation Bar)**:
   - Dock navigasi bawah kaca (*glassmorphic blur*) dengan ikon Lucide untuk 3 tab utama:
     - 🛒 **Belanja** (Troli Aktif & Hitung Realtime)
     - 🕒 **Riwayat** (Histori Belanja & Database Pembanding)
     - 🛡️ **Anggaran** (Safety Cap, Distribusi Pengeluaran & Analisis)
3. **Ergonomi Ramah Jempol (Thumb-Friendly)**:
   - Stepper Qty sentuh besar (`-` dan `+`) berukuran minimal 40px.
   - Tanpa tabel desktop melebar yang memaksa scroll horizontal; menggunakan kartu barang mobile vertikal padat informasi.
   - Tombol aksi cepat tambah barang (*Floating Action Button / FAB*) di pojok kanan bawah yang mudah dijangkau jempol satu tangan.
4. **Dukungan PWA Penuh (Offline & Standalone)**:
   - Manifest `manifest.json` dengan icon 192px dan 512px.
   - Service Worker `sw.js` dengan mekanisme *cache-first & stale-while-revalidate* agar tetap dapat digunakan lancar di lorong supermarket atau *basement* yang minim sinyal internet.
   - Siap dipasang ke Layar Utama (*Add to Home Screen / Standalone Mode*).

---

## ✅ Kebutuhan Fungsional (SRS Checklist)

| Kode | Kebutuhan Fungsional | Status | Implementasi & Rumus |
| :--- | :--- | :---: | :--- |
| **F-01** | **Pencatatan Item Belanja Lengkap** | **Tercapai** | Menyimpan nama produk, kategori barang (Makanan Pokok, Bumbu & Minyak, Kebersihan, Camilan, Minuman), satuan (*kg, liter, pcs, pack, pouch, botol*), kuantitas, harga satuan, dan prioritas belanja (*Wajib* vs *Opsional*). Didukung fitur *Auto-Suggest* dari database bulan lalu. |
| **F-02** | **Perhitungan Kuantitas Otomatis** | **Tercapai** | Setiap perubahan angka kuantitas (Qty) seketika mengalikan harga satuan secara realtime ke total baris item: `Subtotal = Qty × Harga Satuan (setelah diskon)`. Mengupdate total belanja keranjang dan sisa anggaran seketika tanpa reload. |
| **F-03** | **Kalkulator Diskon Bertingkat** | **Tercapai** | Mendukung diskon tunggal (contoh: `25%` atau nominal `Rp 5.000`) dan diskon bertumpuk/bertingkat (contoh: `50% + 20%`). Menggunakan rumus matematis berjenjang: $P_1 = P_0 \times (1 - d_1)$, $P_2 = P_1 \times (1 - d_2)$, dengan transparansi rincian penghematan. |
| **F-04** | **Komparator Harga Realtime vs Bulan Lalu** | **Tercapai** | Muncul seketika saat harga diinput maupun pada kartu belanja:<br>• **Panah Merah Naik (↑)**: Jika harga naik dibanding bulan lalu.<br>• **Panah Hijau Turun (↓)**: Jika harga turun (Promo/Hemat).<br>• **Tanda Setara (=)**: Jika harga stabil/sama.<br>• **Bintang (★)**: Produk baru belum ada riwayat. |
| **F-05** | **Pengendali Anggaran (Safety Cap)** | **Tercapai** | Input batas maksimal dompet bulanan dengan Sticky HUD di bagian atas. Indikator progress bar dinamis: **Hijau (<80% Aman)**, **Kuning (80-99% Waspada)**, dan **Merah Menyala Berdenyut (≥100% OVER BUDGET)** dengan haptic feedback dan tombol penyelamat *Rekomendasi Coret (Triage)*. |
| **F-06** | **Riwayat & Database Belanja** | **Tercapai** | Tombol *Selesai Belanja* mengarsipkan belanjaan ke riwayat, memperbarui katalog harga resmi untuk bulan berikutnya, rincian nota belanja, dan fitur Ekspor/Impor format JSON. |

---

## 🚀 Cara Menjalankan Secara Lokal

1. Buka terminal pada folder proyek.
2. Jalankan server lokal:
   ```bash
   node server.js
   ```
3. Buka browser pada alamat:
   ```
   http://localhost:3000/
   ```
4. Di smartphone: Buka tautan tersebut di Chrome / Safari, lalu pilih menu **"Add to Home screen"** / **"Tambahkan ke Layar Utama"** untuk menikmati pengalaman aplikasi native fullscreen.