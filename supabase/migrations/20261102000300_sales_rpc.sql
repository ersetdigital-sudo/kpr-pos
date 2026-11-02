-- RPC atomik untuk transaksi kasir, refund, pesanan sales, dan draft keranjang.
-- Dipanggil hanya dari server action memakai service_role.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.gen_id(text) to service_role;

create or replace function public.fn_next_invoice_number()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_sequence integer;
begin
  insert into public.invoice_counters (day, last_sequence)
  values (v_day, 0)
  on conflict (day) do nothing;

  update public.invoice_counters
  set last_sequence = last_sequence + 1
  where day = v_day
  returning last_sequence into v_sequence;

  return 'INV-' || to_char(v_day, 'YYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
end;
$$;

create or replace function public.fn_next_sales_order_number()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_sequence integer;
begin
  insert into public.sales_order_counters (day, last_sequence)
  values (v_day, 0)
  on conflict (day) do nothing;

  update public.sales_order_counters
  set last_sequence = last_sequence + 1
  where day = v_day
  returning last_sequence into v_sequence;

  return 'SO-' || to_char(v_day, 'YYMMDD') || '-' || lpad(v_sequence::text, 3, '0');
end;
$$;

create or replace function public.fn_sales_transaction_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'invoiceNumber', t.invoice_number,
    'branchId', t.branch_id,
    'cashierId', t.cashier_id,
    'salesEmployeeId', t.sales_employee_id,
    'subtotal', t.subtotal,
    'discount', jsonb_build_object(
      'type', t.discount_type,
      'value', t.discount_value,
      'amount', t.discount_amount
    ),
    'total', t.total,
    'payment', jsonb_build_object(
      'method', t.payment_method,
      'cashReceived', t.cash_received,
      'change', t.change_amount,
      'bankAccountId', t.bank_account_id
    ),
    'createdAt', to_char(t.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity,
        'lineTotal', i.line_total
      ) order by i.id)
      from public.transaction_items i
      where i.transaction_id = t.id
    ), '[]'::jsonb),
    'refund', case
      when t.refunded_at is null then null
      else jsonb_build_object(
        'at', to_char(t.refunded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'byId', coalesce(t.refunded_by_id, ''),
        'byName', coalesce(t.refunded_by_name, ''),
        'reason', coalesce(t.refund_reason, ''),
        'amount', coalesce(t.refund_amount, 0)
      )
    end
  )
  from public.transactions t
  where t.id = p_id;
$$;

create or replace function public.fn_sales_order_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'orderNumber', o.order_number,
    'customerName', o.customer_name,
    'customerPhone', o.customer_phone,
    'branchId', o.branch_id,
    'salesEmployeeId', o.sales_employee_id,
    'total', o.total,
    'status', o.status,
    'paidAt', case
      when o.paid_at is null then null
      else to_char(o.paid_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    end,
    'stockApplied', o.stock_applied,
    'note', o.note,
    'createdAt', to_char(o.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'productName', i.product_name,
        'unitPrice', i.unit_price,
        'unitCost', i.unit_cost,
        'quantity', i.quantity
      ) order by i.id)
      from public.sales_order_items i
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.sales_orders o
  where o.id = p_id;
$$;

create or replace function public.fn_cart_draft_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id,
    'label', d.label,
    'branchId', d.branch_id,
    'cashierId', d.cashier_id,
    'salesEmployeeId', d.sales_employee_id,
    'discountType', d.discount_type,
    'discountValue', d.discount_value,
    'createdAt', to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(d.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', i.product_id,
        'quantity', i.quantity
      ) order by i.id)
      from public.cart_draft_items i
      where i.draft_id = d.id
    ), '[]'::jsonb)
  )
  from public.cart_drafts d
  where d.id = p_id;
$$;

-- ===== Buat transaksi =====
create or replace function public.fn_create_transaction(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_cashier_id text := p_payload ->> 'cashierId';
  v_sales_id text := nullif(p_payload ->> 'salesEmployeeId', '');
  v_transaction_id text := public.gen_id('trx');
  v_invoice_number text;
  v_method text := p_payload ->> 'paymentMethod';
  v_discount_type text := p_payload ->> 'discountType';
  v_discount_value integer := greatest(coalesce((p_payload ->> 'discountValue')::integer, 0), 0);
  v_cash_received integer := nullif(p_payload ->> 'cashReceived', '')::integer;
  v_bank_account_id text := nullif(p_payload ->> 'bankAccountId', '');
  v_change integer;
  v_subtotal integer := 0;
  v_discount_amount integer := 0;
  v_total integer := 0;
  v_item record;
  v_product record;
  v_stock integer;
  v_enabled_methods text[];
begin
  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if v_cashier_id is null or not exists (
    select 1 from public.employees where id = v_cashier_id and is_active = true
  ) then
    raise exception 'Kasir tidak ditemukan';
  end if;

  if v_sales_id is not null and not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Sales tidak ditemukan';
  end if;

  if v_discount_type not in ('nominal', 'percent') then
    raise exception 'Tipe diskon tidak valid';
  end if;

  if v_method not in ('Cash', 'QRIS', 'Transfer') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  select enabled_payment_methods into v_enabled_methods
  from public.settings where id = 1;

  if not found then raise exception 'Pengaturan pembayaran belum siap'; end if;
  if not v_method = any(v_enabled_methods) then
    raise exception 'Metode pembayaran sedang tidak aktif';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Keranjang masih kosong';
  end if;

  v_invoice_number := public.fn_next_invoice_number();

  insert into public.transactions (
    id, invoice_number, branch_id, cashier_id, sales_employee_id,
    subtotal, discount_type, discount_value, discount_amount, total,
    payment_method, cash_received, change_amount, bank_account_id, created_at
  ) values (
    v_transaction_id, v_invoice_number, v_branch_id, v_cashier_id, v_sales_id,
    0, v_discount_type, v_discount_value, 0, 0,
    v_method, null, null, null, now()
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    select name, price, cost_price, is_active into v_product
    from public.products where id = v_item.product_id;

    if not found or v_product.is_active is not true then
      raise exception 'Ada produk yang sudah tidak tersedia';
    end if;

    select quantity into v_stock
    from public.stock_levels
    where branch_id = v_branch_id and product_id = v_item.product_id
    for update;

    v_stock := coalesce(v_stock, 0);

    if v_stock < v_item.quantity then
      raise exception 'Stok % tersisa % pcs', v_product.name, v_stock;
    end if;

    insert into public.transaction_items (
      id, transaction_id, product_id, product_name,
      unit_price, unit_cost, quantity, line_total
    ) values (
      public.gen_id('tri'), v_transaction_id, v_item.product_id, v_product.name,
      v_product.price, v_product.cost_price, v_item.quantity,
      v_product.price * v_item.quantity
    );

    update public.stock_levels
    set quantity = quantity - v_item.quantity
    where branch_id = v_branch_id and product_id = v_item.product_id;

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
  end loop;

  if v_subtotal <= 0 then raise exception 'Keranjang masih kosong'; end if;

  if v_discount_type = 'percent' then
    v_discount_amount := least(
      v_subtotal,
      round(v_subtotal * least(100, v_discount_value) / 100.0)::integer
    );
  else
    v_discount_amount := least(v_subtotal, v_discount_value);
  end if;

  v_total := greatest(0, v_subtotal - v_discount_amount);

  if v_method = 'Cash' then
    if v_cash_received is null or v_cash_received < v_total then
      raise exception 'Uang diterima kurang dari total';
    end if;
    v_change := v_cash_received - v_total;
  elsif v_method = 'Transfer' then
    if v_bank_account_id is null or not exists (
      select 1 from public.bank_accounts where id = v_bank_account_id
    ) then
      raise exception 'Rekening transfer belum dipilih';
    end if;
    v_cash_received := null;
    v_change := null;
  else
    v_cash_received := null;
    v_change := null;
    v_bank_account_id := null;
  end if;

  update public.transactions set
    subtotal = v_subtotal,
    discount_amount = v_discount_amount,
    total = v_total,
    cash_received = v_cash_received,
    change_amount = v_change,
    bank_account_id = v_bank_account_id
  where id = v_transaction_id;

  return public.fn_sales_transaction_json(v_transaction_id);
end;
$$;

-- ===== Refund transaksi =====
create or replace function public.fn_refund_transaction(
  p_transaction_id text,
  p_user_id text,
  p_reason text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_employee public.employees%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_item record;
begin
  select * into v_employee from public.employees
  where id = p_user_id and is_active = true;

  if not found then raise exception 'Sesi pengguna tidak ditemukan'; end if;
  if length(v_reason) < 3 then raise exception 'Alasan refund minimal 3 karakter'; end if;

  select * into v_transaction from public.transactions
  where id = p_transaction_id for update;

  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_transaction.refunded_at is not null then raise exception 'Transaksi ini sudah direfund'; end if;

  for v_item in
    select product_id, quantity from public.transaction_items
    where transaction_id = p_transaction_id and product_id is not null
  loop
    insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
    values (v_transaction.branch_id, v_item.product_id, v_item.quantity, 5)
    on conflict (branch_id, product_id) do update
      set quantity = public.stock_levels.quantity + excluded.quantity;
  end loop;

  update public.transactions set
    refunded_at = now(),
    refunded_by_id = v_employee.id,
    refunded_by_name = v_employee.name,
    refund_reason = v_reason,
    refund_amount = v_transaction.total
  where id = p_transaction_id;

  return public.fn_sales_transaction_json(p_transaction_id);
end;
$$;

-- ===== Buat pesanan sales =====
create or replace function public.fn_create_sales_order(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_sales_id text := p_payload ->> 'salesEmployeeId';
  v_order_id text := public.gen_id('so');
  v_order_number text;
  v_customer_name text := trim(coalesce(p_payload ->> 'customerName', ''));
  v_customer_phone text := trim(coalesce(p_payload ->> 'customerPhone', ''));
  v_note text := trim(coalesce(p_payload ->> 'note', ''));
  v_total integer := 0;
  v_item record;
  v_product record;
begin
  if length(v_customer_name) = 0 then raise exception 'Nama pelanggan wajib diisi'; end if;

  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang pesanan tidak ditemukan';
  end if;

  if v_sales_id is null or not exists (
    select 1 from public.employees
    where id = v_sales_id and role = 'Sales' and is_active = true
  ) then
    raise exception 'Pilih sales yang valid';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Tambahkan minimal satu produk';
  end if;

  v_order_number := public.fn_next_sales_order_number();

  insert into public.sales_orders (
    id, order_number, customer_name, customer_phone, branch_id,
    sales_employee_id, total, status, stock_applied, note, created_at
  ) values (
    v_order_id, v_order_number, v_customer_name, v_customer_phone, v_branch_id,
    v_sales_id, 0, 'Menunggu bayar', false, v_note, now()
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    select name, price, cost_price into v_product
    from public.products where id = v_item.product_id and is_active = true;

    if not found then raise exception 'Ada produk yang tidak tersedia'; end if;

    insert into public.sales_order_items (
      id, order_id, product_id, product_name,
      unit_price, unit_cost, quantity
    ) values (
      public.gen_id('soi'), v_order_id, v_item.product_id, v_product.name,
      v_product.price, v_product.cost_price, v_item.quantity
    );

    v_total := v_total + (v_product.price * v_item.quantity);
  end loop;

  if v_total <= 0 then raise exception 'Jumlah produk harus lebih dari 0'; end if;

  update public.sales_orders set total = v_total where id = v_order_id;

  return public.fn_sales_order_json(v_order_id);
end;
$$;

-- ===== Ubah status pesanan =====
create or replace function public.fn_update_sales_order_status(
  p_order_id text,
  p_status text,
  p_user_id text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.sales_orders%rowtype;
  v_item record;
  v_stock integer;
  v_paid_at timestamptz;
  v_stock_applied boolean;
begin
  if not exists (
    select 1 from public.employees where id = p_user_id and is_active = true
  ) then
    raise exception 'Sesi pengguna tidak ditemukan';
  end if;

  select * into v_order from public.sales_orders
  where id = p_order_id for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.status = p_status then return public.fn_sales_order_json(p_order_id); end if;

  if not (
    (v_order.status = 'Belum sinkron' and p_status in ('Menunggu bayar', 'Dibatalkan'))
    or (v_order.status = 'Menunggu bayar' and p_status in ('Lunas', 'Dibatalkan'))
    or (v_order.status = 'Lunas' and p_status = 'Dibatalkan')
  ) then
    raise exception 'Status % tidak bisa diubah menjadi %', v_order.status, p_status;
  end if;

  v_paid_at := v_order.paid_at;
  v_stock_applied := v_order.stock_applied;

  if p_status = 'Lunas' and v_order.stock_applied = false then
    for v_item in
      select product_id, product_name, quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      select quantity into v_stock
      from public.stock_levels
      where branch_id = v_order.branch_id and product_id = v_item.product_id
      for update;

      v_stock := coalesce(v_stock, 0);

      if v_stock < v_item.quantity then
        raise exception 'Stok % tersisa % pcs', v_item.product_name, v_stock;
      end if;

      update public.stock_levels
      set quantity = quantity - v_item.quantity
      where branch_id = v_order.branch_id and product_id = v_item.product_id;
    end loop;

    v_stock_applied := true;
    v_paid_at := now();
  elsif v_order.stock_applied = true and p_status <> 'Lunas' then
    for v_item in
      select product_id, quantity
      from public.sales_order_items
      where order_id = p_order_id and product_id is not null
    loop
      insert into public.stock_levels (branch_id, product_id, quantity, min_stock)
      values (v_order.branch_id, v_item.product_id, v_item.quantity, 5)
      on conflict (branch_id, product_id) do update
        set quantity = public.stock_levels.quantity + excluded.quantity;
    end loop;

    v_stock_applied := false;
    v_paid_at := null;
  end if;

  update public.sales_orders set
    status = p_status,
    stock_applied = v_stock_applied,
    paid_at = v_paid_at
  where id = p_order_id;

  return public.fn_sales_order_json(p_order_id);
end;
$$;

-- ===== Hapus pesanan =====
create or replace function public.fn_delete_sales_order(p_order_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.sales_orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_status <> 'Dibatalkan' then
    raise exception 'Batalkan pesanan terlebih dahulu sebelum menghapus';
  end if;

  delete from public.sales_orders where id = p_order_id;
end;
$$;

-- ===== Draft keranjang =====
create or replace function public.fn_save_cart_draft(p_payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_branch_id text := p_payload ->> 'branchId';
  v_cashier_id text := p_payload ->> 'cashierId';
  v_sales_id text := nullif(p_payload ->> 'salesEmployeeId', '');
  v_draft_id text := public.gen_id('draft');
  v_item record;
  v_product record;
  v_stock integer;
begin
  if v_branch_id is null or not exists (select 1 from public.branches where id = v_branch_id) then
    raise exception 'Cabang tidak ditemukan';
  end if;

  if v_cashier_id is null or not exists (
    select 1 from public.employees where id = v_cashier_id and is_active = true
  ) then
    raise exception 'Kasir tidak ditemukan';
  end if;

  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'Keranjang masih kosong';
  end if;

  insert into public.cart_drafts (
    id, label, branch_id, cashier_id, sales_employee_id,
    discount_type, discount_value, created_at, updated_at
  ) values (
    v_draft_id,
    coalesce(nullif(trim(p_payload ->> 'label'), ''), 'Draft'),
    v_branch_id, v_cashier_id, v_sales_id,
    coalesce(p_payload ->> 'discountType', 'nominal'),
    greatest(coalesce((p_payload ->> 'discountValue')::integer, 0), 0),
    now(), now()
  );

  for v_item in
    select
      item.value ->> 'productId' as product_id,
      sum(coalesce((item.value ->> 'quantity')::integer, 0))::integer as quantity
    from jsonb_array_elements(coalesce(p_payload -> 'items', '[]'::jsonb)) as item(value)
    group by 1
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Jumlah produk tidak valid';
    end if;

    select name into v_product from public.products
    where id = v_item.product_id and is_active = true;
    if not found then raise exception 'Ada produk yang sudah tidak tersedia'; end if;

    select quantity into v_stock from public.stock_levels
    where branch_id = v_branch_id and product_id = v_item.product_id;
    if coalesce(v_stock, 0) < v_item.quantity then
      raise exception 'Stok % tersisa % pcs', v_product.name, coalesce(v_stock, 0);
    end if;

    insert into public.cart_draft_items (id, draft_id, product_id, quantity)
    values (public.gen_id('drafti'), v_draft_id, v_item.product_id, v_item.quantity);
  end loop;

  return public.fn_cart_draft_json(v_draft_id);
end;
$$;

create or replace function public.fn_take_cart_draft(p_draft_id text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_json jsonb;
begin
  select public.fn_cart_draft_json(p_draft_id) into v_json;
  if v_json is null then raise exception 'Draft tidak ditemukan'; end if;

  delete from public.cart_drafts where id = p_draft_id;
  return v_json;
end;
$$;

create or replace function public.fn_delete_cart_draft(p_draft_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.cart_drafts where id = p_draft_id;
end;
$$;

-- ===== Bootstrap data penjualan lokal =====
create or replace function public.fn_bootstrap_sales(p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_transaction jsonb;
  v_item jsonb;
  v_order jsonb;
  v_draft jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('kpr-sales-bootstrap'));

  if exists (select 1 from public.transactions limit 1)
    or exists (select 1 from public.sales_orders limit 1)
    or exists (select 1 from public.cart_drafts limit 1) then
    return false;
  end if;

  insert into public.branches (id, name, address, phone, is_active)
  select branch.id, branch.name, branch.address, branch.phone, branch.is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'branches', '[]'::jsonb))
    as branch(id text, name text, address text, phone text, is_active boolean)
  on conflict (id) do nothing;

  insert into public.employees (
    id, name, phone, initials, role, branch_id, is_active
  )
  select employee.id, employee.name, employee.phone, employee.initials,
    employee.role, employee.branch_id, employee.is_active
  from jsonb_to_recordset(coalesce(p_payload -> 'employees', '[]'::jsonb))
    as employee(
      id text, name text, phone text, initials text,
      role text, branch_id text, is_active boolean
    )
  on conflict (id) do nothing;

  for v_transaction in
    select value from jsonb_array_elements(coalesce(p_payload -> 'transactions', '[]'::jsonb))
  loop
    insert into public.transactions (
      id, invoice_number, branch_id, cashier_id, sales_employee_id,
      subtotal, discount_type, discount_value, discount_amount, total,
      payment_method, cash_received, change_amount, bank_account_id,
      refunded_at, refunded_by_id, refunded_by_name, refund_reason,
      refund_amount, created_at
    ) values (
      v_transaction ->> 'id',
      v_transaction ->> 'invoice_number',
      v_transaction ->> 'branch_id',
      v_transaction ->> 'cashier_id',
      nullif(v_transaction ->> 'sales_employee_id', ''),
      (v_transaction ->> 'subtotal')::integer,
      v_transaction ->> 'discount_type',
      coalesce((v_transaction ->> 'discount_value')::integer, 0),
      coalesce((v_transaction ->> 'discount_amount')::integer, 0),
      (v_transaction ->> 'total')::integer,
      v_transaction ->> 'payment_method',
      nullif(v_transaction ->> 'cash_received', '')::integer,
      nullif(v_transaction ->> 'change_amount', '')::integer,
      nullif(v_transaction ->> 'bank_account_id', ''),
      nullif(v_transaction ->> 'refunded_at', '')::timestamptz,
      nullif(v_transaction ->> 'refunded_by_id', ''),
      nullif(v_transaction ->> 'refunded_by_name', ''),
      nullif(v_transaction ->> 'refund_reason', ''),
      nullif(v_transaction ->> 'refund_amount', '')::integer,
      coalesce(nullif(v_transaction ->> 'created_at', '')::timestamptz, now())
    );

    for v_item in
      select value from jsonb_array_elements(coalesce(v_transaction -> 'items', '[]'::jsonb))
    loop
      insert into public.transaction_items (
        id, transaction_id, product_id, product_name,
        unit_price, unit_cost, quantity, line_total
      ) values (
        public.gen_id('tri'),
        v_transaction ->> 'id',
        case when exists (
          select 1 from public.products where id = v_item ->> 'product_id'
        ) then v_item ->> 'product_id' else null end,
        v_item ->> 'product_name',
        (v_item ->> 'unit_price')::integer,
        nullif(v_item ->> 'unit_cost', '')::integer,
        (v_item ->> 'quantity')::integer,
        (v_item ->> 'line_total')::integer
      );
    end loop;
  end loop;

  for v_order in
    select value from jsonb_array_elements(coalesce(p_payload -> 'sales_orders', '[]'::jsonb))
  loop
    insert into public.sales_orders (
      id, order_number, customer_name, customer_phone, branch_id,
      sales_employee_id, total, status, paid_at, stock_applied, note, created_at
    ) values (
      v_order ->> 'id',
      v_order ->> 'order_number',
      v_order ->> 'customer_name',
      coalesce(v_order ->> 'customer_phone', ''),
      v_order ->> 'branch_id',
      v_order ->> 'sales_employee_id',
      (v_order ->> 'total')::integer,
      v_order ->> 'status',
      nullif(v_order ->> 'paid_at', '')::timestamptz,
      coalesce((v_order ->> 'stock_applied')::boolean, false),
      coalesce(v_order ->> 'note', ''),
      coalesce(nullif(v_order ->> 'created_at', '')::timestamptz, now())
    );

    for v_item in
      select value from jsonb_array_elements(coalesce(v_order -> 'items', '[]'::jsonb))
    loop
      insert into public.sales_order_items (
        id, order_id, product_id, product_name,
        unit_price, unit_cost, quantity
      ) values (
        public.gen_id('soi'),
        v_order ->> 'id',
        case when exists (
          select 1 from public.products where id = v_item ->> 'product_id'
        ) then v_item ->> 'product_id' else null end,
        v_item ->> 'product_name',
        (v_item ->> 'unit_price')::integer,
        nullif(v_item ->> 'unit_cost', '')::integer,
        (v_item ->> 'quantity')::integer
      );
    end loop;
  end loop;

  for v_draft in
    select value from jsonb_array_elements(coalesce(p_payload -> 'drafts', '[]'::jsonb))
  loop
    insert into public.cart_drafts (
      id, label, branch_id, cashier_id, sales_employee_id,
      discount_type, discount_value, created_at, updated_at
    ) values (
      v_draft ->> 'id',
      v_draft ->> 'label',
      v_draft ->> 'branch_id',
      v_draft ->> 'cashier_id',
      nullif(v_draft ->> 'sales_employee_id', ''),
      v_draft ->> 'discount_type',
      coalesce((v_draft ->> 'discount_value')::integer, 0),
      coalesce(nullif(v_draft ->> 'created_at', '')::timestamptz, now()),
      coalesce(nullif(v_draft ->> 'updated_at', '')::timestamptz, now())
    );

    for v_item in
      select value from jsonb_array_elements(coalesce(v_draft -> 'items', '[]'::jsonb))
    loop
      insert into public.cart_draft_items (id, draft_id, product_id, quantity)
      values (
        public.gen_id('drafti'),
        v_draft ->> 'id',
        v_item ->> 'product_id',
        (v_item ->> 'quantity')::integer
      );
    end loop;
  end loop;

  insert into public.invoice_counters (day, last_sequence)
  select
    to_date(split_part(invoice_number, '-', 2), 'YYMMDD'),
    max((split_part(invoice_number, '-', 3))::integer)
  from public.transactions
  where invoice_number ~ '^INV-[0-9]{6}-[0-9]+$'
  group by 1
  on conflict (day) do update
    set last_sequence = greatest(public.invoice_counters.last_sequence, excluded.last_sequence);

  insert into public.sales_order_counters (day, last_sequence)
  select
    to_date(split_part(order_number, '-', 2), 'YYMMDD'),
    max((split_part(order_number, '-', 3))::integer)
  from public.sales_orders
  where order_number ~ '^SO-[0-9]{6}-[0-9]+$'
  group by 1
  on conflict (day) do update
    set last_sequence = greatest(public.sales_order_counters.last_sequence, excluded.last_sequence);

  return true;
end;
$$;

revoke execute on function public.fn_next_invoice_number() from public, anon, authenticated;
revoke execute on function public.fn_next_sales_order_number() from public, anon, authenticated;
revoke execute on function public.fn_sales_transaction_json(text) from public, anon, authenticated;
revoke execute on function public.fn_sales_order_json(text) from public, anon, authenticated;
revoke execute on function public.fn_cart_draft_json(text) from public, anon, authenticated;
revoke execute on function public.fn_create_transaction(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_refund_transaction(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_create_sales_order(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_update_sales_order_status(text, text, text) from public, anon, authenticated;
revoke execute on function public.fn_delete_sales_order(text) from public, anon, authenticated;
revoke execute on function public.fn_save_cart_draft(jsonb) from public, anon, authenticated;
revoke execute on function public.fn_take_cart_draft(text) from public, anon, authenticated;
revoke execute on function public.fn_delete_cart_draft(text) from public, anon, authenticated;
revoke execute on function public.fn_bootstrap_sales(jsonb) from public, anon, authenticated;

grant execute on function public.fn_next_invoice_number() to service_role;
grant execute on function public.fn_next_sales_order_number() to service_role;
grant execute on function public.fn_sales_transaction_json(text) to service_role;
grant execute on function public.fn_sales_order_json(text) to service_role;
grant execute on function public.fn_cart_draft_json(text) to service_role;
grant execute on function public.fn_create_transaction(jsonb) to service_role;
grant execute on function public.fn_refund_transaction(text, text, text) to service_role;
grant execute on function public.fn_create_sales_order(jsonb) to service_role;
grant execute on function public.fn_update_sales_order_status(text, text, text) to service_role;
grant execute on function public.fn_delete_sales_order(text) to service_role;
grant execute on function public.fn_save_cart_draft(jsonb) to service_role;
grant execute on function public.fn_take_cart_draft(text) to service_role;
grant execute on function public.fn_delete_cart_draft(text) to service_role;
grant execute on function public.fn_bootstrap_sales(jsonb) to service_role;
