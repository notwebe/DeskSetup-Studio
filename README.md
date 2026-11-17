# DeskSetup Studio

**DeskSetup Studio** adalah aplikasi web interaktif untuk menyusun dan merencanakan setup PC secara virtual di atas meja 3D. Pengguna dapat memilih perangkat dari katalog, mengatur posisi dan sudut rotasi item di atas meja, memindahkan serta memutar meja di dalam ruangan, hingga menguji tampilan pencahayaan setup pada mode ruangan terang maupun gelap.

---

## Tech Stack

- **Build Tool & Bahasa**: Vite, React 18, TypeScript
- **3D Engine & Rendering**: Three.js melalui `@react-three/fiber`, `@react-three/drei`, dan `@react-three/postprocessing`
- **State Management**: Zustand
- **Styling & Ikon**: Tailwind CSS, Lucide React

---

## Fitur Saat Ini

- **Meja Gaming Elektrik 3D (`DeskRig`)**:
  - Meja hitam bersudut membulat lengkap dengan kaki T-terbalik teleskopik, *desk mat* bermotif kurva hijau, dua lubang kabel (*grommet*), *cup holder*, kait *headphone*, dan panel kontrol.
  - Meja dapat dipilih, digeser di lantai ruangan (dengan *snap* grid `10 cm` saat menahan `Shift`), dan diputar (`Q`/`E` sebesar `15°`), di mana seluruh perangkat di atas meja ikut bergerak bersama meja.
- **Monitor & Pilihan Penyangga (`Mount`)**:
  - Pilihan monitor `24" (16:9)`, `27" (16:9)`, dan `34" Ultrawide (21:9)` lengkap dengan informasi berat dan peringatan kapasitas penyangga.
  - Empat opsi penyangga: **Stand Bawaan**, **Monitor Arm Basic**, **Monitor Arm Heavy-Duty** (dengan perhitungan *Two-Bone IK* 3D), serta **Desk Mount Bracket** lengkap dengan pengaturan tinggi layar dan posisi klem.
- **Keyboard Mekanikal Prosedural**:
  - Varian ANSI **TKL (84 tombol)**, **Full-size (104 tombol)**, dan **65% (68 tombol)** dengan *keycap* ber-*taper*, lapisan teks *legend*, lampu indikator, serta kabel USB dinamis yang otomatis terhubung ke lubang kabel meja terdekat.
- **Mouse Gaming Nirkabel Prosedural**:
  - Varian **MMO 12 Tombol Wireless** dan **Mouse Gaming Standar** dengan bodi hasil *lofting superellipse*, roda *scroll* beralur dengan strip menyala, panel 12 tombol samping berangka menyala, dan emblem punggung.
- **Saklar Lampu Dinding & Mode Malam**:
  - Saklar *rocker* interaktif di dinding belakang yang meredupkan cahaya ruangan secara halus (~0,7 detik) dan menyalakan layar monitor (beserta cahaya limpahan ke meja), *backlight* legenda dan celah tombol keyboard, aksen lampu mouse, *glow decal* pada *desk mat*, serta efek *post-processing bloom*.

---

## Cara Menjalankan

1. **Instal dependensi**:
   ```bash
   npm install
   ```
2. **Jalankan server pengembangan (development)**:
   ```bash
   npm run dev
   ```
3. **Jalankan pemeriksaan tipe & build produksi**:
   ```bash
   npm run build
   ```

---

## Cara Update Repo

Gunakan urutan perintah berikut setiap kali selesai mengerjakan satu fitur atau perbaikan:

```bash
git status                              # 1. Lihat daftar file yang berubah
npm run build                           # 2. Pastikan aplikasi ter-build tanpa error
git add .                               # 3. Masukkan perubahan ke staging area
git commit -m "feat: <deskripsi singkat>" # 4. Simpan perubahan ke riwayat commit
git push                                # 5. Unggah commit ke GitHub
```

### Aturan Pesan Commit
Awali pesan commit sesuai jenis perubahan (1 commit = 1 perubahan yang bermakna, jangan mencampur banyak fitur sekaligus):
- `feat:` — penambahan fitur baru
- `fix:` — perbaikan bug
- `style:` — perubahan tampilan/visual tanpa mengubah logika
- `refactor:` — perapian struktur kode
- `docs:` — perubahan dokumentasi (`README.md`, komentar)
- `chore:` — pembaruan konfigurasi atau dependensi

### Anjuran Branch & Cara Kembali Jika Ada Masalah
- **Fitur besar**: buat branch baru terlebih dahulu dengan `git switch -c feat/nama-fitur`, lalu gabungkan kembali ke `main` setelah fitur berfungsi dengan baik.
- **Membatalkan perubahan yang belum di-commit**:
  ```bash
  git restore <nama-file>
  ```
- **Membatalkan commit yang sudah terlanjur di-push** (aman tanpa menghapus riwayat):
  ```bash
  git revert <hash-commit>
  ```
  *(Hindari penggunaan `git reset --hard` atau `git push --force`).*

---

## Catatan Aset 3D

- Jika ke depannya menambahkan model 3D eksternal (`.glb` / `.gltf`), usahakan ukuran setiap file `.glb` tetap **di bawah 3 MB** (kompres tekstur dengan WebP/KTX2 dan geometri dengan Draco/Meshopt).
- Apabila total ukuran aset 3D di dalam repositori mulai membesar, pertimbangkan untuk mengaktifkan **Git LFS** (*Large File Storage*) pada ekstensi `*.glb` dan `*.hdr`.
