# POS Management System — CV. Karya Putra Ragil

UI aplikasi POS berbasis **Next.js 16 (App Router)**, **TypeScript**, dan **Tailwind CSS 4**.
Tahap ini fokus pada tampilan dan struktur kode: belum ada database, login, maupun API.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` — otomatis diarahkan ke `/dashboard`.

Perintah lain: `npm run lint`, `npm run typecheck`, `npm run build`.

## Halaman

| Route        | Isi                                                       |
| ------------ | --------------------------------------------------------- |
| `/dashboard` | Ringkasan penjualan, grafik 7 hari, top sales, stok menipis |
| `/kasir`     | Katalog produk, keranjang, pembayaran Cash/QRIS/Transfer   |
| `/pesanan`   | Input pesanan sales, daftar pesanan, papan peringkat       |
| `/produk`    | Tab stok, ringkasan stok, tabel produk, pagination         |
| `/laporan`   | Omzet, metode bayar, per kasir, produk terlaris, log       |

Desain mengikuti file HTML di `kpr-pos-mockup-html/`.

## Struktur folder

```
app/
  (app)/                 # semua halaman yang memakai sidebar + header
    layout.tsx           # AppShell (drawer mobile)
    dashboard/page.tsx
    kasir/page.tsx
    pesanan/page.tsx
    produk/page.tsx
    laporan/page.tsx
  layout.tsx             # font, metadata, body
  globals.css            # design token Tailwind (@theme)
components/
  layout/                # AppShell, Sidebar, PageHeader, UserBadge
  ui/                    # Button, Card, StatCard, StatusBadge, DataTable,
                         # Input, Select, Textarea, Field, SearchField,
                         # ProgressBar, Chip, Avatar, Icon
config/
  navigation.ts          # SATU sumber daftar menu sidebar
constants/
  roles.ts               # daftar role aplikasi
features/
  dashboard/  kasir/  pesanan/  produk/  laporan/
    components/          # komponen khusus fitur
    data/                # fungsi pengambil data (dummy)
    types/               # tipe data fitur
lib/
  format.ts              # format rupiah, tanggal, angka, persen
  cn.ts                  # penggabung className
types/
  index.ts               # tipe domain bersama (PaymentMethod, SessionUser)
```

## Design token

Warna, ukuran font, dan radius berada di blok `@theme` pada
[`app/globals.css`](app/globals.css) — ini konfigurasi Tailwind 4. Jangan menulis
hex warna langsung di komponen; gunakan utilitas token seperti `bg-brand`,
`text-ink-muted`, `border-line`, `rounded-card`, `text-stat`.

Warna utama: `#C2410C` (`brand`). Font: Plus Jakarta Sans, dimuat di
`app/layout.tsx`.

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

1. Buat `features/<fitur>/types/index.ts` untuk tipe data.
2. Buat `features/<fitur>/data/<fitur>-data.ts` yang mengekspor fungsi
   `get<Fitur>Data()`. Komponen **tidak boleh** memanggil data dummy langsung.
3. Buat komponen di `features/<fitur>/components/`. Pakai ulang komponen
   `components/ui` (jangan menyalin markup tabel/kartu/tombol).
4. Buat `app/(app)/<fitur>/page.tsx` yang memanggil data getter lalu menyusun
   `PageHeader` dan komponen fitur.
5. Tambahkan menu di `config/navigation.ts` dan role di `constants/roles.ts`.

Saat pindah ke database/API, cukup ubah isi fungsi getter (misalnya menjadi
`async`) dan sesuaikan pemanggilnya — struktur tampilan tidak berubah.

## Catatan implementasi

- Format rupiah/tanggal/angka hanya lewat `lib/format.ts`.
- Semua data bertipe eksplisit; tidak ada `any`.
- `PaymentSection` di halaman Kasir adalah Client Component: memilih Cash
  menampilkan uang diterima + kembalian (kembalian dihitung otomatis), QRIS
  menampilkan area QR, Transfer menampilkan pilihan rekening.
- Sidebar berubah menjadi drawer di bawah breakpoint `lg`; tabel lebar memakai
  wrapper `overflow-x-auto` di `DataTable`.

## Belum dikerjakan

Login/otorisasi role, database/API, CRUD nyata, aksi tombol (bayar, simpan
draft, export, tambah produk), interaksi tambah/kurangi qty keranjang, serta
halaman Absensi, Karyawan & Role, Cabang, dan Pengaturan.
