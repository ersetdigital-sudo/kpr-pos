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
