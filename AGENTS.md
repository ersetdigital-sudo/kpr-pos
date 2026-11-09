<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Catatan Proyek kpr-pos

POS CV. Karya Putra Ragil. Next.js 16 App Router (Turbopack) + TypeScript
strict + Tailwind 4 + Supabase (Postgres, Auth). Baca
`docs/rencana-migrasi-database.md` untuk arsitektur lengkap.

## Alur data

- `app/(app)/layout.tsx` → `getAuthSession()` → `readAppSnapshot()` (satu batch
  query paralel) → `features/sync/AppSyncProvider` → store in-memory.
- Tidak ada data bisnis di localStorage. Setelah aksi tulis, panggil
  `syncAppFromCloud({ force: true })` lewat `trackCloudWrite`.
- Tulis data selalu lewat server action + RPC `security definer` memakai
  Supabase admin client. Jangan tulis tabel langsung dari client.
- Jangan membuat snapshot/provider sync per fitur; tambahkan pembacaan ke
  `features/*/data/server-snapshot.ts` lalu daftarkan di `app-snapshot.ts`.

## Hak akses

- Satu sumber metadata izin: `PERMISSION_FIELDS` di `config/permissions.ts`
  (`key`, `column` DB, `label` matriks). `RolePermissions`, `PERMISSION_ROWS`,
  `ROLE_PERMISSIONS_SELECT`, dan `mapRolePermissionsRow` diturunkan dari situ.
- `role_permissions` di database adalah sumber kebenaran; Owner selalu penuh
  dan tidak bisa dikurangi.
- Menambah izin baru: migration kolom + RPC `fn_update_role_permissions_matrix`
  + `PERMISSION_FIELDS` + default `ROLE_PERMISSIONS` (jangan duplikasi daftar
  izin di file lain).
- Menu: `config/navigation.ts` (`canAccess`). URL langsung dicek di `AppShell`
  → `AccessDenied`. Aksi tulis server memakai `getAuthorizedSession("...")`.
- Redirect setelah login dan dari `/` memakai `getFirstAccessiblePath()`.

## Cache Components / prerender

`next.config.ts` memakai `cacheComponents: true`. Halaman yang membaca sesi,
cookies, atau data runtime wajib:

```ts
export const instant = false;

export default async function Page() {
  await connection(); // dari "next/server"
  // baru panggil getAuthSession()/getReadSession()
}
```

Pola ini sudah dipakai di `app/page.tsx`, `app/login/page.tsx`,
`app/set-password/page.tsx`, dan `app/(app)/layout.tsx`. Route handler boleh
membaca `request` tanpa penanda itu.

## Supabase & migration

- Project: `zayanmycerdmxkxpbagg`.
- Repo TIDAK punya `supabase/config.toml` dan project belum di-link.
- 12 migration lama dijalankan manual (SQL editor), lalu di-baseline ke
  `supabase_migrations.schema_migrations`. JANGAN `supabase db push` tanpa
  cek history — migration lama tidak semuanya idempoten.
- Untuk schema baru: buat file baru di `supabase/migrations/`, jalankan HANYA
  file itu (SQL editor atau Management API `/v1/projects/<ref>/database/query`),
  lalu tandai `version`+`name` di `supabase_migrations.schema_migrations`.
- Migration harus aditif dan idempoten bila memungkinkan. Jangan edit migration
  yang sudah jalan.
- Ekstensi `safeupdate` aktif: `DELETE`/`UPDATE` tanpa `WHERE` ditolak, termasuk
  di dalam fungsi PL/pgSQL. Beri `where id is not null` bila memang ingin
  menghapus semua baris.

## Foto produk (R2)

- Env server-only: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (jangan `NEXT_PUBLIC_`).
- `products.image_url` menyimpan KEY object (`products/...webp`), bukan URL.
  URL dirakit hanya oleh `resolveProductImageUrl` di `lib/r2.ts`.
- Upload: kompres di browser (`lib/image/compress-image.ts`) → server action
  `features/produk/photo-actions.ts` (cek `canManageProducts`, max 1 MB) →
  `@aws-sdk/client-s3` ke R2.
- Hapus object best-effort saat foto diganti/dihapus atau produk dihapus.
- Nilai lama berupa URL penuh / data URL harus tetap ditampilkan apa adanya.
- Komponen UI: `components/ui/ImageUploadField.tsx` (reusable) dan
  `components/ui/ImageWithFallback.tsx` (pakai `<img loading="lazy">`, bukan
  `next/image`, agar tidak perlu remotePatterns).

## Konvensi kode

- Path alias `@/*`. Komponen UI generik di `components/ui`, fitur di
  `features/<fitur>/`.
- Select Supabase yang string-nya dinamis menghasilkan tipe
  `GenericStringError[]`; cast lewat `unknown` (lihat `ROLE_PERMISSIONS_SELECT`).
- Komentar dan pesan UI memakai bahasa Indonesia.
- Jangan commit `.commandcode/`, `.playwright-cli/`, atau `supabase/.temp/`.

## Perintah

`npm run typecheck`, `npm run lint`, `npm run build`. Build Vercel adalah
gerbang utama; jalankan typecheck sebelum push bila mengubah tipe/data access.

