# Rencana Migrasi: localStorage → Supabase + Login & Hak Akses per Role

Dokumen ini adalah rencana kerja, bukan hasil implementasi. Semua nama file,
fungsi, dan kolom di bawah mengacu pada kode yang ada di repo saat ini
(commit `9f1328b`), dengan **Supabase** sebagai target.

Batasannya: **tampilan tidak berubah**. Tidak ada perubahan layout, warna,
ukuran, atau urutan elemen di 9 halaman yang sudah ada. Yang berubah hanya
lapisan data di belakangnya, plus dua hal yang tidak bisa dihindari dan
dijelaskan di bagian 7.3.

---

## 1. Kondisi saat ini

| Lapisan | Isi sekarang |
| --- | --- |
| Penyimpanan | Satu objek `AppDatabase` di `localStorage` (`kpr-pos-db-v1`), dibaca/ditulis oleh `lib/store/store.ts` |
| Baca | 9 hook `use*Data()` per fitur, semuanya memanggil `useDatabase()` / `useHydratedDatabase()` |
| Tulis | Fungsi mutasi sinkron per fitur (`createTransaction`, `createProduct`, `checkIn`, …) yang memanggil `updateDatabase()` |
| Perhitungan | Fungsi murni `build*` / `calculate*` yang menerima `AppDatabase` lalu mengembalikan DTO siap tampil |
| Sesi | `database.session.currentEmployeeId` + `activeBranchId`, diganti user lewat dropdown "Masuk sebagai" |
| Hak akses | `config/navigation.ts` (menu) + `config/permissions.ts` (aksi), dicek di komponen |
| Log | `appendActivity()` memotong daftar ke 200 entri terbaru |

Yang harus diperbaiki migrasi ini:

1. Data terikat ke satu browser; dua kasir di dua komputer tidak melihat data yang sama.
2. Batas `localStorage` ±5 MB; transaksi historis akan menabraknya.
3. Tidak ada autentikasi: `selectSession()` bahkan mem-fallback ke `employees[0]` sehingga aplikasi tetap "masuk" sebagai orang lain.
4. Mutasi tidak atomik antar-entitas (stok + transaksi + log) karena hanya objek memori yang diganti.
5. Nomor struk dihitung dengan `reduce` atas seluruh transaksi (`getNextInvoiceNumber`), rawan duplikat begitu ada dua kasir bersamaan.

---

## 2. Keputusan teknis: Supabase

| Kebutuhan | Pilihan | Versi | Alasan |
| --- | --- | --- | --- |
| Database | **Supabase Postgres** | — | Postgres 17 terkelola, free tier cukup untuk 1 perusahaan, backup harian |
| Query dari app | **@supabase/supabase-js** | 2.118.0 | Client typed hasil `gen types`, otomatis membawa JWT user sehingga RLS berlaku |
| Sesi SSR | **@supabase/ssr** | 0.12.7 | Cookie httpOnly + refresh token di server, resep resmi untuk App Router |
| Migrasi & seed | **Supabase CLI** | 2.122.0 | Migrasi SQL bernomor di `supabase/migrations`, bisa di-review, `db push` ke project dev |
| Tipe TS | `supabase gen types typescript` | — | Satu sumber tipe dari skema, tidak ada `any` |
| Autentikasi | **Supabase Auth (email + password)** | — | Sudah satu paket dengan DB, `auth.uid()` langsung bisa dipakai di RLS |
| File (logo & foto produk) | **Supabase Storage** | — | Mengganti data URL base64 yang sekarang membengkak di store |
| Otorisasi | **RLS + fungsi SQL** | — | Aturan akses dijaga database, bukan hanya komponen |

Yang **tidak** dipakai: Drizzle/Prisma (Supabase CLI sudah menangani migrasi + tipe; ORM akan menyembunyikan RLS), Better Auth/Clerk (Supabase Auth sudah ada dan `auth.uid()` langsung terhubung ke policy), dan service-role key di client (hanya untuk pembuatan akun karyawan).

Env yang dibutuhkan (`.env.local`, jangan di-commit):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # hanya server, untuk invite karyawan
```

---

## 3. Arsitektur target

Prinsip: **kontrak data lama dipertahankan**. Fungsi perhitungan (`buildDashboardData`, `buildLaporanData`, `calculateCartTotals`, `calculateBonusAmount`, `buildAttendanceRecap`, …) tidak diubah; mereka tetap menerima objek berbentuk `AppDatabase`.

```
proxy.ts                      → refresh cookie sesi (@supabase/ssr), redirect /login bila kosong
   ▼
Server Component page.tsx     → await connection()  (Cache Components: halaman dinamis)
   │                            await requireEmployee()  → employees + role + branch
   │                            await getXxxSnapshot({ branchScope })
   ▼
<DatabaseProvider value={snapshot}>       ← pengganti store localStorage
   ▼
Komponen client yang sudah ada            ← markup & kelas tidak disentuh
   │  useCashierData() / useProdukData() / …  membaca context
   │  tombol → server action
   ▼
Server Action                              → supabase.rpc("fn_…")  dengan JWT user
   ▼
SQL function (security definer)            → validasi role, transaksi DB, tulis activity_logs
   ▼
revalidatePath + router.refresh()          → snapshot baru → UI ter-render
```

Kenapa begini:

- Komponen tampilan tetap memakai hook dan nama fungsi yang sama → risiko merusak UI hampir nol.
- Perhitungan tetap di `*-calculations.ts`, bisa diuji tanpa database.
- RLS tetap berlaku karena semua query memakai client ber-JWT user, bukan service role.
- Operasi yang menyentuh stok/uang dijalankan di dalam satu fungsi SQL = satu transaksi, tidak bisa setengah jadi.

### 3.1 File baru

```
lib/supabase/
  server.ts            # createServerClient (@supabase/ssr) dengan cookies() — dipakai page & action
  admin.ts             # createClient(service role) — HANYA untuk invite karyawan & impor awal
  types.ts             # hasil `gen types`, di-alias ke tipe domain
  snapshot.ts          # helper menyusun AppDatabase dari hasil query
  queries/
    kasir.ts produk.ts pesanan.ts dashboard.ts laporan.ts
    absensi.ts karyawan.ts cabang.ts pengaturan.ts
lib/actions/
  guard.ts             # requireEmployee, requirePermission, runAction
proxy.ts               # updateSession + redirect /login
app/login/page.tsx     # satu-satunya halaman baru
app/auth/callback/route.ts   # tukar kode invite/reset password
supabase/
  config.toml
  migrations/2026…_01_schema.sql
  migrations/2026…_02_permissions.sql
  migrations/2026…_03_rls.sql
  migrations/2026…_04_functions.sql
  seed.sql
```

### 3.2 File yang dihapus setelah migrasi selesai

`lib/store/store.ts`, `lib/store/seed.ts`, `lib/store/activity.ts`, dan semua pemanggilan `updateDatabase` di repository fitur. `lib/store/types.ts` **tetap** sebagai kontrak DTO (dipindah ke `lib/types/domain.ts` bila sudah stabil).

---

## 4. Skema database

Aturan tipe: `timestamptz` untuk waktu, `text` untuk string (tanpa `varchar(n)`), `boolean` untuk flag, `date` untuk tanggal absensi/opname, dan **`integer` rupiah** untuk uang karena aplikasi tidak memakai sen — integer eksak dan tidak menimbulkan pembulatan seperti `float`. ID transaksi memakai `text` (cuid2) supaya mirip ID sekarang; ID user memakai `uuid` agar cocok dengan `auth.users`.

```sql
-- ===== Master =====
create table public.branches (
  id          text primary key,
  name        text not null,
  address     text not null default '',
  phone       text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.employees (
  id          text primary key,
  user_id     uuid unique references auth.users(id) on delete set null,
  name        text not null,
  phone       text not null default '',
  initials    text not null default '',
  role        text not null,
  branch_id   text not null references public.branches(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index employees_branch_idx on public.employees (branch_id);
create index employees_role_idx on public.employees (role);

create table public.categories (
  id         text primary key,
  name       text not null,
  is_active  boolean not null default true
);

create table public.products (
  id          text primary key,
  name        text not null,
  sku         text not null unique,
  category_id text not null references public.categories(id),
  cost_price  integer not null check (cost_price >= 0),
  price       integer not null check (price >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active);

create table public.stock_levels (
  branch_id  text not null references public.branches(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity   integer not null default 0 check (quantity >= 0),
  min_stock  integer not null default 0 check (min_stock >= 0),
  primary key (branch_id, product_id)
);
create index stock_levels_product_idx on public.stock_levels (product_id);

-- ===== Pengaturan (satu baris) =====
create table public.settings (
  id                      smallint primary key default 1 check (id = 1),
  business_name           text not null,
  business_address        text not null default '',
  business_phone          text not null default '',
  business_logo_url       text,
  enabled_payment_methods text[] not null default '{Cash,QRIS,Transfer}',
  receipt_paper_size      smallint not null default 80 check (receipt_paper_size in (58, 80)),
  receipt_footer          text not null default '',
  work_start_time         time not null default '08:00',
  work_end_time           time not null default '17:00',
  bonus_type              text not null default 'per_piece',
  bonus_per_piece_amount  integer not null default 5000,
  bonus_percent_rate      numeric(5,2) not null default 0,
  data_imported_at        timestamptz,
  updated_at              timestamptz not null default now()
);

create table public.bonus_tiers (
  id               text primary key,
  min_quantity     integer not null check (min_quantity > 0),
  amount_per_piece integer not null check (amount_per_piece >= 0),
  unique (min_quantity)
);

create table public.bank_accounts (
  id             text primary key,
  bank_name      text not null,
  account_number text not null,
  account_holder text not null,
  sort_order     integer not null default 0
);

-- ===== Matriks hak akses (sumber kebenaran untuk RLS) =====
create table public.role_permissions (
  role                   text primary key,
  can_apply_discount     boolean not null default false,
  can_cancel_transaction boolean not null default false,
  can_manage_products    boolean not null default false,
  can_create_sales_order boolean not null default false,
  can_manage_sales_orders boolean not null default false,
  can_export_reports     boolean not null default false,
  can_view_all_branches  boolean not null default false,
  can_view_all_attendance boolean not null default false,
  can_approve_leave      boolean not null default false,
  can_manage_employees   boolean not null default false,
  can_manage_branches    boolean not null default false,
  can_manage_settings    boolean not null default false
);

-- ===== Penomoran dokumen =====
-- Nomor struk: INV-YYMMDD-xxx, urutan reset setiap hari.
create table public.invoice_counters (
  day           date primary key,
  last_sequence integer not null default 0
);

-- Nomor pesanan sales: SO-YYMMDD-xxx, urutan reset setiap hari dan
-- terpisah dari invoice_counters.
create table public.sales_order_counters (
  day           date primary key,
  last_sequence integer not null default 0
);

create table public.transactions (
  id               text primary key,
  invoice_number   text not null unique,
  branch_id        text not null references public.branches(id),
  cashier_id       text not null references public.employees(id),
  sales_employee_id text references public.employees(id),
  subtotal         integer not null check (subtotal >= 0),
  discount_type    text not null check (discount_type in ('nominal', 'percent')),
  discount_value   integer not null default 0,
  discount_amount  integer not null default 0,
  total            integer not null check (total >= 0),
  payment_method   text not null check (payment_method in ('Cash', 'QRIS', 'Transfer')),
  cash_received    integer,
  change_amount    integer,
  bank_account_id  text references public.bank_accounts(id) on delete set null,
  refunded_at      timestamptz,
  refunded_by_id   text references public.employees(id),
  refunded_by_name text,
  refund_reason    text,
  refund_amount    integer,
  created_at       timestamptz not null default now()
);
create index transactions_branch_created_idx on public.transactions (branch_id, created_at desc);
create index transactions_created_idx on public.transactions (created_at desc);
create index transactions_cashier_idx on public.transactions (cashier_id);
create index transactions_sales_idx on public.transactions (sales_employee_id);
create index transactions_bank_idx on public.transactions (bank_account_id);

create table public.transaction_items (
  id             text primary key,
  transaction_id text not null references public.transactions(id) on delete cascade,
  product_id     text references public.products(id) on delete set null,
  product_name   text not null,
  unit_price     integer not null,
  unit_cost      integer,
  quantity       integer not null check (quantity > 0),
  line_total     integer not null
);
create index transaction_items_trx_idx on public.transaction_items (transaction_id);
create index transaction_items_product_idx on public.transaction_items (product_id);

-- ===== Draft keranjang =====
create table public.cart_drafts (
  id                text primary key,
  label             text not null,
  branch_id         text not null references public.branches(id) on delete cascade,
  cashier_id        text not null references public.employees(id),
  sales_employee_id text references public.employees(id),
  discount_type     text not null check (discount_type in ('nominal', 'percent')),
  discount_value    integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index cart_drafts_branch_idx on public.cart_drafts (branch_id);
create index cart_drafts_cashier_idx on public.cart_drafts (cashier_id);

create table public.cart_draft_items (
  id         text primary key,
  draft_id   text not null references public.cart_drafts(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity   integer not null check (quantity > 0)
);
create index cart_draft_items_draft_idx on public.cart_draft_items (draft_id);

-- ===== Pesanan sales =====
create table public.sales_orders (
  id                text primary key,
  order_number      text not null unique,
  customer_name     text not null,
  customer_phone    text not null default '',
  branch_id         text not null references public.branches(id),
  sales_employee_id text not null references public.employees(id),
  total             integer not null default 0,
  status            text not null default 'Menunggu bayar',
  paid_at           timestamptz,
  stock_applied     boolean not null default false,
  note              text not null default '',
  created_at        timestamptz not null default now()
);
create index sales_orders_branch_idx on public.sales_orders (branch_id);
create index sales_orders_sales_idx on public.sales_orders (sales_employee_id, created_at desc);
create index sales_orders_status_idx on public.sales_orders (status);
create index sales_orders_paid_idx on public.sales_orders (paid_at desc);

create table public.sales_order_items (
  id           text primary key,
  order_id     text not null references public.sales_orders(id) on delete cascade,
  product_id   text references public.products(id) on delete set null,
  product_name text not null,
  unit_price   integer not null,
  unit_cost    integer,
  quantity     integer not null check (quantity > 0)
);
create index sales_order_items_order_idx on public.sales_order_items (order_id);
create index sales_order_items_product_idx on public.sales_order_items (product_id);

-- ===== Stok masuk / opname / transfer =====
create table public.stock_ins (
  id         text primary key,
  branch_id  text not null references public.branches(id),
  date       date not null,
  note       text not null default '',
  user_id    text not null references public.employees(id),
  created_at timestamptz not null default now()
);
create index stock_ins_branch_idx on public.stock_ins (branch_id, date desc);

create table public.stock_in_items (
  id           text primary key,
  stock_in_id  text not null references public.stock_ins(id) on delete cascade,
  product_id   text references public.products(id) on delete set null,
  product_name text not null,
  quantity     integer not null check (quantity > 0)
);
create index stock_in_items_stock_in_idx on public.stock_in_items (stock_in_id);

create table public.stock_opnames (
  id         text primary key,
  branch_id  text not null references public.branches(id),
  date       date not null,
  note       text not null default '',
  user_id    text not null references public.employees(id),
  created_at timestamptz not null default now()
);
create index stock_opnames_branch_idx on public.stock_opnames (branch_id, date desc);

create table public.stock_opname_items (
  id                text primary key,
  opname_id         text not null references public.stock_opnames(id) on delete cascade,
  product_id        text references public.products(id) on delete set null,
  product_name      text not null,
  system_quantity   integer not null,
  physical_quantity integer not null,
  difference        integer not null
);
create index stock_opname_items_opname_idx on public.stock_opname_items (opname_id);

create table public.stock_transfers (
  id             text primary key,
  from_branch_id text not null references public.branches(id),
  to_branch_id   text not null references public.branches(id),
  date           date not null,
  note           text not null default '',
  user_id        text not null references public.employees(id),
  created_at     timestamptz not null default now(),
  check (from_branch_id <> to_branch_id)
);
create index stock_transfers_from_idx on public.stock_transfers (from_branch_id, date desc);
create index stock_transfers_to_idx on public.stock_transfers (to_branch_id, date desc);

create table public.stock_transfer_items (
  id           text primary key,
  transfer_id  text not null references public.stock_transfers(id) on delete cascade,
  product_id   text references public.products(id) on delete set null,
  product_name text not null,
  quantity     integer not null check (quantity > 0)
);
create index stock_transfer_items_transfer_idx on public.stock_transfer_items (transfer_id);

-- ===== Absensi =====
create table public.attendance (
  id          text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  branch_id   text not null references public.branches(id),
  date        date not null,
  status      text not null check (status in ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  check_in    time,
  check_out   time,
  unique (employee_id, date)
);
create index attendance_date_idx on public.attendance (date desc);
create index attendance_branch_idx on public.attendance (branch_id, date desc);

create table public.leave_requests (
  id          text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  branch_id   text not null references public.branches(id),
  date        date not null,
  reason      text not null,
  status      text not null default 'Menunggu'
              check (status in ('Menunggu', 'Disetujui', 'Ditolak')),
  reviewed_by text references public.employees(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index leave_requests_employee_idx on public.leave_requests (employee_id, date desc);
create index leave_requests_status_idx on public.leave_requests (status);

-- ===== Log aktivitas (append-only) =====
create table public.activity_logs (
  id        text primary key,
  at        timestamptz not null default now(),
  user_id   text not null,
  user_name text not null,
  role      text not null,
  branch_id text not null,
  action    text not null,
  detail    text not null
);
create index activity_logs_at_idx on public.activity_logs (at desc);
create index activity_logs_role_idx on public.activity_logs (role, at desc);
create index activity_logs_user_idx on public.activity_logs (user_id, at desc);
create index activity_logs_branch_idx on public.activity_logs (branch_id, at desc);
```

Catatan skema:

- `activity_logs` sengaja tanpa FK ke `employees` supaya log tetap utuh saat karyawan dinonaktifkan/dihapus.
- `transaction_items.product_name/unit_price/unit_cost` adalah snapshot; struk dan laba lama tidak berubah saat produk diedit.
- Semua kolom FK diberi index (Postgres tidak membuatnya otomatis) agar join dan `on delete cascade` tidak memicu seq scan.
- `role` tidak memakai enum agar menambah role cukup di `constants/roles.ts` + `role_permissions`.

---

## 5. RLS: aturan akses di database

### 5.1 Prinsip

1. **Select policy** untuk setiap tabel, dibatasi role & cabang.
2. **Tidak ada insert/update/delete policy** sama sekali. Semua penulisan lewat fungsi SQL `security definer` di skema `private` — jadi bypass RLS hanya mungkin dari kode yang kita tulis sendiri, dan setiap fungsi wajib memvalidasi aktor.
3. Semua policy memakai `(select auth.uid())`, bukan `auth.uid()` langsung, agar fungsi hanya dievaluasi sekali per query, bukan per baris.
4. Helper role disimpan di skema `private` yang tidak diekspos PostgREST.

### 5.2 Helper function

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_employee()
returns table (id text, role text, branch_id text, is_active boolean)
language sql stable security definer
set search_path = ''
as $$
  select e.id, e.role, e.branch_id, e.is_active
  from public.employees e
  where e.user_id = (select auth.uid())
  limit 1;
$$;
revoke execute on function private.current_employee() from public, anon;
grant execute on function private.current_employee() to authenticated;

create or replace function private.current_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from private.current_employee(); $$;

create or replace function private.current_branch() returns text
language sql stable security definer set search_path = ''
as $$ select branch_id from private.current_employee(); $$;

create or replace function private.has_permission(permission text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case permission
       when 'can_apply_discount'      then can_apply_discount
       when 'can_cancel_transaction'  then can_cancel_transaction
       when 'can_manage_products'     then can_manage_products
       when 'can_create_sales_order'  then can_create_sales_order
       when 'can_manage_sales_orders' then can_manage_sales_orders
       when 'can_export_reports'      then can_export_reports
       when 'can_view_all_branches'   then can_view_all_branches
       when 'can_view_all_attendance' then can_view_all_attendance
       when 'can_approve_leave'       then can_approve_leave
       when 'can_manage_employees'    then can_manage_employees
       when 'can_manage_branches'     then can_manage_branches
       when 'can_manage_settings'     then can_manage_settings
       else false end
     from public.role_permissions
     where role = (select private.current_role())),
    false);
$$;
```

`employees` dibaca di dalam `security definer` sehingga policy `employees` tidak memanggil dirinya sendiri (menghindari rekursi policy yang tidak berujung).

Helper ID untuk semua fungsi tulis:

```sql
create or replace function public.gen_id(prefix text) returns text
language sql volatile set search_path = ''
as $$ select prefix || '-' || replace(gen_random_uuid()::text, '-', ''); $$;
revoke execute on function public.gen_id(text) from public, anon;
grant execute on function public.gen_id(text) to authenticated;
```

### 5.3 Contoh policy inti

```sql
alter table public.transactions enable row level security;

create policy transactions_read on public.transactions
  for select to authenticated
  using (
    (select private.has_permission('can_view_all_branches'))
    or branch_id = (select private.current_branch())
  );

alter table public.attendance enable row level security;

create policy attendance_read on public.attendance
  for select to authenticated
  using (
    (select private.has_permission('can_view_all_attendance'))
    or employee_id = (select e.id from private.current_employee() e)
  );

alter table public.cart_drafts enable row level security;

create policy cart_drafts_read on public.cart_drafts
  for select to authenticated
  using (cashier_id = (select e.id from private.current_employee() e));

alter table public.settings enable row level security;

create policy settings_read on public.settings
  for select to authenticated using (true);

alter table public.activity_logs enable row level security;

create policy activity_logs_read on public.activity_logs
  for select to authenticated
  using ((select private.has_permission('can_export_reports')));
```

### 5.4 Matriks policy per tabel

| Tabel | Select untuk authenticated | Insert/Update/Delete |
| --- | --- | --- |
| `branches` | semua | hanya via function (`can_manage_branches`) |
| `employees` | semua (dibutuhkan untuk nama kasir/sales di seluruh UI; no. HP ikut terlihat seperti sekarang) | hanya via function |
| `categories`, `products`, `stock_levels` | semua | hanya via function (`can_manage_products`) |
| `stock_ins`, `stock_opnames`, `stock_transfers` + item | `can_manage_products`, atau cabang sendiri | hanya via function |
| `transactions` + `transaction_items` | `can_view_all_branches` atau cabang sendiri | hanya via function |
| `cart_drafts` + item | kasir pemilik draft (`exists (select 1 from cart_drafts d where d.id = draft_id and d.cashier_id = …)`) | hanya via function |
| `sales_orders` + item | `can_manage_sales_orders` atau `sales_employee_id = diri` | hanya via function |
| `attendance` | `can_view_all_attendance` atau diri sendiri | hanya via function |
| `leave_requests` | `can_approve_leave` atau diri sendiri | hanya via function |
| `activity_logs` | `can_export_reports` (Owner/Manager/Accountant) | hanya function (no policy) |
| `settings`, `bank_accounts`, `bonus_tiers` | semua | hanya via function (`can_manage_settings`) |
| `role_permissions` | semua (dipakai juga oleh UI matriks) | hanya migrasi/seed |

Anon role tidak mendapat policy apa pun, jadi `anon` key tanpa login hanya bisa membaca nol baris.

### 5.5 Penulisan lewat RPC

Semua operasi tulis menjadi fungsi di skema `public` (agar bisa dipanggil `supabase.rpc`), dengan pola:

```sql
create or replace function public.fn_create_transaction(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_total integer;
  v_invoice text;
  v_id text := public.gen_id('trx');
begin
  select * into v_actor from private.current_employee();
  if v_actor.id is null or not v_actor.is_active then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  -- kunci stok yang dipakai, lalu validasi qty <= stok
  -- hitung subtotal/diskon/total dengan aturan yang sama seperti kasir-calculations.ts
  -- insert transactions + transaction_items, update stock_levels
  -- ambil nomor struk dari invoice_counters (on conflict do update … returning)
  -- insert activity_logs
  return jsonb_build_object('transactionId', v_id, 'invoiceNumber', v_invoice, 'total', v_total);
end;
$$;
revoke execute on function public.fn_create_transaction(jsonb) from public, anon;
grant execute on function public.fn_create_transaction(jsonb) to authenticated;
```

Daftar fungsi yang dibutuhkan (nama mengikuti repository yang ada):

| Fitur | Fungsi SQL |
| --- | --- |
| Kasir | `fn_create_transaction`, `fn_refund_transaction`, `fn_save_draft`, `fn_take_draft`, `fn_delete_draft`, `fn_log_cart_cancellation` |
| Produk | `fn_create_product`, `fn_update_product`, `fn_set_product_active`, `fn_delete_product`, `fn_create_category`, `fn_update_category`, `fn_delete_category`, `fn_add_stock_in`, `fn_submit_opname`, `fn_transfer_stock`, `fn_import_products` |
| Pesanan | `fn_create_sales_order`, `fn_update_sales_order_status` |
| Absensi | `fn_check_in`, `fn_check_out`, `fn_submit_leave_request`, `fn_review_leave_request` |
| Karyawan | `fn_create_employee` (admin client), `fn_update_employee`, `fn_set_employee_active` |
| Cabang | `fn_create_branch`, `fn_update_branch`, `fn_set_branch_active` |
| Pengaturan | `fn_update_business_profile`, `fn_toggle_payment_method`, `fn_save_bank_account`, `fn_delete_bank_account`, `fn_update_sales_bonus`, `fn_update_receipt_settings`, `fn_update_attendance_settings` |
| Impor | `fn_import_local_data` (sekali, Owner) |

Semua fungsi mengembalikan `jsonb` dengan bentuk yang sama seperti return type repository sekarang, atau `raise exception` berpesan Bahasa Indonesia (`"Stok Produk C tersisa 0"`, `"Uang diterima kurang dari total"`).

---

## 6. Login, sesi, dan pembuatan akun

### 6.1 Alur

1. `/login` mengirim email + password ke Supabase Auth lewat server action (`signInWithPassword`).
2. `@supabase/ssr` menyimpan sesi di cookie (`httpOnly`, `secure`, `sameSite=lax`).
3. `proxy.ts` menjalankan `updateSession` untuk memperbarui token; bila tidak ada sesi dan path bukan `/login`, redirect ke `/login`. Ini hanya **optimistic check** — otorisasi tetap di layout dan RPC (sesuai panduan Next 16: Proxy bukan solusi otorisasi penuh).
4. `requireEmployee()` di `lib/actions/guard.ts`: `supabase.auth.getUser()` → join `employees` by `user_id` → validasi `is_active` → kembalikan `{ employee, branch, permissions }`.
5. `app/(app)/layout.tsx` memanggil `requireEmployee()`; null → redirect `/login`.

### 6.2 Pembuatan akun karyawan

- Owner mengisi nama, no. HP, role, cabang, **email** di form Karyawan.
- Server action memakai `lib/supabase/admin.ts` (service role) untuk `auth.admin.inviteUserByEmail(email, { redirectTo: /auth/callback })`, lalu insert baris `employees` dengan `user_id` hasil invite, dalam satu alur dengan kompensasi (kalau insert gagal, user auth dihapus).
- Karyawan membuka email → membuat password sendiri. Owner tidak pernah tahu password staf.
- Karyawan nonaktif: `employees.is_active = false` **dan** `auth.admin.updateUserById(id, { ban_duration: '876000h' })` untuk memblokir login (dikembalikan dengan `ban_duration: 'none'` saat diaktifkan lagi). Sesi yang masih hidup tetap ditolak oleh `requireEmployee`.
- Reset password memakai `resetPasswordForEmail` (halaman `/auth/callback` yang sama).

### 6.3 Cabang aktif

- Disimpan di cookie `kpr_branch` (httpOnly).
- Server memvalidasi pada setiap request: hanya pemegang `can_view_all_branches` yang boleh memilih cabang selain cabangnya sendiri; role lain dipaksa ke `employees.branch_id`.
- `setActiveEmployee` dihapus (user tidak boleh berpindah identitas); penggantinya `logout`.

---

## 7. Hak akses per role

### 7.1 Lima lapis penegakan

| Lapis | Lokasi | Fungsi |
| --- | --- | --- |
| 1. Proxy | `proxy.ts` | Refresh cookie + redirect `/login` bila belum login |
| 2. Layout | `app/(app)/layout.tsx` | `requireEmployee()` + `canAccessPath(pathname, role)` → `<AccessDenied />` yang sudah ada |
| 3. Server action | `lib/actions/guard.ts` | `requirePermission("can_manage_products")` sebelum `rpc()` |
| 4. SQL function | `supabase/migrations/…_04_functions.sql` | Setiap fungsi memeriksa `private.current_employee()` + permission; pelaku dari `auth.uid()`, bukan dari payload |
| 5. RLS | `…_03_rls.sql` | Select dibatasi role & cabang di database, berlaku juga untuk query langsung pakai anon key user |

Matriks menu tetap dari `config/navigation.ts`. Matriks aksi disimpan di `role_permissions` (sumber kebenaran); `config/permissions.ts` tetap dipakai UI dan **wajib identik** — `seed.sql` menolak jalan bila ada selisih (script pembanding kecil di `scripts/check-permissions.ts`).

### 7.2 Permission → fungsi

| Permission | Fungsi yang dijaga |
| --- | --- |
| `canManageProducts` | semua `fn_*` produk/kategori/stok/import |
| `canApplyDiscount` | `fn_create_transaction` bila `discount_value > 0` |
| `canCancelTransaction` | `fn_refund_transaction` |
| `canCreateSalesOrder` | `fn_create_sales_order` |
| `canManageSalesOrders` | `fn_update_sales_order_status`, lihat semua pesanan |
| `canExportReports` | baca `activity_logs`, export Excel/PDF |
| `canViewAllBranches` | pilih cabang aktif, scope "Semua Cabang" |
| `canViewAllAttendance` | baca `attendance` semua karyawan |
| `canApproveLeave` | `fn_review_leave_request` |
| `canManageEmployees` | `fn_*_employee` |
| `canManageBranches` | `fn_*_branch` |
| `canManageSettings` | semua `fn_*` pengaturan + storage logo |

### 7.3 Dua perubahan kecil yang terlihat

Tidak bisa dihindari dan perlu disetujui sebelum fase 2:

1. **`/login` baru** — form email + password. Ini halaman tambahan, bukan perubahan halaman lama. Gaya memakai `components/ui/Field`, `Input`, `Button` yang ada.
2. **Isi header kanan berubah** — dropdown "Masuk sebagai" + pilihan cabang diganti menu akun (nama, role, cabang, tombol Keluar) dengan ukuran, border, dan radius yang sama.

---

## 8. Konsistensi data

### 8.1 Nomor struk

Di dalam `fn_create_transaction`:

```sql
insert into public.invoice_counters (day, last_sequence)
values (current_date, 1)
on conflict (day) do update set last_sequence = public.invoice_counters.last_sequence + 1
returning last_sequence into v_sequence;
```

Format `INV-{YY}{MM}{DD}-{seq:3}` (contoh `INV-261031-001`); `YY` adalah dua digit tahun. Prefix tanggal lengkap membuat urutan reset tiap hari tanpa bentrok dengan tanggal yang sama di tahun berikutnya.

Pesanan sales memakai format `SO-{YY}{MM}{DD}-{seq:3}` dan **wajib memakai penghitung terpisah** `sales_order_counters` di dalam `fn_create_sales_order`, bukan `invoice_counters`:

```sql
insert into public.sales_order_counters (day, last_sequence)
values (current_date, 1)
on conflict (day) do update set last_sequence = public.sales_order_counters.last_sequence + 1
returning last_sequence into v_sequence;
```

Nomor lama berformat `INV-{DD}{MM}-{seq:3}` / `SO-{DD}{MM}-{seq:3}` tetap disimpan dan ditampilkan apa adanya; tidak dimigrasi. Generator hanya mencari prefix `YYMMDD`, sehingga nomor lama tidak memengaruhi urutan baru.

### 8.2 Transaksi kasir

Satu fungsi = satu transaksi database:

1. `select … from stock_levels where branch_id = … and product_id = any(…) for update` → kunci baris stok.
2. Validasi qty ≤ stok, metode aktif, cash ≥ total, rekening valid.
3. Insert `transactions` + `transaction_items`.
4. `update stock_levels set quantity = quantity - qty`.
5. Insert `activity_logs` (aktor dari `auth.uid()`).
6. Return `jsonb` berisi id, nomor struk, total — dipakai untuk render struk.

Refund memakai pola sama dengan arah stok `+`, syarat `refunded_at is null` dicek di dalam transaksi (dua refund bersamaan tidak mungkin).

### 8.3 Stok masuk, opname, transfer, pesanan lunas

Semua memakai `for update` pada baris stok yang disentuh. `fn_update_sales_order_status` mengunci pesanan (`for update`), memastikan `stock_applied = false`, baru mengurangi stok dan menandai `stock_applied = true` — menutup celah double-apply yang sekarang hanya dijaga di memori.

### 8.4 Log aktivitas

`appendActivity` menjadi `insert into activity_logs …` di dalam setiap fungsi SQL. Batas 200 entri di memori dihapus; halaman Laporan membaca 200 terbaru + filter role/user/periode lewat query ber-index.

---

## 9. Migrasi data yang sudah ada di browser

1. Setelah login pertama sebagai Owner, tampilkan satu kali modal (memakai `Modal` + `ConfirmDialog` yang ada): "Impor data dari browser ini ke database?".
2. Server action `importLocalDatabase(payload)` memanggil `rpc("fn_import_local_data")`:
   - Validasi bentuk memakai `normalizeDatabase` yang sudah ada (dipindah ke `lib/db/import/normalize.ts`).
   - Insert berurutan dalam satu transaksi: `branches → employees (user_id null) → categories → products → stock_levels → settings/bank_accounts/bonus_tiers → transactions + items → drafts → sales_orders + items → stock_* → attendance → leave_requests → activity_logs`.
   - ID lama dipertahankan; bentrok di-`on conflict do nothing` lalu dilaporkan.
3. Balasan `{ imported: { transactions: 42, products: 18, … }, skipped: 0 }` → toast.
4. Client menghapus `kpr-pos-db-v1` **setelah** server mengembalikan sukses.
5. Seed database kosong: `supabase db reset` (lokal) atau `fn_seed_demo` sekali pakai di project dev, memakai `createSeedDatabase()` yang ada (2 cabang, 8 role).

---

## 10. Rencana kerja per fase

Estimasi untuk 1 developer yang sudah mengenal kode ini.

### Fase 0 — Persiapan (0,5 hari)
- Buat project Supabase **dev** (bukan produksi), `supabase link`, `supabase init`.
- Salin URL + anon key ke `.env.local`, buat `.env.example`.
- Install `@supabase/supabase-js`, `@supabase/ssr`, CLI dev dependency.
- Script: `db:push`, `db:reset`, `db:types` (`supabase gen types typescript > lib/supabase/types.ts`).
- **Selesai bila:** `supabase db push` membuat semua tabel; `gen types` menghasilkan file tanpa error; `tsc --noEmit` bersih.

### Fase 1 — Skema, permission, seed (1,5 hari)
- Migrasi `01_schema.sql`, `02_permissions.sql` (isi 8 role), `seed.sql` (2 cabang, 8 role, produk/kategori/stok dari data dummy sekarang).
- `scripts/check-permissions.ts` membandingkan `role_permissions` dengan `config/permissions.ts`.
- **Selesai bila:** seed idempoten (dua kali jalan tanpa duplikat) dan isi tabel cocok dengan data demo lama.

### Fase 2 — Auth & sesi (1 hari)
- `/login`, `proxy.ts`, `app/auth/callback/route.ts`, `lib/supabase/server.ts`, `requireEmployee()`.
- `SessionProvider` + `useSession()` baru (membaca context, bukan store).
- Logout + menu akun di header; hapus "Masuk sebagai".
- **Selesai bila:** user nonaktif tidak bisa login; setelah logout cookie tidak berlaku; role tanpa akses `/pengaturan` melihat `<AccessDenied />`.

### Fase 3 — RLS (1 hari)
- `03_rls.sql`: helper `private.*`, policy select per tabel, `enable row level security` di semua tabel, revoke `anon`.
- Uji negatif dengan anon key: `select * from transactions` → 0 baris.
- **Selesai bila:** login sebagai Cashier hanya melihat transaksi cabangnya; Sales hanya pesanannya; Staff hanya absensinya.

### Fase 4 — Baca data per fitur (2 hari)
- Ganti 9 hook `use*Data()` dengan snapshot server + `DatabaseProvider`, satu fitur per commit: dashboard → kasir → produk → pesanan → laporan → absensi → karyawan → cabang → pengaturan.
- **Selesai bila:** setiap halaman menampilkan angka yang sama dengan versi localStorage untuk data seed yang sama (omzet hari ini, stok menipis, top sales, rekap absensi).

### Fase 5 — Tulis data via RPC (3 hari)
- `04_functions.sql` + server action per fitur sesuai tabel bagian 5.5, satu per commit.
- `for update` untuk semua yang menyentuh stok/uang; log di dalam fungsi.
- `revalidatePath` + `router.refresh()`; toast & konfirmasi tetap.
- **Selesai bila:** alur kasir penuh, refund, draft, opname, transfer, pesanan lunas, absensi masuk/pulang, CRUD karyawan/cabang/produk/kategori, dan pengaturan bekerja dari database.

### Fase 6 — Impor data lama & pembersihan (1 hari)
- Modal impor, `fn_import_local_data`, hapus `lib/store/*` yang tidak terpakai, update README.
- **Selesai bila:** jumlah transaksi, omzet, dan stok akhir sama dengan data browser lama; `grep -r localStorage` hanya menyisakan kunci cookie/theme.

### Fase 7 — Storage & pengerasan (1–2 hari)
- Bucket `branding` dan `products` (public read, write hanya `can_manage_settings` / `can_manage_products`); `image_url` menyimpan path, bukan data URL.
- Backup: jadwal harian Supabase + tombol "Unduh backup Excel" (SheetJS sudah ada).
- Agregasi laporan di SQL bila transaksi > 20 ribu baris.

Total realistis: **±11 hari kerja** (tanpa fase 7).

---

## 11. Checklist verifikasi

**Auth**
- [ ] Login salah password 5× → ditolak + pesan umum (tidak membocorkan email terdaftar).
- [ ] Logout → `/dashboard` redirect ke `/login`; cookie lama tidak bisa dipakai.
- [ ] Karyawan `is_active = false` ditolak walau masih punya sesi lama.
- [ ] Undangan email mengarah ke `/auth/callback` dan bisa membuat password.

**RLS & hak akses**
- [ ] Query langsung pakai anon key tanpa login → 0 baris di semua tabel.
- [ ] Cashier query `transactions` cabang lain → 0 baris; cabang sendiri → terlihat.
- [ ] Sales hanya melihat `sales_orders` miliknya; Manager melihat semua.
- [ ] Staff hanya melihat `attendance` miliknya.
- [ ] Panggil `fn_refund_transaction` sebagai Cashier → `raise exception`, data tidak berubah.
- [ ] Buka `/pengaturan` sebagai Cashier lewat URL langsung → `AccessDenied`.
- [ ] 8 role × 9 halaman × aksi utama dicek sesuai matriks `config/permissions.ts`.

**Data & uang**
- [ ] Bayar cash kurang → tombol nonaktif; panggil RPC dengan total kurang → ditolak server.
- [ ] Dua tab membayar produk terakhir bersamaan → satu sukses, satu gagal "stok tersisa 0".
- [ ] Nomor struk berurutan tanpa duplikat setelah 20 transaksi beruntun.
- [ ] Refund mengembalikan stok, mengurangi omzet, tercatat di log, tidak bisa dua kali.
- [ ] Opname sesuai selisih; transfer melebihi stok asal ditolak; pesanan lunas memotong stok sekali.

**Tampilan tidak berubah**
- [ ] Screenshot 9 halaman sebelum vs sesudah migrasi identik.
- [ ] Modal/Drawer/Toast tetap di posisi dan ukuran yang sama.
- [ ] Tidak ada `any` baru; `npm run typecheck` dan `npm run lint` bersih.

---

## 12. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Service role key bocor ke client | Seluruh RLS terlewati | Hanya di `lib/supabase/admin.ts` (server-only), tidak pernah di `NEXT_PUBLIC_*`; dipakai hanya untuk invite/impor; audit `grep -r SERVICE_ROLE` sebelum deploy |
| Lupa `enable row level security` di tabel baru | Tabel terbuka untuk anon | Migrasi RLS terpisah + checklist `select tablename, rowsecurity from pg_tables`; uji anon key = 0 baris |
| Policy rekursif (`employees` membaca `employees`) | Error 42P17 / query lambat | Semua cek role lewat `private.current_employee()` security definer, bukan subquery langsung ke tabel yang sama |
| `auth.uid()` dipanggil per baris | Query lambat saat data besar | Selalu `(select auth.uid())` / `(select private.has_permission(…))`; index pada kolom policy |
| Matriks role dobel (DB + config) | Hak akses tidak sinkron | `role_permissions` jadi sumber kebenaran; `scripts/check-permissions.ts` gagal bila beda |
| Mutasi jadi async → UI terasa lambat | Struk telat muncul | Tombol `isPending` + toast "Memproses…"; struk dirender dari hasil RPC |
| Snapshot per halaman mengirim data berlebih | Halaman lambat | Batasi transaksi 62 hari + log 200; index `(branch_id, created_at desc)`; fase 7 pindah ke agregasi SQL |
| Impor data lama dua kali | Duplikat transaksi | `on conflict do nothing` + `settings.data_imported_at` |
| Bedah `lib/store` sekaligus | Sulit rollback | Satu fitur per commit; adapter `NEXT_PUBLIC_DATA_SOURCE=local|db` sampai fase 6 |
| Free tier Supabase pause karena idle | Aplikasi mati saat toko buka | Upgrade ke plan berbayar sebelum dipakai produksi, atau ping harian + backup rutin |
| Uji coba di project produksi | Data asli rusak | Selalu `supabase link` ke project dev; produksi hanya menerima migrasi yang sudah lolos checklist |

---

## 13. Ringkasan keputusan yang perlu disetujui

1. Stack: **Supabase** (Postgres + Auth + Storage + RLS), tanpa ORM; migrasi SQL via CLI, tipe di-generate.
2. Pola data: **snapshot per halaman** berbentuk `AppDatabase` lewat `DatabaseProvider`, sehingga fungsi perhitungan dan seluruh komponen tidak berubah.
3. Penulisan data: **hanya lewat fungsi SQL `security definer`**, bukan insert/update langsung dari client.
4. Dua penambahan yang terlihat: **halaman `/login`** dan **isi header kanan** (menu akun menggantikan "Masuk sebagai").
5. Data lama diimpor sekali lewat konfirmasi, bukan dibuang.
6. Urutan: skema → seed → auth → RLS → baca → tulis (RPC) → impor → bersihkan localStorage → storage & backup.
