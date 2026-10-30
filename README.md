# POS Management System — CV. Karya Putra Ragil

UI aplikasi POS berbasis **Next.js 16 (App Router)**, **TypeScript**, dan **Tailwind CSS 4**.
Fase 3 mencakup store sementara (localStorage), demo role, Kasir, Produk & Stok,
Pesanan Sales, Dashboard, Laporan, Absensi, Karyawan & Role, Cabang, dan
Pengaturan yang semuanya membaca data store. Belum ada database, login, maupun
API.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` — otomatis diarahkan ke `/dashboard`.

Perintah lain: `npm run lint`, `npm run typecheck`, `npm run build`.

## Halaman

| Route        | Isi                                                          |
| ------------ | ------------------------------------------------------------ |
| `/dashboard` | Ringkasan penjualan, grafik 7 hari, top sales, stok menipis   |
| `/kasir`     | Katalog, keranjang, diskon, pembayaran, draft, struk          |
| `/pesanan`   | Input pesanan, status pesanan, bonus, papan peringkat         |
| `/produk`    | Produk, kategori, stok masuk, opname, transfer, import Excel  |
| `/laporan`   | Omzet, laba, metode bayar, per kasir, log aktivitas, export    |
| `/absensi`   | Absen masuk/pulang, pengajuan izin, rekap bulanan, export      |
| `/karyawan`  | CRUD karyawan, filter role/cabang/status, matriks hak akses    |
| `/cabang`    | CRUD cabang + ringkasan karyawan, produk berstok, omzet         |
| `/pengaturan`| Profil usaha, pembayaran, bonus, struk, jam kerja, reset data  |

Desain mengikuti file HTML di `kpr-pos-mockup-html/`.

## Store sementara (localStorage)

Semua data aplikasi berada di satu objek `AppDatabase` (`lib/store/types.ts`) dan
disimpan di `localStorage` dengan key `kpr-pos-db-v1`, sehingga tidak hilang saat
refresh.

```
lib/store/
  types.ts      # tipe semua entitas + AppDatabase
  seed.ts       # data awal: 2 cabang, 10 karyawan (8 role), produk, stok,
                # transaksi, pesanan, absensi 4 hari, pengajuan izin,
                # pengaturan, log
  store.ts      # baca/tulis store + hook useDatabase (useSyncExternalStore)
  activity.ts   # appendActivity/recordActivity + createId
```

Alur baca/tulis:

- Komponen **tidak pernah** menyentuh `localStorage`. Semua lewat repository fitur.
- Baca: `useDatabase()` lalu selector murni, misalnya
  `useCashierData()` di `features/kasir/data/kasir-repository.ts`.
- Tulis: `updateDatabase((database) => nextDatabase)` di `lib/store/store.ts`.
  Fungsi ini menyimpan ke localStorage, memperbarui snapshot, dan memberi tahu
  semua komponen.
- Log aktivitas dicatat lewat `appendActivity` (di dalam mutasi) atau
  `recordActivity` (aksi tanpa perubahan entitas, misalnya batal keranjang).

Data seed dipakai jika localStorage kosong/rusak. `schemaVersion` kini **3**;
data v1/v2 yang tersimpan dimigrasikan otomatis (nomor HP karyawan, jam kerja,
pengajuan izin, logo). Untuk mengulang dari awal, pakai tombol **Reset Data Demo**
di Pengaturan atau hapus key `kpr-pos-db-v1` di DevTools → Application → Local
Storage, lalu refresh.

### Fungsi repository per fitur

| Fitur   | File                                        | Contoh fungsi                                                                 |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Kasir      | `features/kasir/data/kasir-repository.ts`         | `useCashierData`, `createTransaction`, `saveDraft`, `takeDraft`, `deleteDraft` |
| Produk     | `features/produk/data/produk-repository.ts`       | `useProdukData`, `createProduct`, `updateProduct`, `deleteProduct`, `addStockIn`, `submitOpname`, `transferStock`, `importProducts` |
| Pesanan    | `features/pesanan/data/pesanan-repository.ts`     | `usePesananData`, `createSalesOrder`, `updateSalesOrderStatus`                |
| Dashboard  | `features/dashboard/data/dashboard-repository.ts` | `useDashboardData`                                                            |
| Laporan    | `features/laporan/data/laporan-repository.ts`     | `useLaporanData`                                                              |
| Absensi    | `features/absensi/data/absensi-repository.ts`     | `useAbsensiData`, `checkIn`, `checkOut`, `submitLeaveRequest`, `reviewLeaveRequest` |
| Karyawan   | `features/karyawan/data/karyawan-repository.ts`   | `useKaryawanData`, `createEmployee`, `updateEmployee`, `setEmployeeActive`    |
| Cabang     | `features/cabang/data/cabang-repository.ts`       | `useCabangData`, `createBranch`, `updateBranch`, `setBranchActive`            |
| Pengaturan | `features/pengaturan/data/pengaturan-repository.ts` | `updateBusinessProfile`, `togglePaymentMethod`, `addBankAccount`, `updateSalesBonus`, `updateReceiptSettings`, `updateAttendanceSettings`, `resetDemoData` |
| Sesi       | `features/session/data/session-repository.ts`     | `useSession`, `usePermissions`, `setActiveEmployee`, `setActiveBranch`         |

Perhitungan murni dipisah dari komponen di `features/*/data/*-calculations.ts`,
misalnya `kasir-calculations.ts` (`calculateCartTotals`, `reduceStockLevels`),
`produk-calculations.ts` (status stok, selisih opname, pagination),
`pesanan-calculations.ts` (`calculateBonusAmount`, `collectBonusEntries`),
`laporan-calculations.ts` (`buildReportData`, `buildLogUsers`),
`absensi-calculations.ts` (`resolveDisplayStatus`, `buildMonthlyRecap`),
`karyawan-calculations.ts` (`buildEmployeeRows`, `buildRoleMatrix`), dan
`cabang-calculations.ts` (`buildBranchRows`, `calculateBranchSummary`).

### Saat pindah ke database

1. Ganti isi `lib/store/store.ts` (load/save) dengan query database; pertahankan
   bentuk `AppDatabase` atau petakan ke tabel.
2. Ganti isi repository per fitur (`features/*/data/*-repository.ts`) menjadi
   panggilan API. Tanda tangan fungsi dan tipe `CashierData`, `ProductRow`,
   `ReportData`, dst. dipertahankan agar komponen tidak berubah.
3. Fungsi `use*Data()` cukup mengembalikan data hasil query; perhitungan tetap di
   `*-calculations.ts`. `buildReportData` bisa dipindah ke server tanpa mengubah UI.
4. `createTransaction`, `addStockIn`, `submitOpname`, `transferStock`,
   `updateSalesOrderStatus`, `checkIn`/`checkOut`, dan `reviewLeaveRequest`
   sebaiknya menjadi satu transaksi database: simpan dokumen, ubah `stocks` atau
   `attendance`, dan tulis `activityLogs` sekaligus.
5. `resetDemoData` hanya untuk demo; hapus pemanggilannya setelah memakai data
   nyata.
6. Hapus `lib/store/seed.ts` setelah data nyata tersedia.
7. SheetJS (`xlsx`) hanya dipakai di import produk, export laporan, dan export
   rekap absensi; saat pindah ke API, import bisa divalidasi di server.

## Demo role & cabang

- Dropdown **Masuk sebagai** di header mengganti karyawan aktif dari data karyawan.
- Dropdown **Cabang** hanya muncul untuk Owner. Role lain otomatis memakai cabang
  karyawannya.
- Menu sidebar difilter berdasarkan `roles` di `config/navigation.ts`; tombol aksi
  memakai `ROLE_PERMISSIONS` di `config/permissions.ts` (`usePermissions()`).
- Membuka halaman yang tidak diizinkan menampilkan pesan **Akses ditolak**
  (`components/layout/AccessDenied.tsx`).
- Ganti user/cabang me-remount halaman Kasir supaya keranjang tidak tercampur.

## Kasir

- Klik produk menambah ke keranjang; qty bisa ditambah/dikurangi (dibatasi stok
  cabang aktif) dan item bisa dihapus.
- Pencarian dan filter kategori bekerja. Produk stok 0 tidak bisa diklik.
- Diskon nominal atau persen; subtotal, total, dan kembalian dihitung otomatis.
- Tombol **Bayar & Cetak Struk** nonaktif bila keranjang kosong atau uang cash
  kurang. Transfer wajib memilih rekening.
- Membayar: menyimpan transaksi + sales, mengurangi stok cabang aktif, mencatat
  log, lalu menampilkan preview struk (58/80mm sesuai pengaturan) dan
  `window.print()`. Setelah ditutup, keranjang kosong dan nomor struk berikutnya
  otomatis.
- **Simpan Draft** menyimpan keranjang (per cabang). **Draft (n)** membuka daftar
  untuk dibuka kembali atau dihapus (dengan konfirmasi). Buka draft menyesuaikan
  qty bila stok berkurang.
- **Batalkan** mengosongkan keranjang setelah konfirmasi dan mencatat log.
- Setiap aksi memberi toast sukses/gagal (`components/ui/Toast.tsx`).

## Produk & Stok

- Tab **Produk**: tabel dengan pencarian, filter kategori/cabang/status stok,
  pagination, dan kartu ringkasan yang dihitung dari data.
- Tambah/edit produk lewat drawer (nama, SKU unik, kategori, harga modal, harga
  jual, foto, batas stok menipis). Produk yang sudah pernah terjual tidak dihapus
  permanen, hanya dinonaktifkan (`deleteProduct` mengembalikan `mode`).
- Tab **Kategori**: tambah/edit/hapus; kategori yang masih dipakai produk ditolak.
- Tab **Stok Masuk** dan **Stok Opname**: input per cabang beserta tanggal dan
  catatan, sistem menghitung selisih opname lalu menyesuaikan stok, dan riwayat
  tersimpan di `stockIns` / `stockOpnames`.
- Tab **Transfer Antar Cabang**: memindahkan stok, ditolak bila melebihi stok asal.
- **Import Excel** (SheetJS): download template, preview per baris dengan error
  validasi (SKU duplikat, kategori tidak dikenal, angka tidak valid) sebelum
  disimpan. Template dan parser ada di `features/produk/data/produk-excel.ts`.

## Pesanan Sales

- Form menambah/menghapus baris produk, qty, total otomatis; tersimpan atas nama
  sales aktif (`createSalesOrder`).
- Status: Menunggu bayar, Lunas, Dibatalkan. Saat **Lunas** stok cabang berkurang;
  saat **Dibatalkan** stok yang sudah terpotong dikembalikan.
- Bonus dihitung dari pesanan lunas + transaksi kasir yang memakai sales tersebut,
  lewat `calculateBonusAmount` yang mendukung tiga aturan di
  `settings.salesBonus`: `per_piece`, `percent`, dan `tiered` (bertarget pcs).
- Sales hanya melihat pesanannya sendiri; Manager/Owner/Supervisor melihat semua.
  Kartu ringkasan dan papan peringkat dihitung dari data bulan berjalan.

## Dashboard

- Filter cabang (Semua Cabang atau satu cabang) untuk role yang boleh melihat
  semua cabang; role lain terkunci ke cabangnya.
- Semua kartu, grafik 7 hari, top sales, transaksi terakhir, dan stok menipis
  dihitung dari store lewat `features/dashboard/data/dashboard-calculations.ts`.

## Laporan

- Filter periode (Hari ini / Minggu ini / Bulan ini / Custom rentang tanggal) dan
  filter cabang.
- Omzet, laba kotor (harga jual − harga modal), jumlah transaksi, total bonus,
  per metode bayar, per kasir, dan produk terlaris dihitung dari store.
- **Export Excel** memakai SheetJS (sheet Ringkasan, Metode Pembayaran, Per Kasir,
  Produk Terlaris, Transaksi, Log Aktivitas).
- **Export PDF** membuka dialog cetak browser dengan versi siap cetak
  (`ReportPrintSheet` di portal `#report-print-root`).
- Log Aktivitas memakai `activityLogs` asli dan bisa difilter per role, per user,
  dan mengikuti filter periode/cabang.

## Absensi

- Tombol **Masuk** dan **Pulang** mencatat jam serta cabang karyawan aktif. Masuk
  kedua kali di hari yang sama ditolak; pulang butuh masuk dulu.
- Status **Telat** dihitung otomatis dari jam masuk di Pengaturan
  (`resolveDisplayStatus`), bukan disimpan terpisah, sehingga perubahan jam kerja
  langsung berlaku.
- Pengajuan izin (tanggal + alasan) bisa disetujui/ditolak Manager atau Owner;
  izin yang disetujui langsung dicatat sebagai absensi `Izin`.
- Karyawan biasa hanya melihat absensi dan izinnya sendiri; Manager, Supervisor,
  dan Owner melihat semua karyawan dan bisa memfilter cabang.
- Rekap bulanan (hadir, telat, izin, sakit, alpa) bisa diexport ke Excel.

## Karyawan & Role

- Tambah, edit, dan nonaktifkan karyawan (nama, no. HP, role, cabang). Karyawan
  nonaktif hilang dari dropdown **Masuk sebagai** dan riwayatnya tetap utuh.
- Penjagaan: tidak bisa menonaktifkan akun yang sedang dipakai, dan minimal satu
  Owner harus tetap aktif.
- Filter role, cabang, dan status; pencarian nama/no. HP/role.
- Matriks hak akses per role diambil langsung dari `config/navigation.ts`.

## Cabang

- Tambah/edit/nonaktifkan cabang. Cabang baru otomatis punya baris stok 0 untuk
  semua produk sehingga bisa langsung diisi lewat Stok Masuk.
- Ringkasan per cabang: jumlah karyawan aktif, produk berstok (> 0), dan omzet
  bulan berjalan.
- Tidak bisa menonaktifkan cabang yang sedang aktif dipakai atau cabang aktif
  terakhir.

## Pengaturan (Owner)

- **Profil usaha**: nama, alamat, no. telp, dan logo (maks. 200 KB). Logo dan nama
  langsung dipakai di sidebar serta struk.
- **Metode pembayaran**: aktif/nonaktifkan Cash, QRIS, Transfer (minimal satu
  aktif) dan kelola rekening transfer.
- **Bonus sales**: pilih per pcs, persen dari nominal, atau bertingkat; tingkat
  target bisa ditambah/dihapus. Fungsi hitungnya sama dengan fase 2
  (`calculateBonusAmount`).
- **Struk**: ukuran 58/80mm, teks footer, dan preview memakai `ReceiptPaper` yang
  sama dengan Kasir.
- **Jam kerja**: jam masuk/pulang untuk perhitungan telat.
- **Reset Data Demo**: mengembalikan seluruh data ke data awal dengan konfirmasi.

## Struktur folder

```
app/
  (app)/                 # halaman dengan sidebar + header
    layout.tsx           # AppShell + ToastProvider
    dashboard/ kasir/ pesanan/ produk/ laporan/ absensi/ karyawan/ cabang/
    pengaturan/
  layout.tsx             # font, metadata, body
  globals.css            # design token Tailwind (@theme) + aturan print struk
components/
  layout/                # AppShell, Sidebar, PageHeader, SessionControls,
                         # UserBadge, AccessDenied
  ui/                    # Button, Card, StatCard, StatusBadge, DataTable, Input,
                         # Select, Textarea, Field, SearchField, ProgressBar,
                         # Chip, Avatar, Icon, Modal, Drawer, ConfirmDialog,
                         # Toast, Tabs, Pagination, DateRangePicker
config/
  navigation.ts          # SATU sumber daftar menu sidebar
  permissions.ts         # hak aksi per role
constants/
  roles.ts               # 8 role aplikasi
features/
  dashboard/ kasir/ pesanan/ produk/ laporan/ absensi/ karyawan/ cabang/
  pengaturan/ session/
    components/          # komponen khusus fitur
    data/                # repository/selector + perhitungan
    types/               # tipe data fitur
lib/
  store/                 # store terpusat + seed + log aktivitas
  format.ts              # format rupiah, tanggal, angka, persen
  cn.ts                  # penggabung className (tailwind-merge + token teks)
types/
  index.ts               # tipe domain bersama (PaymentMethod)
```

## Design token

Warna, ukuran font, dan radius berada di blok `@theme` pada
[`app/globals.css`](app/globals.css). Gunakan utilitas token seperti `bg-brand`,
`text-ink-muted`, `border-line`, `rounded-card`, `text-stat`; jangan menulis hex
langsung di komponen. Warna utama: `#C2410C` (`brand`). Font: Plus Jakarta Sans.

## Menambah menu sidebar

Cukup tambah satu objek di `config/navigation.ts`:

```ts
{
  label: "Pelanggan",
  href: "/pelanggan",
  icon: "users", // pilihan ikon ada di components/ui/Icon.tsx
  roles: [ROLES.OWNER, ROLES.MANAGER],
},
```

Menu aktif ditentukan otomatis dari `usePathname()`. Menu tanpa `href`
ditampilkan sebagai placeholder "segera hadir".

## Menambah halaman / fitur

1. Tambahkan tipe di `features/<fitur>/types/index.ts`; entitas global ke
   `lib/store/types.ts` bila perlu disimpan.
2. Tambahkan data awal di `lib/store/seed.ts` dan fungsi baca/tulis di
   `features/<fitur>/data/`.
3. Buat komponen di `features/<fitur>/components/`, pakai ulang `components/ui`.
4. Buat `app/(app)/<fitur>/page.tsx` yang memanggil data getter lalu menyusun
   `PageHeader` dan komponen fitur.
5. Daftarkan menu di `config/navigation.ts` dan hak aksi di `config/permissions.ts`.

## Catatan implementasi

- Semua data bertipe eksplisit; tidak ada `any`.
- Format rupiah/tanggal/angka hanya lewat `lib/format.ts`.
- Nomor struk dihitung setelah store ter-hydrate (`useNextInvoiceNumber`) agar
  `new Date()` tidak dievaluasi saat prerender (Cache Components Next 16).
- Sidebar menjadi drawer di bawah breakpoint `lg`; tabel lebar memakai wrapper
  `overflow-x-auto` di `DataTable`.
- Print hanya mencetak satu area: struk lewat portal `#receipt-print-root`,
  laporan lewat `#report-print-root`.
- Import/export Excel (produk, laporan, rekap absensi) memakai `xlsx` yang
  di-`import()` dinamis agar tidak ikut membebani halaman lain.
- Halaman yang memakai `new Date()` baru menghitung tanggal setelah store
  ter-hydrate (`useHydratedDatabase`), supaya tidak memicu error prerender
  Cache Components.

## Belum dikerjakan

- Login/otorisasi nyata (role masih demo lewat dropdown) dan pembatasan data per
  karyawan di server.
- Login karyawan nonaktif masih bisa memakai data lama di localStorage; belum ada
  sesi server.
- Transaksi belum bisa dibatalkan/di-refund setelah dibayar; draft belum bisa
  diubah (hanya buka/hapus); keranjang belum dipulihkan otomatis saat refresh.
- Scan barcode di Kasir masih placeholder.
- Absensi belum memakai jadwal shift per karyawan, lembur, atau potongan gaji.
