# POS Management System — CV. Karya Putra Ragil

Aplikasi POS berbasis **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**,
dan **Supabase** (Postgres + Auth). Supabase adalah satu-satunya sumber data;
tidak ada lagi data demo atau penyimpanan data bisnis di browser.

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase
npm run dev
```

Buka `http://localhost:3000` — otomatis diarahkan ke `/login` bila belum masuk.

Perintah lain: `npm run lint`, `npm run typecheck`, `npm run build`.

### Environment

| Variabel                            | Dipakai di              | Catatan                                     |
| ----------------------------------- | ----------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`          | client & server         | URL project Supabase                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client & server      | Publishable/anon key, aman untuk browser    |
| `SUPABASE_SERVICE_ROLE_KEY`         | server saja             | Jangan pernah diberi prefix `NEXT_PUBLIC_`  |
| `R2_ACCOUNT_ID`                     | server saja             | Cloudflare R2 account ID                    |
| `R2_ACCESS_KEY_ID`                  | server saja             | Access key R2 untuk upload/hapus foto       |
| `R2_SECRET_ACCESS_KEY`              | server saja             | Secret key R2                               |
| `R2_BUCKET`                         | server saja             | Bucket foto produk (`kpr-pos-produk`)       |
| `R2_PUBLIC_URL`                     | server saja             | Domain publik bucket tanpa slash di akhir   |

`.env.local` sudah masuk `.gitignore`. Service role hanya dipakai di server action
untuk RPC tulis dan pembacaan snapshot yang sudah difilter per role.

### Region

`vercel.json` mengunci region deployment ke **`sin1` (Singapore)** agar dekat
dengan database. Pindahkan region database dan fungsi secara bersamaan bila
ingin mengubahnya.

### Foto produk (Cloudflare R2)

Foto produk dikompres di browser (WebP, sisi terpanjang 800px, kualitas 0.8)
lalu diunggah lewat server action ke R2. `products.image_url` hanya menyimpan
key object (`products/...webp`); URL penuh dirakit oleh `resolveProductImageUrl`
di `lib/r2.ts` dari `R2_PUBLIC_URL`. Nilai lama yang berupa URL lengkap atau
data URL tetap ditampilkan apa adanya.

Foto lama dihapus best-effort saat diganti, dihapus, atau produknya dihapus.
Kalau env R2 belum lengkap, upload ditolak dengan pesan
"Upload foto belum dikonfigurasi" dan aplikasi tetap jalan normal.

## Login & hak akses

- Login lewat `/login` memakai **Supabase Auth** (email + password).
- Akun dibuat oleh Owner di halaman **Karyawan & Role** (password awal diberikan
  manual ke karyawan, email sudah terkonfirmasi). Karyawan bisa mengganti
  password sendiri dari menu akun → **Ganti password**.
- Karyawan nonaktif ditolak saat login dan sesinya tidak diterima di server
  (`app/(app)/layout.tsx`).
- Menu sidebar difilter lewat `config/navigation.ts`; tombol aksi memakai
  `ROLE_PERMISSIONS` di `config/permissions.ts` (`usePermissions()`).
- Matriks hak akses bisa diubah Owner (tabel `role_permissions`), kecuali role
  Owner yang selalu penuh.

## Arsitektur data

```
app/(app)/layout.tsx          (server, sekali per request)
  └─ getAuthSession()         → sesi karyawan + cabang + permission
  └─ readAppSnapshot()        → SATU snapshot semua data (query paralel)
        │
        ▼
features/sync/AppSyncProvider (client)
  ├─ prime snapshot ke store in-memory sebelum render anak
  ├─ sync ulang: satu action fetchAppSnapshotAction()
  ├─ focus/visibility di-throttle 60 detik
  └─ dilewati bila ada aksi tulis berjalan (trackCloudWrite)
        │
        ▼
features/*/data/*-repository  → baca/tulis lewat lib/store/store.ts
```

Poin penting:

- **Supabase = sumber data utama.** `lib/store/store.ts` hanya cache tampilan di
  memori (tidak membaca/menulis `localStorage`) dan selalu ditimpa snapshot
  cloud. Tidak ada data demo/seed.
- **Satu koordinator sync.** Tidak ada lagi provider per fitur. Snapshot awal
  dikirim dari server, jadi tidak ada round-trip action saat halaman dibuka.
- **Batas data 60 hari.** `lib/cloud/window.ts` (`SYNC_WINDOW_DAYS`) membatasi
  transaksi, pesanan, draft, riwayat stok, absensi, dan log yang ikut sync.
- **Laporan & riwayat transaksi** mengambil data langsung dari server sesuai
  rentang tanggal yang dipilih (`features/laporan/cloud-actions.ts`,
  `fetchTransactionHistoryAction`), jadi tidak bergantung pada cache sync.
- **Filter per role di SQL**, bukan setelah data diambil: cabang untuk transaksi
  dan draft, sales untuk pesanan, serta riwayat stok/log hanya untuk role yang
  berhak.

### Verifikasi sesi

| Kebutuhan                        | Fungsi                         | Verifikasi                                  |
| -------------------------------- | ------------------------------ | ------------------------------------------- |
| Operasi baca (snapshot, laporan) | `getReadSession()`             | `auth.getClaims()` — JWT dicek lokal        |
| Aksi tulis (kasir, stok, dst)    | `getAuthSession()` / `getAuthorizedSession()` | `auth.getUser()` + validasi role ketat |

Data `employees`, `branches`, dan `role_permissions` dimuat sekali per request
lalu dipakai ulang lewat `React cache()` (`lib/auth/session.ts`).

### Repository per fitur

Komponen tidak pernah memanggil Supabase langsung. Setiap fitur punya repository
di `features/<fitur>/data/`:

| Fitur      | File                                             | Contoh fungsi                                                              |
| ---------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Kasir      | `kasir-repository.ts`                            | `useCashierData`, `createTransaction`, `refundTransaction`, `loadTransactionHistory`, `saveDraft` |
| Produk     | `produk-repository.ts`                           | `useProdukData`, `createProduct`, `addStockIn`, `submitOpname`, `transferStock`, `importProducts` |
| Pesanan    | `pesanan-repository.ts`                          | `usePesananData`, `createSalesOrder`, `updateSalesOrderStatus`, `deleteSalesOrder` |
| Dashboard  | `dashboard-repository.ts`                        | `useDashboardData`                                                         |
| Laporan    | `laporan-repository.ts`                          | `useLaporanData(range, branchScope)`                                        |
| Absensi    | `absensi-repository.ts`                          | `useAbsensiData`, `checkIn`, `checkOut`, `submitLeaveRequest`, `reviewLeaveRequest` |
| Karyawan   | `karyawan-repository.ts`, `actions.ts`           | `useKaryawanData`, `inviteEmployeeAction`, `fetchRolePermissionsAction`     |
| Cabang     | `cabang-repository.ts`                           | `useCabangData`, `createBranch`, `updateBranch`, `setBranchActive`          |
| Pengaturan | `pengaturan-repository.ts`                       | `updateBusinessProfile`, `updateSalesBonus`, `updateReceiptSettings`        |
| Sesi       | `session-repository.ts`                          | `useSession`, `usePermissions`                                              |

Pembacaan snapshot sisi server ada di `features/*/data/server-snapshot.ts`
(masing-masing fitur), lalu digabung oleh `features/sync/data/app-snapshot.ts`.
Perhitungan murni tetap dipisah di `features/*/data/*-calculations.ts`.

## Halaman

| Route         | Isi                                                          |
| ------------- | ------------------------------------------------------------ |
| `/dashboard`  | Ringkasan penjualan, grafik 7 hari, top sales, stok menipis    |
| `/kasir`      | Katalog, keranjang, diskon, pembayaran, draft, struk          |
| `/pesanan`    | Input pesanan, status pesanan, bonus, papan peringkat         |
| `/produk`     | Produk, kategori, stok masuk, opname, transfer, import Excel  |
| `/laporan`    | Omzet, laba, metode bayar, per kasir, log aktivitas, export   |
| `/absensi`    | Absen masuk/pulang, pengajuan izin, rekap bulanan, export     |
| `/karyawan`   | CRUD karyawan, filter role/cabang/status, matriks hak akses   |
| `/cabang`     | CRUD cabang + ringkasan karyawan, produk berstok, omzet       |
| `/pengaturan` | Profil usaha, pembayaran, bonus, struk, jam kerja             |

## Fitur utama

### Kasir

- Klik produk menambah ke keranjang; qty dibatasi stok cabang aktif.
- Diskon nominal/persen, pembayaran Cash/QRIS/Transfer sesuai pengaturan.
- Membayar menyimpan transaksi + item + pengurangan stok secara atomik di
  Supabase (`fn_create_transaction`), lalu cache disinkronkan ulang.
- Nomor struk dihitung di server (`invoice_counters`); preview 58/80mm dan
  `window.print()`.
- **Draft** per cabang: simpan, buka (qty disesuaikan stok), hapus.
- **Riwayat Transaksi** memuat data dari server saat modal dibuka, bisa difilter
  dan direfund (Owner/Manager/Supervisor). Refund mengembalikan stok dan
  mencatat log.

### Produk & Stok

- CRUD produk/kategori, status stok (Aman/Menipis/Habis/Nonaktif).
- Stok masuk, opname (menghitung selisih), dan transfer antar cabang — semua
  lewat RPC atomik dan tercatat di riwayat.
- Import Excel dengan preview validasi per baris.

### Pesanan Sales

- Sales membuat pesanan atas namanya sendiri; Manager/Owner/Supervisor melihat
  semua (Sales hanya melihat miliknya).
- Status Menunggu bayar → Lunas (stok berkurang) atau Dibatalkan (stok kembali).
- Bonus dihitung dari transaksi kasir + pesanan lunas (`calculateBonusAmount`):
  `per_piece`, `percent`, atau `tiered`.

### Laporan

- Filter periode dan cabang; data transaksi/pesanan/log diambil dari server
  sesuai rentang (`fetchReportSourceAction`).
- Omzet, laba kotor, per metode bayar, per kasir, produk terlaris, log aktivitas.
- Export Excel (SheetJS, dynamic import) dan versi cetak PDF.

### Absensi

- Masuk/pulang per hari, status Telat dihitung dari jam kerja di Pengaturan.
- Pengajuan izin dengan persetujuan Manager/Owner.
- Rekap bulanan + export Excel.

### Karyawan, Cabang, Pengaturan

- Karyawan: akun Supabase Auth dibuat lewat service role, nonaktif/hapus dengan
  penjagaan (tidak bisa menonaktifkan diri sendiri, minimal satu Owner aktif).
- Cabang: cabang baru otomatis punya baris stok 0 untuk semua produk.
- Pengaturan (Owner): profil usaha + logo, metode pembayaran, bonus, struk,
  jam kerja.

## Struktur folder

```
app/
  (app)/                 # halaman dengan sidebar + header
    layout.tsx           # sesi + snapshot awal + AppSyncProvider
  login/ auth/ set-password/
components/
  layout/                # AppShell, Sidebar, PageHeader, ...
  ui/                    # Button, Card, Table, Modal, Drawer, Toast, ...
config/
  navigation.ts          # satu sumber daftar menu sidebar
  permissions.ts         # hak aksi per role
features/
  <fitur>/
    components/          # komponen khusus fitur
    data/                # repository, kalkulasi, server-snapshot
    types/               # tipe data fitur
  sync/                  # koordinator sync (snapshot, provider, throttle)
lib/
  auth/session.ts        # sesi baca (getClaims) & tulis (getUser) + cache
  cloud/                 # tipe payload, window 60 hari, helper RPC
  store/                 # cache tampilan in-memory + defaults
  format.ts cn.ts date-range.ts
supabase/migrations/     # skema, RPC, RLS, index
types/                   # tipe domain bersama
proxy.ts                 # refresh sesi Supabase di edge
vercel.json              # region sin1
```

## Database & migration

Semua perubahan skema ada di `supabase/migrations/` dan dijalankan berurutan:

| Migration                                   | Isi                                              |
| ------------------------------------------- | ------------------------------------------------ |
| `20261031000100_initial_schema.sql`         | Tabel, tipe, RLS dasar                           |
| `20261031000200_security.sql`               | Policy & hardening                               |
| `20261102000100_product_stock_rpc.sql`      | RPC produk & stok                                |
| `20261102000200_settings_branch_rpc.sql`    | RPC pengaturan & cabang                          |
| `20261102000300_sales_rpc.sql`              | RPC transaksi, pesanan, draft, bonus             |
| `20261102000400_attendance_activity_rpc.sql`| RPC absensi, izin, log aktivitas                 |
| `20261102000500_role_employee_rpc.sql`      | RPC karyawan & matriks role                      |
| `20261102000600_nav_permissions.sql`        | Sinkronisasi permission role                     |
| `20261103000100_discount_all_roles.sql`     | Diskon untuk semua role                          |
| `20261106000100_fk_indexes.sql`             | Index foreign key yang belum ter-index           |
| `20261106000200_drop_bootstrap_functions.sql` | Drop `fn_bootstrap_*` (jalur lama dihapus)     |
| `20261106000300_revoke_rls_auto_enable.sql` | Cabut execute `rls_auto_enable()` dari client    |
| `20261112000500_tax_shipping.sql`           | PPN + ongkir di transaksi, pesanan, dan setelan   |

Cara menjalankan:

```bash
# dengan Supabase CLI (project sudah di-link)
supabase db push

# atau satu file lewat SQL editor / Management API
supabase migration up --db-url "$SUPABASE_DB_URL"
```

Aturan: satu migration = satu perubahan yang bisa diulang (idempoten bila
memungkinkan, misalnya `create index if not exists`). Jangan mengubah migration
yang sudah dijalankan — buat file baru.

## Menambah menu sidebar

Tambahkan satu objek di `config/navigation.ts`:

```ts
{
  label: "Pelanggan",
  href: "/pelanggan",
  icon: "users", // pilihan ikon ada di components/ui/Icon.tsx
  canAccess: (permissions) => permissions.canManageEmployees,
}
```

## Menambah halaman / fitur

1. Tambahkan tipe di `features/<fitur>/types/index.ts`; entitas global ke
   `lib/store/types.ts`.
2. Tambahkan pembacaan di `features/<fitur>/data/server-snapshot.ts` dan
   daftarkan di `features/sync/data/app-snapshot.ts` + tipe `AppSnapshot`.
3. Tambahkan fungsi baca/tulis di `features/<fitur>/data/`; tulis lewat server
   action dan bungkus dengan `trackCloudWrite` agar sync latar tidak bentrok.
4. Buat komponen di `features/<fitur>/components/` memakai `components/ui`.
5. Tambahkan route di `app/(app)/<fitur>/page.tsx`.
6. Daftarkan menu di `config/navigation.ts` dan hak aksi di
   `config/permissions.ts`, lalu tambahkan RPC + migration bila perlu.

## Catatan implementasi

- Semua data bertipe eksplisit; tidak ada `any`.
- Format rupiah/tanggal/angka hanya lewat `lib/format.ts`.
- Input nominal memakai `components/ui/CurrencyInput`.
- Print hanya satu area: struk lewat portal `#receipt-print-root`, laporan lewat
  `#report-print-root`.
- Import/export Excel memakai `import()` dinamis agar tidak membebani halaman.
- Konten halaman baru dirender di client setelah snapshot pertama masuk, supaya
  data tidak sempat berkedip kosong atau memakai data lama.
- Sidebar menjadi drawer di bawah breakpoint `lg`; tabel lebar memakai
  `overflow-x-auto` di `DataTable`.
- Warna/ukuran/radius ada di blok `@theme` `app/globals.css`; gunakan token
  (`bg-brand`, `text-ink-muted`, `rounded-card`), jangan hex langsung.
  Warna utama `#C2410C`, font Plus Jakarta Sans.

## Belum dikerjakan

- Refund selalu penuh; belum ada refund sebagian.
- Draft belum bisa diubah isinya (hanya buka/hapus).
- Scan barcode di Kasir masih placeholder.
- Absensi belum memakai jadwal shift, lembur, atau potongan gaji.
- Belum ada mode offline; semua aksi tulis butuh koneksi ke Supabase.
